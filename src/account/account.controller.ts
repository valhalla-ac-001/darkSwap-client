import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiGenericResponse } from '../common/response.interface';
import { BaseDto } from '../common/dto/base.dto';
import { AccountService } from './account.service';
import { MyAssetsDto } from './dto/asset.dto';
import { DarkSwapContext } from '../common/context/darkSwap.context';
import { SyncAssetDto } from './dto/syncAsset.dto';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) { }

  @Get()
  async getWallets(): Promise<string[]> {
    return this.accountService.getWallets();
  }

  @Post('/getBalance')
  @ApiGenericResponse(MyAssetsDto)
  async getAssetsByChainIdAndWallet(@Body() baseDto: BaseDto): Promise<MyAssetsDto> {
    return this.accountService.getAssetsByChainId(baseDto.wallet, baseDto.chainId);
  }


  @Post('syncAssets')
  async syncAssets(@Body() baseDto: BaseDto): Promise<void> {
    const context = await DarkSwapContext.createDarkSwapContext(baseDto.chainId, baseDto.wallet)
    return this.accountService.syncAssets(context, baseDto.wallet, baseDto.chainId);
  }

  @Post('syncOneAsset')
  async syncOneAsset(@Body() syncAssetDto: SyncAssetDto): Promise<void> {
    const context = await DarkSwapContext.createDarkSwapContext(syncAssetDto.chainId, syncAssetDto.wallet)
    return this.accountService.syncOneAsset(context, syncAssetDto.wallet, syncAssetDto.chainId, syncAssetDto.asset);
  }
}
