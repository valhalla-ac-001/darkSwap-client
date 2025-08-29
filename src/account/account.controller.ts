import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiGenericResponse } from '../common/response.interface';
import { BaseDto } from '../common/dto/base.dto';
import { AccountService } from './account.service';
import { MyAssetsDto } from './dto/asset.dto';
import { DarkSwapContext } from '../common/context/darkSwap.context';
import { SyncAssetDto } from './dto/syncAsset.dto';
import { WalletMutexService } from '../common/mutex/walletMutex.service';


@Controller('account')
export class AccountController {
  private walletMutexService: WalletMutexService;
  constructor(private readonly accountService: AccountService) {
    this.walletMutexService = WalletMutexService.getInstance();
  }

  @Get()
  async getWallets(): Promise<string[]> {
    return this.accountService.getWallets();
  }

  @Post('/getBalance')
  @ApiGenericResponse(MyAssetsDto)
  async getAssetsByChainIdAndWallet(@Body() baseDto: BaseDto): Promise<MyAssetsDto> {
    const mutex = this.walletMutexService.getMutex(baseDto.chainId, baseDto.wallet.toLowerCase());
    return await mutex.runExclusive(async () => {
      return this.accountService.getAssetsByChainId(baseDto.wallet, baseDto.chainId);
    });
  }


  @Post('syncAssets')
  async syncAssets(@Body() baseDto: BaseDto): Promise<void> {
    const context = await DarkSwapContext.createDarkSwapContext(baseDto.chainId, baseDto.wallet)
    const mutex = this.walletMutexService.getMutex(baseDto.chainId, context.walletAddress.toLowerCase());
    await mutex.runExclusive(async () => {
      return this.accountService.syncAssets(context, baseDto.wallet, baseDto.chainId);
    });
  }

  @Post('syncOneAsset')
  async syncOneAsset(@Body() syncAssetDto: SyncAssetDto): Promise<void> {
    const context = await DarkSwapContext.createDarkSwapContext(syncAssetDto.chainId, syncAssetDto.wallet)
    const mutex = this.walletMutexService.getMutex(syncAssetDto.chainId, context.walletAddress.toLowerCase());
    await mutex.runExclusive(async () => {
      return this.accountService.syncOneAsset(context, syncAssetDto.wallet, syncAssetDto.chainId, syncAssetDto.asset);
    });
  }
}
