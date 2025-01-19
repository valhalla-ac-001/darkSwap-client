import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AccountService } from './account.service';
import { MyAssetsDto } from './dto/asset.dto';
import { BaseDto } from 'src/common/dto/base.dto';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) { }

  @Get('/:wallet')
  async getAssets(@Param('wallet') wallet: string): Promise<MyAssetsDto[]> {
    return this.accountService.getAssets(wallet);
  }

  @Post()
  async getAssetsByChainIdAndWallet(@Body() baseDto: BaseDto): Promise<MyAssetsDto> {
    return this.accountService.getAssetsByChainId(baseDto.wallet, baseDto.chainId);
  }
}
