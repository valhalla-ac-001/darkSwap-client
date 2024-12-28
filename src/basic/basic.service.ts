import { Injectable } from '@nestjs/common';
import { DepositService, Token } from '@thesingularitynetwork/singularity-sdk';
import { DarkpoolContext } from '../common/context/darkpool.context';
import { DatabaseService } from '../common/db/database.service';
import { ethers } from 'ethers';

@Injectable()
export class BasicService {
  // Method to deposit funds
  async deposit(darkPoolContext: DarkpoolContext, asset: Token, amount: bigint) {
    const depositService = new DepositService(darkPoolContext.darkPool);
    const dbservice = DatabaseService.getInstance();
    const { context, outNotes } = await depositService.prepare(asset.address, amount, darkPoolContext.walletAddress, darkPoolContext.signature);

    const id = await dbservice.addNote(
      darkPoolContext.chainId, 
      darkPoolContext.publicKey, 
      darkPoolContext.walletAddress, 
      0, 
      outNotes[0].note,
      outNotes[0].rho, 
      outNotes[0].asset,
      outNotes[0].amount,
      3,
      '')
    await depositService.generateProof(context);
    const tx = await depositService.execute(context);
    await dbservice.updateNoteTransactionAndStatus(id, tx);
  }

  // Method to withdraw funds
  withdraw() {
    // Logic to withdraw funds
  }
}