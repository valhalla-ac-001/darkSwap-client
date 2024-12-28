import { BaseDto } from './base.dto';

export class noteDto extends BaseDto {
    publicKey: string;
    type: string;
    noteCommitment: string;
    rho: string;
    asset: string;
    amount: bigint;
    status: number;
    transactionCreated: string;
  } 