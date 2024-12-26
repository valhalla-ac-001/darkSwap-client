import { BaseDto } from "src/common/dto/base.dto";

export class DepositDto extends BaseDto {
  asset: string;
  amount: number;
} 