import { ApiProperty } from "@nestjs/swagger";
import { BaseDto } from "../../common/dto/base.dto";
import { IsEthereumAddress, IsNotEmpty } from "class-validator";

export class WithdrawDto extends BaseDto {
  @ApiProperty()
  @IsEthereumAddress()
  asset: string;
  @ApiProperty()
  @IsNotEmpty()
  amount: bigint;
  @ApiProperty()
  @IsEthereumAddress()
  receiptAddress: string;
} 