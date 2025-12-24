import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { IsOrderDirectionValid } from '../../common/decorators/is-order-direction-valid.decorator';
import { IsOrderStpModeValid } from '../../common/decorators/is-order-stp-mode-valid.decorator';
import { IsOrderTimeInForceValid } from '../../common/decorators/is-order-time-in-force-valid.decorator';
import { IsOrderTypeValid } from '../../common/decorators/is-order-type-valid.decorator';
import { IsBigIntString } from '../../common/decorators/is-bigint-string.decorator';
import { BaseDto } from '../../common/dto/base.dto';
import { OrderDirection, OrderStatus, OrderType, StpMode, TimeInForce } from '../../types';

export class OrderDto extends BaseDto {
    id?: number;
    @ApiProperty()
    @IsNotEmpty()
    orderId: string;
    @ApiProperty()
    @IsNotEmpty()
    assetPairId: string;
    @ApiProperty({
        enum: OrderDirection,
        description: '0 for buy, 1 for sell',
    })
    @IsOrderDirectionValid()
    orderDirection: OrderDirection;
    @ApiProperty({
        enum: OrderType,
        description: '0 for market, 1 for limit, 2 for stop loss, 3 for stop loss limit, 4 for take profit, 5 for take profit limit, 6 for limit maker',
    })
    @IsOrderTypeValid()
    orderType: OrderType;
    @ApiProperty({
        enum: TimeInForce,
        description: '0 for GTC, 1 for GTD, 2 for IOC, 4 for FOK, 8 for AON GTC, 9 for AON GTD',
    })
    @IsOrderTimeInForceValid()
    timeInForce: TimeInForce;
    @ApiProperty({
        enum: StpMode,
        description: '0 for none, 1 for expire maker, 2 for expire taker, 3 for both',
    })
    @IsOrderStpModeValid()
    stpMode: StpMode;

    @ApiProperty({description: 'Price for stop loss or take profit orders'})
    @IsOptional()
    orderTriggerPrice?: string;

    @ApiProperty({description: 'Human readable price'})
    @IsNotEmpty()
    price: string;
    @ApiProperty({description: 'Amount in smallest unit (wei/base units) as integer string, e.g. "1000000000000000000" for 1 token with 18 decimals'})
    @IsBigIntString()
    @IsNotEmpty()
    amountOut: string;
    @ApiProperty({description: 'Amount in smallest unit (wei/base units) as integer string, e.g. "1000000000000000000" for 1 token with 18 decimals'})
    @IsBigIntString()
    @IsNotEmpty()
    amountIn: string;
    @ApiProperty({description: 'Amount in smallest unit (wei/base units) as integer string, e.g. "1000000000000000000" for 1 token with 18 decimals'})
    @IsBigIntString()
    @IsOptional()
    partialAmountIn?: string;
    
    feeRatio: string;
    
    @ApiProperty()
    @IsOptional()
    status?: OrderStatus;
    publicKey?: string;
    noteCommitment?: string;
    incomingNoteCommitment?: string;
    nullifier?: string;
    txHashCreated?: string;
    txHashSettled?: string;
} 