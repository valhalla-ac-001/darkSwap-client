import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../common/db/database.service';
import { NoteStatus } from '../types';
import { MyAssetsDto } from './dto/asset.dto';
import { isNoteCommitmentValidOnChain, isNoteSpent } from '@thesingularitynetwork/singularity-sdk';
import { DarkpoolContext } from '../common/context/darkpool.context';

@Injectable()
export class AccountService {

  private readonly logger = new Logger(AccountService.name);

  private static instance: AccountService;
  private dbService: DatabaseService;

  public constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  async getAssetsByChainId(wallet: string, chainId: number): Promise<MyAssetsDto> {
    const notes = await this.dbService.getNotesByWalletAndChainId(wallet, chainId);
    const assetMap = new Map<string, { amount: bigint, lockedAmount: bigint }>();

    for (const note of notes) {
      const assetKey = note.asset;

      const current = assetMap.get(assetKey) || { amount: BigInt(0), lockedAmount: BigInt(0) };

      if (note.status === NoteStatus.ACTIVE) {
        current.amount += BigInt(note.amount);
      } else if (note.status === NoteStatus.LOCKED) {
        current.lockedAmount += BigInt(note.amount);
      }

      assetMap.set(assetKey, current);
    }

    const myAssets: MyAssetsDto = {
      chainId: Number(chainId),
      assets: []
    };

    for (const [asset, { amount, lockedAmount }] of assetMap.entries()) {
      myAssets.assets.push({
        asset,
        amount: amount.toString(),
        lockedAmount: lockedAmount.toString()
      });
    }

    return myAssets;
  }

  async getAssets(wallet: string): Promise<MyAssetsDto[]> {
    const notes = await this.dbService.getNotesByWallet(wallet);

    const chainMap = new Map<string, Map<string, { amount: bigint, lockedAmount: bigint }>>();

    for (const note of notes) {
      const chainId = note.chainId;
      const assetKey = note.asset;

      if (!chainMap.has(chainId.toString())) {
        chainMap.set(chainId.toString(), new Map());
      }

      const assetMap = chainMap.get(chainId.toString())!;
      const current = assetMap.get(assetKey) || { amount: BigInt(0), lockedAmount: BigInt(0) };

      if (note.status === NoteStatus.ACTIVE) {
        current.amount += BigInt(note.amount);
      } else if (note.status === NoteStatus.LOCKED) {
        current.lockedAmount += BigInt(note.amount);
      }

      assetMap.set(assetKey, current);
    }

    const myAssetsArray: MyAssetsDto[] = [];

    for (const [chainId, assetMap] of chainMap.entries()) {
      const myAssets: MyAssetsDto = {
        chainId: Number(chainId),
        assets: []
      };

      for (const [asset, { amount, lockedAmount }] of assetMap.entries()) {
        myAssets.assets.push({
          asset,
          amount: amount.toString(),
          lockedAmount: lockedAmount.toString()
        });
      }

      myAssetsArray.push(myAssets);
    }

    return myAssetsArray;
  }

  async syncAssets(darkpoolContext: DarkpoolContext, wallet: string, chainId: number): Promise<void> {
    const notes = await this.dbService.getNotesByWalletAndChainId(wallet, chainId);


    for (const note of notes) {
      try {
        if (note.status === NoteStatus.ACTIVE) {
          const isValid = await isNoteCommitmentValidOnChain(darkpoolContext.darkPool, note.noteCommitment);
          if (!isValid) {
            this.logger.error(`Invalid note commitment ${note.noteCommitment} on chain ${chainId}`);
            this.dbService.updateNoteCreatedByWalletAndNoteCommitment(wallet, chainId, note.noteCommitment);
          } else {
            const isSpent = await isNoteSpent(
              darkpoolContext.darkPool,
              {
                note: note.noteCommitment,
                rho: note.rho,
                amount: note.amount,
                asset: note.asset
              },
              darkpoolContext.signature);
            if (isSpent) {
              this.dbService.updateNoteSpentByWalletAndNoteCommitment(wallet, chainId, note.noteCommitment);
            }
          }
        } else if (note.status === NoteStatus.CREATED) {
          const isValid = await isNoteCommitmentValidOnChain(darkpoolContext.darkPool, note.noteCommitment);
          if (isValid) {
            this.logger.error(`Invalid note commitment ${note.noteCommitment} on chain ${chainId}`);
            const isSpent = await isNoteSpent(
              darkpoolContext.darkPool,
              {
                note: note.noteCommitment,
                rho: note.rho,
                amount: note.amount,
                asset: note.asset
              },
              darkpoolContext.signature);
            if (isSpent) {
              this.dbService.updateNoteSpentByWalletAndNoteCommitment(wallet, chainId, note.noteCommitment);
            } else {
              this.dbService.updateNoteActiveByWalletAndNoteCommitment(wallet, chainId, note.noteCommitment);
            }
          }
        }
      } catch (error) {
        this.logger.error(`Error syncing asset ${note.asset} on chain ${chainId}: ${error.message}`);
      }
    }
  }
}
