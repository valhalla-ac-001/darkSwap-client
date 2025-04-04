import { Injectable, Logger } from '@nestjs/common';
import { Note } from '@thesingularitynetwork/darkpool-v1-proof';
import { CancelOrderService, CreateMakerOrderService } from '@thesingularitynetwork/singularity-sdk';
import { v4 } from 'uuid';
import { BooknodeService } from '../common/booknode.service';
import { DarkpoolContext } from '../common/context/darkpool.context';
import { DatabaseService } from '../common/db/database.service';
import { AssetPairDto } from '../common/dto/assetPair.dto';
import { NoteBatchJoinSplitService } from '../common/noteBatchJoinSplit.service';
import { getConfirmations } from '../config/networkConfig';
import { DarkpoolException } from '../exception/darkpool.exception';
import { NoteStatus, OrderDirection, OrderStatus } from '../types';
import { CancelOrderDto } from './dto/cancelOrder.dto';
import { OrderDto } from './dto/order.dto';
import { UpdatePriceDto } from './dto/updatePrice.dto';
import { OrderEventService } from './orderEvent.service';


@Injectable()
export class OrderService {

  private readonly logger = new Logger(OrderService.name);

  private static instance: OrderService;
  private dbService: DatabaseService;
  private noteBatchJoinSplitService: NoteBatchJoinSplitService;
  private bookNodeService: BooknodeService;
  private orderEventService: OrderEventService;
  
  public constructor() {
    this.dbService = DatabaseService.getInstance();
    this.noteBatchJoinSplitService = NoteBatchJoinSplitService.getInstance();
    this.bookNodeService = BooknodeService.getInstance();
    this.orderEventService = OrderEventService.getInstance();
  }

  public static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService();
    }
    return OrderService.instance;
  }

  async createOrder(orderDto: OrderDto, darkPoolContext: DarkpoolContext) {
    const createMakerOrderService = new CreateMakerOrderService(darkPoolContext.relayerDarkPool);

    const assetPair = await this.dbService.getAssetPairById(orderDto.assetPairId, orderDto.chainId);
    const outAsset = orderDto.orderDirection === OrderDirection.BUY ? assetPair.quoteAddress : assetPair.baseAddress;

    const noteForOrder = await this.noteBatchJoinSplitService.getNoteOfAssetAmount(darkPoolContext, outAsset, BigInt(orderDto.amountOut));
    if (!noteForOrder) {
      throw new DarkpoolException(`Asset ${outAsset} not enough`);
    }
    const { context } = await createMakerOrderService.prepare(noteForOrder, darkPoolContext.signature);
    await createMakerOrderService.generateProof(context);
    const tx = await createMakerOrderService.execute(context);
    const receipt = await darkPoolContext.relayerDarkPool.provider.waitForTransaction(tx, getConfirmations(darkPoolContext.chainId));
    if (receipt.status !== 1) {
      throw new DarkpoolException("Order creation failed");
    }

    this.dbService.updateNoteLockedByWalletAndNoteCommitment(darkPoolContext.walletAddress, darkPoolContext.chainId, noteForOrder.note);
    if (!orderDto.orderId) {
      orderDto.orderId = v4();
    }
    orderDto.status = OrderStatus.OPEN;
    orderDto.noteCommitment = noteForOrder.note.toString();
    orderDto.nullifier = context.proof.outNullifier;
    orderDto.txHashCreated = tx;
    orderDto.publicKey = darkPoolContext.publicKey;

    await this.dbService.addOrderByDto(orderDto);

    delete orderDto.noteCommitment;

    await this.bookNodeService.createOrder(orderDto);

    await OrderEventService.getInstance().logOrderStatusChange(
      orderDto.orderId,
      darkPoolContext.walletAddress,
      darkPoolContext.chainId,
      OrderStatus.OPEN
    );

    this.logger.log(`Order created: ${orderDto.orderDirection === OrderDirection.BUY ? 'BUY' : 'SELL'} ${orderDto.orderId} ${orderDto.assetPairId} OUT: ${orderDto.amountOut} IN: ${orderDto.amountIn}`);
  }

  async updateOrderPrice(updatePriceDto: UpdatePriceDto) {
    const order = await this.dbService.getOrderByOrderId(updatePriceDto.orderId);
    if (!order) {
      throw new DarkpoolException('Order not found');
    } else if (order.status != OrderStatus.OPEN) {
      throw new DarkpoolException('Order is not in open status');
    }
    await this.bookNodeService.updateOrderPrice(updatePriceDto);
    await this.dbService.updateOrderPrice(updatePriceDto.orderId, updatePriceDto.price, BigInt(updatePriceDto.amountIn), BigInt(updatePriceDto.partialAmountIn));
    return true;
  }

  // Method to cancel an order
  async cancelOrder(orderId: string, darkPoolContext: DarkpoolContext, byNotification: boolean = false) {

    const cancelOrderService = new CancelOrderService(darkPoolContext.relayerDarkPool);

    const order = await this.dbService.getOrderByOrderId(orderId);
    if (!order) {
      throw new DarkpoolException('Order not found');
    }

    if (order.status !== OrderStatus.OPEN) {
      throw new DarkpoolException('Order is not cancellable');
    }

    const note = await this.dbService.getNoteByCommitment(order.noteCommitment);
    if (!note) {
      throw new DarkpoolException('Note not found');
    }

    const noteToProcess = {
      note: note.noteCommitment,
      rho: note.rho,
      asset: note.asset,
      amount: note.amount
    } as Note;


    if (note.status === NoteStatus.LOCKED) {


      const { context } = await cancelOrderService.prepare(noteToProcess, darkPoolContext.signature);
      await cancelOrderService.generateProof(context);
      const tx = await cancelOrderService.execute(context);
      const receipt = await darkPoolContext.relayerDarkPool.provider.waitForTransaction(tx, getConfirmations(darkPoolContext.chainId));
      if (receipt.status !== 1) {
        throw new DarkpoolException("Order cancellation failed");
      }

      await this.dbService.updateNoteActiveByWalletAndNoteCommitment(darkPoolContext.walletAddress, darkPoolContext.chainId, note.noteCommitment);
    }

    const cancelOrderDto = {
      orderId: orderId,
      chainId: darkPoolContext.chainId,
      wallet: darkPoolContext.walletAddress
    } as CancelOrderDto;

    await this.dbService.cancelOrder(cancelOrderDto.orderId);
    if (!byNotification) {
      await this.bookNodeService.cancelOrder(cancelOrderDto);
    }
    
    await this.orderEventService.logOrderStatusChange(
      orderId,
      darkPoolContext.walletAddress,
      darkPoolContext.chainId,
      OrderStatus.CANCELLED
    );
  }

  async cancelOrderByNotificaion(orderId: string) {

    const order = await this.dbService.getOrderByOrderId(orderId);
    const darkPoolContext = await DarkpoolContext.createDarkpoolContext(order.chainId, order.wallet);
    await this.cancelOrder(orderId, darkPoolContext, true);
  }

  async getOrdersByStatusAndPage(status: number, page: number, limit: number): Promise<OrderDto[]> {
    return await this.dbService.getOrdersByStatusAndPage(status, page, limit);
  }

  async getOrderById(orderId: string): Promise<OrderDto> {
    return await this.dbService.getOrderByOrderId(orderId);
  }

  async getAssetPairs(chainId: number): Promise<AssetPairDto[]> {
    const assetPairs = await this.dbService.getAssetPairs(chainId);
    return assetPairs;
  }
}