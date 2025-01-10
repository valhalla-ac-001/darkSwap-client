import { BaseDto } from '../../common/dto/base.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { IsOrderDirectionValid } from 'src/common/decorators/is-order-direction-valid.decorator';
import { IsOrderStpModeValid } from 'src/common/decorators/is-order-stp-mode-valid.decorator';
import { IsOrderTimeInForceValid } from 'src/common/decorators/is-order-time-in-force-valid.decorator';
import { IsOrderTypeValid } from 'src/common/decorators/is-order-type-valid.decorator';

export class OrderDto extends BaseDto {
    id?: number;
    @ApiProperty()
    @IsNotEmpty()
    orderId: string;
    @ApiProperty()
    @IsNotEmpty()
    assetPairId: string;
    @ApiProperty()
    @IsOrderDirectionValid()
    orderDirection: number;
    @ApiProperty()
    @IsOrderTypeValid()
    orderType: number;
    @ApiProperty()
    @IsOrderTimeInForceValid()
    timeInForce: number;
    @ApiProperty()
    @IsOrderStpModeValid()
    stpMode: number;
    @ApiProperty()
    @IsNotEmpty()
    price: string;
    @ApiProperty()
    @IsNotEmpty()
    amountOut: bigint;
    @ApiProperty()
    @IsNotEmpty()
    amountIn: bigint;
    @ApiProperty() 
    @IsOptional()
    partialAmountIn?: bigint;
    status?: number;
    publicKey?: string;
    noteCommitment?: bigint;
    nullifier?: bigint;
    txHashCreated?: string;
    txHashSettled?: string;
} 