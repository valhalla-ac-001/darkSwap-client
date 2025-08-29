import { Body, Controller, Post } from '@nestjs/common';
import { DarkSwapContext } from '../common/context/darkSwap.context';
import { TokenService } from '../common/token/token.service';
import { BasicService } from './basic.service';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { ApiResponse } from '@nestjs/swagger';
import { DarkSwapSimpleResponse } from '../common/response.interface';
import { WalletMutexService } from '../common/mutex/walletMutex.service';

@Controller('basic')
export class BasicController {
  private walletMutexService: WalletMutexService;
  constructor(private readonly basicService: BasicService) { 
    this.walletMutexService = WalletMutexService.getInstance();
  }

  @Post('deposit')
  @ApiResponse({
    status: 200,
    description: 'Deposit success',
    type: DarkSwapSimpleResponse
  })
  async deposit(@Body() depositDto: DepositDto) {
    const context = await DarkSwapContext.createDarkSwapContext(depositDto.chainId, depositDto.wallet)
    const token = await TokenService.getTokenByChainId(depositDto.chainId, depositDto.asset);
    const mutex = this.walletMutexService.getMutex(context.chainId, context.walletAddress.toLowerCase());
    await mutex.runExclusive(async () => { 
      await this.basicService.deposit(context, token, BigInt(depositDto.amount));
    });
  }

  @Post('withdraw')
  @ApiResponse({
    status: 200,
    description: 'Withdraw success',
    type: DarkSwapSimpleResponse
  })
  async withdraw(@Body() withdrawDto: WithdrawDto) {
    const context = await DarkSwapContext.createDarkSwapContext(withdrawDto.chainId, withdrawDto.wallet)
    const token = await TokenService.getTokenByChainId(withdrawDto.chainId, withdrawDto.asset);
    const mutex = this.walletMutexService.getMutex(context.chainId, context.walletAddress.toLowerCase());
    await mutex.runExclusive(async () => {
      await this.basicService.withdraw(context, token, BigInt(withdrawDto.amount));
    });
  }
}
