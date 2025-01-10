import { ApiProperty } from '@nestjs/swagger';
import { BaseDto } from '../../common/dto/base.dto';
import { IsNotEmpty } from 'class-validator';

export class CancelOrderDto extends BaseDto {
    @ApiProperty()
    @IsNotEmpty()
    orderId: string;
    @ApiProperty()
    @IsNotEmpty()
    nullifier: bigint;  
  } 