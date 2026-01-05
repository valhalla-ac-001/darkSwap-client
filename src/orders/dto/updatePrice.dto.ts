import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { IsBigIntString } from '../../common/decorators/is-bigint-string.decorator';
import { BaseDto } from '../../common/dto/base.dto';

export class UpdatePriceDto extends BaseDto {
    @ApiProperty()
    @IsNotEmpty()
    orderId: string;

    @ApiProperty({description: 'Human readable price'})
    @IsNotEmpty()
    price: string;

    @ApiProperty({description: 'Amount in smallest unit (wei/base units) as integer string'})
    @IsBigIntString()
    @IsNotEmpty()
    amountIn: string;
    
    @ApiProperty({description: 'Amount in smallest unit (wei/base units) as integer string'})
    @IsBigIntString()
    @IsNotEmpty()
    partialAmountIn: string;
} 