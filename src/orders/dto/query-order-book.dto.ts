import { ApiProperty } from '@nestjs/swagger';

export class QueryOrderBookDto {
    @ApiProperty({ description: 'The chain id' })
    chainId: number;

    @ApiProperty({ description: 'The asset pair id' })
    assetPairId: string;
}
