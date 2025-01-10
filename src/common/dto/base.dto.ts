import { ApiProperty } from '@nestjs/swagger';
import { IsSupportedChain } from '../decorators/is-supported-chain.decorator';
import { IsEthereumAddress } from '../decorators/is-ethereum-address.decorator';

export class BaseDto {
  @ApiProperty()
  @IsSupportedChain()
  chainId: number;
  @ApiProperty()
  @IsEthereumAddress()
  wallet: string;
} 