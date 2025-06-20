import { Injectable, Logger } from '@nestjs/common';
import { DepositService, Token, WithdrawService, DarkSwapNote } from '@thesingularitynetwork/darkswap-sdk';
import { DarkSwapContext } from '../common/context/darkSwap.context';
import { DatabaseService } from '../common/db/database.service';
import { NotesJoinService } from '../common/notesJoin.service';
import { NoteService } from '../common/note.service'; 
import { getConfirmations } from '../config/networkConfig';

@Injectable()
export class BasicService {

  private readonly logger = new Logger(BasicService.name);

  private static instance: BasicService;
  private dbService: DatabaseService;
  private noteService: NoteService;
  private notesJoinService: NotesJoinService;
  public constructor() {
    this.dbService = DatabaseService.getInstance();
    this.noteService = NoteService.getInstance();
    this.notesJoinService = NotesJoinService.getInstance();
  }

  // Method to deposit funds
  async deposit(darkSwapContext: DarkSwapContext, asset: Token, amount: bigint) {
    const depositService = new DepositService(darkSwapContext.darkSwap);

    const currentBalanceNote = await this.notesJoinService.getCurrentBalanceNote(darkSwapContext,asset.address);

    const { context, newBalanceNote } = await depositService.prepare(
      currentBalanceNote,asset.address, BigInt(amount), darkSwapContext.walletAddress, darkSwapContext.signature);

    await this.noteService.addNote(newBalanceNote, darkSwapContext,false);

    const tx = await depositService.execute(context);

    const receipt = await darkSwapContext.darkSwap.provider.waitForTransaction(tx, getConfirmations(darkSwapContext.chainId));
    if (receipt.status !== 1) {
      throw new Error("Deposit failed");
    }

    if (currentBalanceNote.note ! == 0n){
          await this.noteService.setNoteUsed(currentBalanceNote, darkSwapContext);
    }
    await this.dbService.updateNoteTransactionByWalletAndNoteCommitment(darkSwapContext.walletAddress, darkSwapContext.chainId, newBalanceNote.note, tx);
    this.logger.log(`Deposit of ${amount} ${asset.symbol} for wallet ${darkSwapContext.walletAddress} completed with tx ${tx}`);
  }

  // Method to withdraw funds
  async withdraw(darkSwapContext: DarkSwapContext, asset: Token, amount: bigint) {
    const withdrawService = new WithdrawService(darkSwapContext.darkSwap);

    const currentBalanceNote = await this.notesJoinService.getCurrentBalanceNote(darkSwapContext,asset.address);

    if (currentBalanceNote.amount < amount) {
      throw new Error("Insufficient funds");
    }

    const { context: withdrawContext, newBalanceNote } = await withdrawService.prepare(
      darkSwapContext.walletAddress,
      currentBalanceNote,
      amount,
      darkSwapContext.signature);
    
    const tx = await withdrawService.execute(withdrawContext);
    
    const receipt = await darkSwapContext.darkSwap.provider.waitForTransaction(tx, getConfirmations(darkSwapContext.chainId));
    if (receipt.status !== 1) {
      throw new Error("Withdraw failed");
    }

    this.noteService.setNoteUsed(currentBalanceNote, darkSwapContext);
    
    if (newBalanceNote.amount > 0n) {
          await this.noteService.addNote(newBalanceNote, darkSwapContext,false, tx);
    }
    this.logger.log(`Withdraw of ${amount} ${asset.symbol} for wallet ${darkSwapContext.walletAddress} completed with tx ${withdrawContext.tx}`);
  }
}