import { DarkSwapNote } from '@thesingularitynetwork/darkswap-sdk';
import { DarkSwapContext } from './context/darkSwap.context';
import { DatabaseService } from './db/database.service';
import { NoteType } from '../types';

export class NoteService {
  private static instance: NoteService;
  private dbService: DatabaseService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  public static getInstance(): NoteService {
    if (!NoteService.instance) {
      NoteService.instance = new NoteService();
    }
    return NoteService.instance;
  }

  public async addNotes(notes: DarkSwapNote[], darkSwapContext: DarkSwapContext, isOrderNote: boolean) {
    for (const note of notes) {
      if (note && note.amount !== 0n) {
        await this.addNote(note, darkSwapContext, isOrderNote);
      }
    }
  }

  public addNote(note: DarkSwapNote, darkSwapContext: DarkSwapContext, isOrderNote: boolean, txHash?: string) {
    this.dbService.addNote(
      darkSwapContext.chainId,
      darkSwapContext.publicKey,
      darkSwapContext.walletAddress,
      isOrderNote? NoteType.DARKSWAP_ORDER: NoteType.DARKSWAP,
      note.note,
      note.rho,
      note.asset,
      note.amount,
      txHash? txHash : '');
  }

  public setNoteUsed(note: DarkSwapNote, darkSwapContext: DarkSwapContext) {
    this.dbService.updateNoteSpentByWalletAndNoteCommitment(darkSwapContext.walletAddress, darkSwapContext.chainId, note.note);
  }

  public async setNotesActive(notes: DarkSwapNote[], darkSwapContext: DarkSwapContext, txHash: string) {
    for (const note of notes) {
      await this.setNoteActive(note, darkSwapContext, txHash);
    }
  }

  public async setNoteActive(note: DarkSwapNote, darkSwapContext: DarkSwapContext, txHash: string) {
    await this.dbService.updateNoteTransactionByWalletAndNoteCommitment (darkSwapContext.walletAddress, darkSwapContext.chainId, note.note, txHash);
  }
}
