import { Injectable, Logger } from '@nestjs/common';
import { DepositService, Token, WithdrawService, BatchJoinSplitService, SplitService, isAddressCompliant, DarkPool } from '@thesingularitynetwork/singularity-sdk';
import { DarkpoolContext } from '../common/context/darkpool.context';
import { DatabaseService } from '../common/db/database.service';
import { NoteBatchJoinSplitService } from '../common/noteBatchJoinSplit.service';
import { Note } from '@thesingularitynetwork/darkpool-v1-proof';
import { NoteStatus } from '../types';
import { BaseDto } from '../common/dto/base.dto';
import { AssetDto } from './dto/asset.dto';

@Injectable()
export class BasicService {

  private readonly logger = new Logger(BasicService.name);

  private static instance: BasicService;
  private dbService: DatabaseService;
  private noteBatchJoinSplitService: NoteBatchJoinSplitService;

  public constructor() {
    this.dbService = DatabaseService.getInstance();
    this.noteBatchJoinSplitService = NoteBatchJoinSplitService.getInstance();
  }

  // Method to deposit funds
  async deposit(darkPoolContext: DarkpoolContext, asset: Token, amount: bigint) {
    const depositService = new DepositService(darkPoolContext.darkPool);
    const { context, outNotes } = await depositService.prepare(
      asset.address, BigInt(amount), darkPoolContext.walletAddress, darkPoolContext.signature);

    await this.dbService.addNote(
      darkPoolContext.chainId,
      darkPoolContext.publicKey,
      darkPoolContext.walletAddress,
      0,
      outNotes[0].note,
      outNotes[0].rho,
      outNotes[0].asset,
      outNotes[0].amount,
      '')
    await depositService.generateProof(context);
    const tx = await depositService.execute(context);
    this.dbService.updateNoteTransactionByWalletAndNoteCommitment(darkPoolContext.walletAddress, darkPoolContext.chainId, outNotes[0].note, tx);
    this.logger.log(`Deposit of ${amount} ${asset.symbol} for wallet ${darkPoolContext.walletAddress} completed with tx ${tx}`);
  }

  // Method to withdraw funds
  async withdraw(darkPoolContext: DarkpoolContext, asset: Token, amount: bigint, receiptAddress: string) {

    if (!isAddressCompliant(receiptAddress, darkPoolContext.darkPool)) {
      throw new Error("Receipt address is not compliant")
    }

    const withdrawService = new WithdrawService(darkPoolContext.darkPool);

    const noteToWithdraw = await this.noteBatchJoinSplitService.getNoteOfAssetAmount(darkPoolContext, asset.address, amount);
    if (noteToWithdraw === null) {
      throw new Error("Insufficient funds");
    }

    const { context: withdrawContext } = await withdrawService.prepare(noteToWithdraw, receiptAddress, darkPoolContext.signature);
    await withdrawService.generateProof(withdrawContext);
    await withdrawService.executeAndWaitForResult(withdrawContext);
    this.dbService.updateNoteSpentByWalletAndNoteCommitment(darkPoolContext.walletAddress, darkPoolContext.chainId, noteToWithdraw.note);
    this.logger.log(`Withdraw of ${amount} ${asset.symbol} for wallet ${darkPoolContext.walletAddress} completed with tx ${withdrawContext.tx}`);
  }

  async getAssets(baseDto: BaseDto): Promise<AssetDto[]> {
    const assetDto = await this.dbService.getAssetsByWalletAndchainId(baseDto.wallet, baseDto.chainId);
    return assetDto;
  }

}
