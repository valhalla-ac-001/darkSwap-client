import { Note } from '@thesingularitynetwork/darkpool-v1-proof';
import { BatchJoinSplitService, getNoteOnChainStatusBySignature, NoteOnChainStatus, SplitService } from '@thesingularitynetwork/singularity-sdk';
import { DarkpoolContext } from './context/darkpool.context';
import { DatabaseService } from './db/database.service';
import { getConfirmations } from '../config/networkConfig';
import { WalletMutexService } from './mutex/walletMutex.service';
import { DarkpoolException } from '../exception/darkpool.exception';

const MAX_JOIN_SPLIT_NOTES = 5;

export class NoteBatchJoinSplitService {
  private static instance: NoteBatchJoinSplitService;
  private dbService: DatabaseService;
  private walletMutexService: WalletMutexService;
  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.walletMutexService = WalletMutexService.getInstance();
  }

  public static getInstance(): NoteBatchJoinSplitService {
    if (!NoteBatchJoinSplitService.instance) {
      NoteBatchJoinSplitService.instance = new NoteBatchJoinSplitService();
    }
    return NoteBatchJoinSplitService.instance;
  }

  private async doSplit(note: Note, darkPoolContext: DarkpoolContext, amount: bigint): Promise<Note> | null {
    const splitservice = new SplitService(darkPoolContext.relayerDarkPool);
    const { context: splitContext, outNotes } = await splitservice.prepare(note, amount, darkPoolContext.signature);
    for (const outNote of outNotes) {
      this.dbService.addNote(
        darkPoolContext.chainId,
        darkPoolContext.publicKey,
        darkPoolContext.walletAddress,
        0,
        outNote.note,
        outNote.rho,
        outNote.asset,
        outNote.amount,
        '');
    }
    await splitservice.generateProof(splitContext);
    const mutex = this.walletMutexService.getMutex(darkPoolContext.walletAddress.toLowerCase());
    const tx = await mutex.runExclusive(async () => {
      return await splitservice.execute(splitContext);
    });
    //check if tx is success
    const receipt = await darkPoolContext.relayerDarkPool.provider.waitForTransaction(tx, getConfirmations(darkPoolContext.chainId));
    if (receipt.status !== 1) {
      throw new DarkpoolException("Split failed with tx hash " + tx);
    }

    this.dbService.updateNoteSpentByWalletAndNoteCommitment(darkPoolContext.walletAddress, darkPoolContext.chainId, note.note);

    for (const outNote of outNotes) {
      this.dbService.updateNoteTransactionByWalletAndNoteCommitment(darkPoolContext.walletAddress, darkPoolContext.chainId, outNote.note, tx);
    }
    return outNotes[0];
  }

  private async doBatchJoinSplit(notesToJoin: Note[], darkPoolContext: DarkpoolContext, amount: bigint): Promise<Note> | null {
    //check whether notes are all valid
    for (const note of notesToJoin) {
      const noteOnChainStatus = await getNoteOnChainStatusBySignature(
        darkPoolContext.relayerDarkPool,
        note,
        darkPoolContext.signature
      );
      if (noteOnChainStatus != NoteOnChainStatus.ACTIVE) {
        console.error(`Note ${note.note} is not active`);
        throw new Error(`Failed to combine notes, one of the notes is not active!`);
      }
    }

    const batchJoinSplitService = new BatchJoinSplitService(darkPoolContext.relayerDarkPool);
    const { context, outNotes } = await batchJoinSplitService.prepare(notesToJoin, amount, darkPoolContext.signature);

    for (const outNote of outNotes) {
      await this.dbService.addNote(
        darkPoolContext.chainId,
        darkPoolContext.publicKey,
        darkPoolContext.walletAddress,
        0,
        outNote.note,
        outNote.rho,
        outNote.asset,
        outNote.amount,
        '');
    }

    await batchJoinSplitService.generateProof(context);
    const mutex = this.walletMutexService.getMutex(darkPoolContext.walletAddress.toLowerCase());
    const tx = await mutex.runExclusive(async () => {
      return await batchJoinSplitService.execute(context);
    });
    const receipt = await darkPoolContext.relayerDarkPool.provider.waitForTransaction(tx, getConfirmations(darkPoolContext.chainId));
    if (receipt.status !== 1) {
      throw new DarkpoolException("Batch join split failed with tx hash " + tx);
    }
    for (const note of notesToJoin) {
      this.dbService.updateNoteSpentByWalletAndNoteCommitment(darkPoolContext.walletAddress, darkPoolContext.chainId, note.note);
    }

    for (const outNote of outNotes) {
      this.dbService.updateNoteTransactionByWalletAndNoteCommitment(darkPoolContext.walletAddress, darkPoolContext.chainId, outNote.note, tx);
    }

    return outNotes[0];
  }

  async getNoteOfAssetAmount(darkPoolContext: DarkpoolContext, asset: string, amount: bigint): Promise<Note> | null {
    const notes = await this.dbService.getNotesByAsset(asset, darkPoolContext.chainId);
    const notesToProcess: Note[] = notes.map(note => {
      return {
        note: note.noteCommitment,
        rho: note.rho,
        asset: note.asset,
        amount: note.amount
      } as Note;
    }).sort((a, b) => a.amount < b.amount ? 1 : -1);

    return this.notesJoinSplit(notesToProcess, darkPoolContext, amount);
  }

  async notesJoinSplit(notes: Note[], darkPoolContext: DarkpoolContext, amount: bigint): Promise<Note> | null {
    if (notes.length <= 0) {
      return null;
    }

    if (notes[0].amount >= amount) {
      for (const note of notes) {
        if (note.amount == amount) {
          return note;
        } else if (note.amount < amount) {
          break;
        }
      }

      return this.doSplit(notes[0], darkPoolContext, amount);
    } else {

      let amountAccumulated = 0n;
      const notesToJoin: Note[] = [];

      for (const note of notes) {
        amountAccumulated += note.amount;
        notesToJoin.push(note);
        if (amountAccumulated > amount) {
          break;
        }
      }

      if (amountAccumulated < amount) {
        return null;
      }

      if (notesToJoin.length <= MAX_JOIN_SPLIT_NOTES) {
        return this.doBatchJoinSplit(notesToJoin, darkPoolContext, amount);
      } else {
        const firstFive = notesToJoin.slice(0, MAX_JOIN_SPLIT_NOTES);
        const theRest = notesToJoin.slice(MAX_JOIN_SPLIT_NOTES);

        const firstFiveAmount = firstFive.reduce((acc, note) => acc + note.amount, 0n);
        const firstFiveOutNote = await this.doBatchJoinSplit(firstFive, darkPoolContext, firstFiveAmount);
        const notesToProcess = [firstFiveOutNote, ...theRest];
        return this.notesJoinSplit(notesToProcess, darkPoolContext, amount);
      }
    }
  }
}