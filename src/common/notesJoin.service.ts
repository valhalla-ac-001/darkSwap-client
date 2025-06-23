import { DarkSwapNote, JoinService, TripleJoinService, getNoteOnChainStatusBySignature, NoteOnChainStatus, DarkSwap, EMPTY_NOTE } from '@thesingularitynetwork/darkswap-sdk';
import { DarkSwapContext } from './context/darkSwap.context';
import { DatabaseService } from './db/database.service';
import { getConfirmations } from '../config/networkConfig';
import { NoteService } from './note.service';
import { DarkSwapException } from '../exception/darkSwap.exception';


export class NotesJoinService {
  private static instance: NotesJoinService;
  private dbService: DatabaseService;
  private noteService: NoteService;
  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.noteService = NoteService.getInstance();
  }

  public static getInstance(): NotesJoinService {
    if (!NotesJoinService.instance) {
      NotesJoinService.instance = new NotesJoinService();
    }
    return NotesJoinService.instance;
  }

  private async doJoin(notesToJoin: DarkSwapNote[], darkSwapContext: DarkSwapContext): Promise<DarkSwapNote> {
    const joinService = new JoinService(darkSwapContext.darkSwap);
    const { context: joinContext, outNote } = await joinService.prepare(
      darkSwapContext.walletAddress,
      notesToJoin[0],
      notesToJoin[1],
      darkSwapContext.signature);
    this.noteService.addNote(outNote, darkSwapContext, false);

    const tx = await joinService.execute(joinContext);

    //check if tx is success
    const receipt = await darkSwapContext.darkSwap.provider.waitForTransaction(tx, getConfirmations(darkSwapContext.chainId));
    if (receipt.status !== 1) {
      throw new DarkSwapException("Join failed with tx hash " + tx);
    }
    for (const note of notesToJoin) {
      this.dbService.updateNoteSpentByWalletAndNoteCommitment(darkSwapContext.walletAddress, darkSwapContext.chainId, note.note);
    }
    this.dbService.updateNoteTransactionByWalletAndNoteCommitment(darkSwapContext.walletAddress, darkSwapContext.chainId, outNote.note, tx);

    return outNote;
  }

  private async dotripleJoin(notesToJoin: DarkSwapNote[], darkSwapContext: DarkSwapContext): Promise<DarkSwapNote> | null {
    const tripleJoinService = new TripleJoinService(darkSwapContext.darkSwap);
    const { context: joinContext, outNote } = await tripleJoinService.prepare(
      darkSwapContext.walletAddress,
      notesToJoin[0],
      notesToJoin[1],
      notesToJoin[2],
      darkSwapContext.signature);
    this.noteService.addNote(outNote, darkSwapContext, false);
    const tx = await tripleJoinService.execute(joinContext);

    //check if tx is success
    const receipt = await darkSwapContext.darkSwap.provider.waitForTransaction(tx, getConfirmations(darkSwapContext.chainId));
    if (receipt.status !== 1) {
      throw new DarkSwapException("Join failed with tx hash " + tx);
    }
    for (const note of notesToJoin) {
      this.dbService.updateNoteSpentByWalletAndNoteCommitment(darkSwapContext.walletAddress, darkSwapContext.chainId, note.note);
    }
    this.dbService.updateNoteTransactionByWalletAndNoteCommitment(darkSwapContext.walletAddress, darkSwapContext.chainId, outNote.note, tx);

    return outNote;
  }

  public async notesJoins(notesToJoin: DarkSwapNote[], darkSwapContext: DarkSwapContext): Promise<DarkSwapNote> | null {
    for (const note of notesToJoin) {
      const noteOnChainStatus = await getNoteOnChainStatusBySignature(
        darkSwapContext.darkSwap,
        note,
        darkSwapContext.signature,
      );
      if (noteOnChainStatus != NoteOnChainStatus.ACTIVE) {
        console.error(`Note ${note.note} is not active`);
        throw new Error(`Failed to combine notes, one of the notes is not active!`);
      }
    }

    const notsSize = notesToJoin.length;
    let result: DarkSwapNote
    if (notsSize < 2) {
      result = notesToJoin[0];
    } else if (notsSize === 2) {
      result = await this.doJoin(notesToJoin, darkSwapContext);
    } else {
      result = await this.dotripleJoin(notesToJoin.slice(0, 3), darkSwapContext);
      let i: number;
      for (i = 3; i + 1 < notsSize; i += 2) {
        result = await this.dotripleJoin([result, notesToJoin[i], notesToJoin[i + 1]], darkSwapContext);
      }
      if (i + 1 === notsSize) {
        result = await this.doJoin([result, notesToJoin[i]], darkSwapContext);
      }
    }
    return result;
  }

  public async getCurrentBalanceNote(
    context: DarkSwapContext, asset: string, notesToJoin?: DarkSwapNote[]): Promise<DarkSwapNote> {

    let currentBalanceNote: DarkSwapNote = EMPTY_NOTE;

    const darkSwapNotes: DarkSwapNote[] = this.dbService.getAssetNotesByWalletAndChainIdAndAsset(
      context.walletAddress,
      context.chainId,
      asset
    ).map(note => ({
      note: note.note,
      rho: note.rho,
      amount: note.amount,
      asset: note.asset,
      address: note.wallet
    }));

    if (notesToJoin) {
      darkSwapNotes.push(...notesToJoin);
    }

    if (darkSwapNotes.length > 1) {
      currentBalanceNote = await this.notesJoins(darkSwapNotes, context)
    } else if (darkSwapNotes.length === 1) {
      currentBalanceNote.note = darkSwapNotes[0].note;
      currentBalanceNote.rho = darkSwapNotes[0].rho;
      currentBalanceNote.asset = darkSwapNotes[0].asset;
      currentBalanceNote.amount = darkSwapNotes[0].amount;
    }

    return currentBalanceNote;
  }

}