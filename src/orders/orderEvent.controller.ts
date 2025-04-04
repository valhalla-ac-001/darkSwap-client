import { Controller, Get, Param } from '@nestjs/common';
import { ApiGenericArrayResponse } from '../common/response.interface';
import { OrderEventDto } from './dto/orderEvent.dto';
import { OrderEventService } from './orderEvent.service';

@Controller('order-events')
export class OrderEventController {
  constructor(private readonly orderEventService: OrderEventService) { }

  @Get(':orderId')
  @ApiGenericArrayResponse(OrderEventDto)
  async getOrderEvents(@Param('orderId') orderId: string): Promise<OrderEventDto[]> {
    return await this.orderEventService.getOrderEvents(orderId);
  }

  @Get('incremental/:lastEventId')
  @ApiGenericArrayResponse(OrderEventDto)
  getIncrementalOrderEvents(@Param('lastEventId') lastEventId: number): Promise<OrderEventDto[]> {
    return this.orderEventService.getIncrementalOrderEvents(lastEventId);
  }
} 