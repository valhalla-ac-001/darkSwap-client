import { BaseDto } from '../common/dto/base.dto';

export class OrderDto extends BaseDto {
    id: number;
    orderId: string;
    assetPairId: number;
    orderDirection: number;
    orderType: number;
    timeInForce: number;
    stpMode: number;
    price: string;
    amountOut: bigint;
    amountIn: bigint; 
    partialAmountIn: bigint;
    status: number;
    publicKey: string;
    noteCommitment: bigint;
    txHashCreated: string;
    signature: string;
} 