import { ApiProperty } from "@nestjs/swagger";
import { BaseDto } from "../../common/dto/base.dto";

export class SyncAssetDto extends BaseDto {
    @ApiProperty()
    asset: string;
}
