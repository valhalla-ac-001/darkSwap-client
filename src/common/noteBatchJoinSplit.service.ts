import { Note } from '@thesingularitynetwork/darkpool-v1-proof';
import { BatchJoinSplitService, SplitService } from '@thesingularitynetwork/singularity-sdk';
import { DarkpoolContext } from './context/darkpool.context';
import { DatabaseService } from './db/database.service';
import { getConfirmations } from '../config/networkConfig';

export class NoteBatchJoinSplitService {
  private static instance: NoteBatchJoinSplitService;
  private dbService: DatabaseService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
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
    const tx = await splitservice.execute(splitContext);
    await darkPoolContext.relayerDarkPool.provider.waitForTransaction(tx, getConfirmations(darkPoolContext.chainId));

    this.dbService.updateNoteSpentByWalletAndNoteCommitment(darkPoolContext.walletAddress, darkPoolContext.chainId, note.note);

    for (const outNote of outNotes) {
      this.dbService.updateNoteTransactionByWalletAndNoteCommitment(darkPoolContext.walletAddress, darkPoolContext.chainId, outNote.note, tx);
    }
    return outNotes[0];
  }

  private async doBatchJoinSplit(notesToJoin: Note[], darkPoolContext: DarkpoolContext, amount: bigint): Promise<Note> | null {
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
    const tx = await batchJoinSplitService.execute(context);
    await darkPoolContext.relayerDarkPool.provider.waitForTransaction(tx, getConfirmations(darkPoolContext.chainId));
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
    });

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
      let i = 0;

      for (const note of notes) {
        amountAccumulated += note.amount;
        if (amountAccumulated < amount) {
          i++;
        } else {
          break;
        }
      }

      if (amountAccumulated < amount) {
        return null;
      }

      if (i <= 5) {
        const notesToJoin = notes.slice(0, i + 1);
        return this.doBatchJoinSplit(notesToJoin, darkPoolContext, amount);
      } else {
        const firstFive = notes.slice(0, 5);
        const theRest = notes.slice(5);

        const firstFiveAmount = firstFive.reduce((acc, note) => acc + note.amount, 0n);
        const firstFiveOutNote = await this.doBatchJoinSplit(firstFive, darkPoolContext, firstFiveAmount);
        const notesToProcess = [firstFiveOutNote, ...theRest];
        return this.notesJoinSplit(notesToProcess, darkPoolContext, amount);
      }
    }
  }
}