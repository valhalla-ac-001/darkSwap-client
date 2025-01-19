import { Body, Controller, Get, Post } from '@nestjs/common';
import { ethers } from 'ethers';
import { DarkpoolContext } from '../common/context/darkpool.context';
import { TokenService } from '../common/token/token.service';
import { BasicService } from './basic.service';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { BaseDto } from '../common/dto/base.dto';
import { retry } from 'rxjs';

@Controller('basic')
export class BasicController {
  constructor(private readonly basicService: BasicService) { }

  @Post('deposit')
  async deposit(@Body() depositDto: DepositDto) {
    const context = await DarkpoolContext.createDarkpoolContext(depositDto.chainId, depositDto.wallet)
    const token = await TokenService.getTokenByChainId(depositDto.chainId, depositDto.asset);
    await this.basicService.deposit(context, token, BigInt(depositDto.amount));
    return { message: 'success' };
  }

  @Post('withdraw')
  async withdraw(@Body() withdrawDto: WithdrawDto) {
    const context = await DarkpoolContext.createDarkpoolContext(withdrawDto.chainId, withdrawDto.wallet)
    const token = await TokenService.getTokenByChainId(withdrawDto.chainId, withdrawDto.asset);
    await this.basicService.withdraw(context, token, BigInt(withdrawDto.amount), withdrawDto.receiptAddress);
    return { message: 'success' };
  }

  @Get('syncNoteStatus')
  async syncNoteStatus() {
    // return this.basicService.syncNoteStatus();
  }

  @Get('getAssets')
  async getAssets(@Body() baseDto: BaseDto) {
    return this.basicService.getAssets(baseDto);
  }
}