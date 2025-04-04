import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../common/db/database.service';
import { OrderEventDto } from './dto/orderEvent.dto';
import { OrderStatus } from '../types';

@Injectable()
export class OrderEventService {
  private readonly logger = new Logger(OrderEventService.name);
  private static instance: OrderEventService;
  private dbService: DatabaseService;

  public constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  public static getInstance(): OrderEventService {
    if (!OrderEventService.instance) {
      OrderEventService.instance = new OrderEventService();
    }
    return OrderEventService.instance;
  }

  public async logOrderStatusChange(
    orderId: string,
    wallet: string,
    chainId: number,
    status: OrderStatus,
  ): Promise<void> {
    await this.dbService.addOrderEvent(chainId, orderId, wallet, status);
    this.logger.log(`Order event logged: ${orderId} - ${OrderStatus[status]}`);
  }

  public async getOrderEvents(orderId: string): Promise<OrderEventDto[]> {
    return await this.dbService.getOrderEventsByOrderId(orderId);
  }

  public async getIncrementalOrderEvents(lastEventId: number): Promise<OrderEventDto[]> {
    return await this.dbService.getIncrementalOrderEvents(lastEventId);
  }
} 