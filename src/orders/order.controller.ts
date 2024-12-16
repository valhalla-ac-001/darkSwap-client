import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@Body() orderData: any) {
    return this.orderService.createOrder(orderData);
  }

  @Get()
  findAll(@Param('status') status: string, @Param('page') page: number, @Param('limit') limit: number) {
    return this.orderService.getOrdersByStatusAndPage(status, page, limit);
  }

  @Delete(':id')
  cancel(@Param('id') id: string) {
    return this.orderService.cancelOrder(id);
  }
}