import { BaseDto } from "../../common/dto/base.dto";

export class WithdrawDto extends BaseDto {
  asset: string;
  amount: bigint;
  receiptAddress: string;
} 