import { ApiProperty } from "@nestjs/swagger";
import { BaseDto } from "../../common/dto/base.dto";
import { IsEthereumAddress } from "src/common/decorators/is-ethereum-address.decorator";
import { IsNotEmpty } from "class-validator";

export class DepositDto extends BaseDto {
  @ApiProperty()
  @IsEthereumAddress()
  asset: string;
  @ApiProperty()
  @IsNotEmpty()
  amount: bigint;
} 