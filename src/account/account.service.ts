import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../common/db/database.service';
import { NoteStatus } from '../types';
import { MyAssetsDto } from './dto/asset.dto';

@Injectable()
export class AccountService {

  private readonly logger = new Logger(AccountService.name);

  private static instance: AccountService;
  private dbService: DatabaseService;

  public constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  public static getInstance(): AccountService {
    if (!AccountService.instance) {
      AccountService.instance = new AccountService();
    }
    return AccountService.instance;
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
}
