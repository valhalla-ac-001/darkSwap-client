import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { OrderEventService } from './orderEvent.service';
import { OrderEventController } from './orderEvent.controller';

@Module({
  providers: [OrderService, OrderEventService],
  controllers: [OrderController, OrderEventController],
})
export class OrdersModule {}