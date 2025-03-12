import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { DarkpoolContext } from '../common/context/darkpool.context';
import { AssetPairDto } from '../common/dto/assetPair.dto';
import { ApiGenericArrayResponse, ApiGenericResponse, DarkPoolSimpleResponse } from '../common/response.interface';
import { CancelOrderDto } from './dto/cancelOrder.dto';
import { OrderDto } from './dto/order.dto';
import { UpdatePriceDto } from './dto/updatePrice.dto';
import { OrderService } from './order.service';
import { DarkpoolError } from '@thesingularitynetwork/singularity-sdk';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) { }

  @Post('createOrder')
  @ApiResponse({
    status: 200,
    description: 'Order created',
    type: DarkPoolSimpleResponse
  })
  async createOrder(@Body() orderDto: OrderDto): Promise<void> {
    if (orderDto.orderId) {
      const order = await this.orderService.getOrderById(orderDto.orderId);
      if (order) {
        throw new DarkpoolError('Duplicate Order ID');
      }
    }

    const context = await DarkpoolContext.createDarkpoolContext(orderDto.chainId, orderDto.wallet)
    await this.orderService.createOrder(orderDto, context);
  }

  @Delete('cancelOrder')
  @ApiResponse({
    status: 200,
    description: 'Order canceled',
    type: DarkPoolSimpleResponse
  })
  async cancelOrder(@Body() cancelOrderDto: CancelOrderDto) {
    const context = await DarkpoolContext.createDarkpoolContext(cancelOrderDto.chainId, cancelOrderDto.wallet)
    await this.orderService.cancelOrder(cancelOrderDto.orderId, context);
  }

  @Put('updatePrice')
  @ApiResponse({
    status: 200,
    description: 'Order price updated',
    type: DarkPoolSimpleResponse
  })
  async updateOrderPrice(@Body() updatePriceDto: UpdatePriceDto) {
    await this.orderService.updateOrderPrice(updatePriceDto);
  }

  @Get('getAllOrders/:status/:page/:limit')
  @ApiGenericArrayResponse(OrderDto)
  getAllOrders(@Param('status') status: number, @Param('page') page: number, @Param('limit') limit: number) {
    return this.orderService.getOrdersByStatusAndPage(status, page, limit);
  }

  @Get('getOrderById/:orderId')
  @ApiGenericResponse(OrderDto)
  async getOrderById(@Param('orderId') orderId: string): Promise<OrderDto> {
    return await this.orderService.getOrderById(orderId);
  }

  @Get('getAssetPairs')
  @ApiGenericArrayResponse(AssetPairDto)
  getAssetPairs(@Query('chainId') chainId: number) {
    return this.orderService.getAssetPairs(chainId);
  }

}