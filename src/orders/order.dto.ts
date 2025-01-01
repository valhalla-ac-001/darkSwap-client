import { BaseDto } from '../common/dto/base.dto';

export class OrderDto extends BaseDto {
    id: number;
    orderId: string;
    assetPairId: string;
    orderDirection: number;
    orderType: number;
    timeInForce: number;
    stpMode: number;
    price: string;
    amount: bigint; 
    partialAmount: bigint;
    status: number;
    publicKey: string;
    noteId: string;
    signature: string;
} 