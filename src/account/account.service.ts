import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../common/db/database.service';
import { NoteStatus } from '../types';
import { MyAssetsDto } from './dto/asset.dto';
import { getNoteOnChainStatusBySignature, NoteOnChainStatus } from '@thesingularitynetwork/darkswap-sdk';
import { DarkSwapContext } from '../common/context/darkSwap.context';
import { ConfigLoader } from '../utils/configUtil';
import { BatchProcessor } from '../utils/rateLimiter';

@Injectable()
export class AccountService {

  private readonly logger = new Logger(AccountService.name);

  private static instance: AccountService;
  private dbService: DatabaseService;
  
  // With global RPC rate limiting in place, we can process notes faster
  // Process in batches of 10 with 200ms delay for progress visibility
  private batchProcessor = new BatchProcessor(10, 200);

  public constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  async getWallets(): Promise<string[]> {
    return ConfigLoader.getInstance().getConfig().wallets.map(wallet => wallet.address);
  }

  async getAssetsByChainId(wallet: string, chainId: number): Promise<MyAssetsDto> {
    const notes = await this.dbService.getAssetsNotesByWalletAndChainId(wallet, chainId);
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

  async syncOneAsset(darkSwapContext: DarkSwapContext, wallet: string, chainId: number, asset: string): Promise<void> {

    const notes = (await this.dbService.getNotesByWalletAndChainIdAndAsset(wallet, chainId, asset))
      .filter(note => note.status !== NoteStatus.SPENT && note.status !== NoteStatus.CREATED)
      .sort((a, b) => a.amount < b.amount ? 1 : -1);

    this.logger.log(`Syncing ${notes.length} notes for asset ${asset} on chain ${chainId}`);

    // Process notes in batches to avoid rate limiting
    await this.batchProcessor.processBatch(notes, async (note) => {
      try {
        const onChainStatus = await getNoteOnChainStatusBySignature(
          darkSwapContext.darkSwap,
          {
            note: note.note,
            rho: note.rho,
            amount: note.amount,
            asset: note.asset,
            address: note.wallet
          },
          darkSwapContext.signature);
        
        if (onChainStatus == NoteOnChainStatus.ACTIVE && note.status != NoteStatus.ACTIVE) {
          this.dbService.updateNoteActiveByWalletAndNoteCommitment(wallet, chainId, note.note);
        } else if (onChainStatus == NoteOnChainStatus.LOCKED && note.status != NoteStatus.LOCKED) {
          this.dbService.updateNoteLockedByWalletAndNoteCommitment(wallet, chainId, note.note);
        } else if (onChainStatus == NoteOnChainStatus.SPENT && note.status != NoteStatus.SPENT) {
          this.dbService.updateNoteSpentByWalletAndNoteCommitment(wallet, chainId, note.note);
        } else if (onChainStatus == NoteOnChainStatus.UNKNOWN && note.status != NoteStatus.CREATED) {
          this.dbService.updateNoteCreatedByWalletAndNoteCommitment(wallet, chainId, note.note);
        }
      } catch (error) {
        // Check if it's a rate limit error vs missing note
        if (error.message?.includes('request limit reached')) {
          this.logger.warn(`Rate limit hit while syncing note for asset ${note.asset}, will retry later`);
        } else if (error.code === 'CALL_EXCEPTION') {
          // Note doesn't exist on-chain - likely never deposited, keep as CREATED
          this.logger.debug(`Note not found on-chain for asset ${note.asset} (status: ${note.status})`);
        } else {
          this.logger.error(`Error syncing note for asset ${note.asset} on chain ${chainId}: ${error.message}`);
        }
      }
    });
  }

  async syncAssets(darkSwapContext: DarkSwapContext, wallet: string, chainId: number): Promise<void> {
    const notes = (await this.dbService.getNotesByWalletAndChainId(wallet, chainId))
      .filter(note => note.status !== NoteStatus.SPENT && note.status !== NoteStatus.CREATED);

    this.logger.log(`Syncing ${notes.length} notes for wallet ${wallet} on chain ${chainId}`);

    // Process notes in batches to avoid rate limiting
    await this.batchProcessor.processBatch(notes, async (note) => {
      try {
        const onChainStatus = await getNoteOnChainStatusBySignature(
          darkSwapContext.darkSwap,
          {
            note: note.note,
            rho: note.rho,
            amount: note.amount,
            asset: note.asset,
            address: note.wallet
          },
          darkSwapContext.signature);
        
        if (onChainStatus == NoteOnChainStatus.ACTIVE && note.status != NoteStatus.ACTIVE) {
          this.dbService.updateNoteActiveByWalletAndNoteCommitment(wallet, chainId, note.note);
        } else if (onChainStatus == NoteOnChainStatus.LOCKED && note.status != NoteStatus.LOCKED) {
          this.dbService.updateNoteLockedByWalletAndNoteCommitment(wallet, chainId, note.note);
        } else if (onChainStatus == NoteOnChainStatus.SPENT && note.status != NoteStatus.SPENT) {
          this.dbService.updateNoteSpentByWalletAndNoteCommitment(wallet, chainId, note.note);
        } else if (onChainStatus == NoteOnChainStatus.UNKNOWN && note.status != NoteStatus.CREATED) {
          this.dbService.updateNoteCreatedByWalletAndNoteCommitment(wallet, chainId, note.note);
        }
      } catch (error) {
        // Check if it's a rate limit error vs missing note
        if (error.message?.includes('request limit reached')) {
          this.logger.warn(`Rate limit hit while syncing note for asset ${note.asset}, will retry later`);
        } else if (error.code === 'CALL_EXCEPTION') {
          // Note doesn't exist on-chain - likely never deposited, keep as CREATED
          this.logger.debug(`Note not found on-chain for asset ${note.asset} (status: ${note.status})`);
        } else {
          this.logger.error(`Error syncing note for asset ${note.asset} on chain ${chainId}: ${error.message}`);
        }
      }
    });
  }
}
