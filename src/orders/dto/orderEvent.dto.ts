import { BaseDto } from "src/common/dto/base.dto";

export class OrderEventDto extends BaseDto {
  id: number;
  orderId: string;
  status: number;
  createdAt: Date;
} 