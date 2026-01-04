import { Injectable, Logger } from '@nestjs/common';
import { DarkSwapOrderNote, DarkSwapNote, ProCancelOrderService, ProCreateOrderService } from '@thesingularitynetwork/darkswap-sdk';
import { v4 } from 'uuid';
import { BooknodeService } from '../common/booknode.service';
import { DarkSwapContext } from '../common/context/darkSwap.context';
import { DatabaseService } from '../common/db/database.service';
import { AssetPairDto } from '../common/dto/assetPair.dto';
import { getConfirmations } from '../config/networkConfig';
import { DarkSwapException } from '../exception/darkSwap.exception';
import { OrderDirection, OrderStatus, OrderType } from '../types';
import { CancelOrderDto } from './dto/cancelOrder.dto';
import { OrderDto } from './dto/order.dto';
import { UpdatePriceDto } from './dto/updatePrice.dto';
import { OrderEventService } from './orderEvent.service';
import { NotesJoinService } from '../common/notesJoin.service';
import { NoteService } from '../common/note.service';
import { checkPrice } from '../utils/priceUtil';

@Injectable()
export class OrderService {

  private readonly logger = new Logger(OrderService.name);

  private static instance: OrderService;
  private dbService: DatabaseService;
  private noteService: NoteService;
  private notesJoinService: NotesJoinService;
  private bookNodeService: BooknodeService;
  private orderEventService: OrderEventService;

  public constructor() {
    this.dbService = DatabaseService.getInstance();
    this.noteService = NoteService.getInstance();
    this.notesJoinService = NotesJoinService.getInstance();
    this.bookNodeService = BooknodeService.getInstance();
    this.orderEventService = OrderEventService.getInstance();
  }

  public static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService();
    }
    return OrderService.instance;
  }

  async triggerOrder(orderInfo: OrderDto) {
    if (!orderInfo) {
      throw new DarkSwapException('Order not found');
    }

    this.dbService.updateOrderTriggered(orderInfo.orderId);

    await OrderEventService.getInstance().logOrderStatusChange(
      orderInfo.orderId,
      orderInfo.wallet,
      orderInfo.chainId,
      OrderStatus.TRIGGERED
    );
  }

  async createOrder(orderDto: OrderDto, darkSwapContext: DarkSwapContext) {
    const assetPair = await this.dbService.getAssetPairById(orderDto.assetPairId, orderDto.chainId);
    if (!assetPair) {
      throw new DarkSwapException('Asset pair not found');
    }

    const amountQuote = orderDto.orderDirection === OrderDirection.BUY ? BigInt(orderDto.amountOut) : BigInt(orderDto.amountIn);
    const amountBase = orderDto.orderDirection === OrderDirection.BUY ? BigInt(orderDto.amountIn) : BigInt(orderDto.amountOut);

    if (!checkPrice(amountBase, amountQuote, assetPair.baseDecimal, assetPair.quoteDecimal, Number(orderDto.price))) {
      throw new DarkSwapException('Price not match with amountOut and amountIn');
    }

    const outAsset = orderDto.orderDirection === OrderDirection.BUY ? assetPair.quoteAddress : assetPair.baseAddress;
    const inAsset = orderDto.orderDirection === OrderDirection.BUY ? assetPair.baseAddress : assetPair.quoteAddress;

    const currentBalance = await this.notesJoinService.getCurrentBalanceNote(darkSwapContext, outAsset);

    if (currentBalance.amount < BigInt(orderDto.amountOut)) {
      throw new DarkSwapException(`Insufficient Asset ${outAsset}`);
    }

    const proCreateOrderService = new ProCreateOrderService(darkSwapContext.darkSwap);
    const { context, orderNote, newBalance } = await proCreateOrderService.prepare(
      darkSwapContext.walletAddress,
      outAsset,
      BigInt(orderDto.amountOut),
      inAsset,
      BigInt(orderDto.amountIn),
      currentBalance,
      darkSwapContext.signature
    );
    this.noteService.addNote(orderNote, darkSwapContext, true);
    if (newBalance.amount > 0n) {
      this.noteService.addNote(newBalance, darkSwapContext, false);
    }

    const tx = await proCreateOrderService.execute(context);
    const receipt = await darkSwapContext.darkSwap.provider.waitForTransaction(tx, getConfirmations(darkSwapContext.chainId));
    if (receipt.status !== 1) {
      throw new DarkSwapException("Order creation failed");
    }
    this.noteService.setNoteUsed(currentBalance, darkSwapContext);
    this.noteService.setNoteActive(orderNote, darkSwapContext, tx);

    if (newBalance.amount > 0n) {
      this.noteService.setNoteActive(newBalance, darkSwapContext, tx);
    }

    if (!orderDto.orderId) {
      orderDto.orderId = v4();
    }

    if (orderDto.orderType === OrderType.STOP_LOSS_LIMIT
      || orderDto.orderType === OrderType.STOP_LOSS
      || orderDto.orderType === OrderType.TAKE_PROFIT
      || orderDto.orderType === OrderType.TAKE_PROFIT_LIMIT) {
      orderDto.status = OrderStatus.NOT_TRIGGERED;
    } else {
      orderDto.status = OrderStatus.OPEN;
    }

    orderDto.noteCommitment = orderNote.note.toString();
    orderDto.nullifier = orderNote.nullifier.toString();
    orderDto.feeRatio = orderNote.feeRatio.toString();
    orderDto.txHashCreated = tx;
    orderDto.publicKey = darkSwapContext.publicKey;

    await this.dbService.addOrderByDto(orderDto);

    delete orderDto.noteCommitment;

    await this.bookNodeService.createOrder(orderDto);

    await OrderEventService.getInstance().logOrderStatusChange(
      orderDto.orderId,
      darkSwapContext.walletAddress,
      darkSwapContext.chainId,
      OrderStatus.OPEN
    );

    this.logger.log(`Order created: ${orderDto.orderDirection === OrderDirection.BUY ? 'BUY' : 'SELL'} ${orderDto.orderId} ${orderDto.assetPairId} OUT: ${orderDto.amountOut} IN: ${orderDto.amountIn}`);
  }

  async updateOrderPrice(updatePriceDto: UpdatePriceDto) {
    const order = await this.dbService.getOrderByOrderId(updatePriceDto.orderId);
    if (!order) {
      throw new DarkSwapException('Order not found');
    } else if (order.status != OrderStatus.OPEN) {
      throw new DarkSwapException('Order is not in open status');
    }

    const assetPair = await this.dbService.getAssetPairById(order.assetPairId, order.chainId);
    if (!assetPair) {
      throw new DarkSwapException('Asset pair not found');
    }

    const amountQuote = order.orderDirection === OrderDirection.BUY ? BigInt(order.amountOut) : BigInt(updatePriceDto.amountIn);
    const amountBase = order.orderDirection === OrderDirection.BUY ? BigInt(updatePriceDto.amountIn) : BigInt(order.amountOut);

    if (!checkPrice(amountBase, amountQuote, assetPair.baseDecimal, assetPair.quoteDecimal, Number(updatePriceDto.price))) {
      throw new DarkSwapException('Price not match with amountOut and amountIn');
    }

    await this.bookNodeService.updateOrderPrice(updatePriceDto);
    await this.dbService.updateOrderPrice(updatePriceDto.orderId, updatePriceDto.price, BigInt(updatePriceDto.amountIn), BigInt(updatePriceDto.partialAmountIn));
    return true;
  }

  // Method to cancel an order
  async cancelOrder(orderId: string, darkSwapContext: DarkSwapContext, byNotification: boolean = false) {

    const order = await this.dbService.getOrderByOrderId(orderId);
    if (!order) {
      throw new DarkSwapException('Order not found');
    }

    if (order.status !== OrderStatus.OPEN) {
      throw new DarkSwapException('Order is not cancellable');
    }

    const note = await this.dbService.getNoteByCommitment(order.noteCommitment);
    if (!note) {
      throw new DarkSwapException('Note not found');
    }

    const noteToProcess = {
      note: note.note,
      rho: note.rho,
      asset: note.asset,
      amount: note.amount,
      feeRatio: BigInt(order.feeRatio),
    } as DarkSwapOrderNote;

    const currentBalanceNote = await this.notesJoinService.getCurrentBalanceNote(darkSwapContext, note.asset);
    const proCancelOrderService = new ProCancelOrderService(darkSwapContext.darkSwap);

    const { context, newBalance } = await proCancelOrderService.prepare(
      darkSwapContext.walletAddress,
      noteToProcess,
      currentBalanceNote,
      darkSwapContext.signature
    );

    this.noteService.addNote(newBalance, darkSwapContext, false);

    const tx = await proCancelOrderService.execute(context);
    const receipt = await darkSwapContext.darkSwap.provider.waitForTransaction(tx, getConfirmations(darkSwapContext.chainId));
    if (receipt.status !== 1) {
      throw new DarkSwapException("Order cancellation failed");
    }

    this.noteService.setNoteUsed(noteToProcess as DarkSwapNote, darkSwapContext);
    this.noteService.setNoteUsed(currentBalanceNote, darkSwapContext);
    this.noteService.setNoteActive(newBalance, darkSwapContext, tx);

    const cancelOrderDto = {
      orderId: orderId,
      chainId: darkSwapContext.chainId,
      wallet: darkSwapContext.walletAddress
    } as CancelOrderDto;

    await this.dbService.cancelOrder(cancelOrderDto.orderId);
    if (!byNotification) {
      await this.bookNodeService.cancelOrder(cancelOrderDto);
    }

    await this.orderEventService.logOrderStatusChange(
      orderId,
      darkSwapContext.walletAddress,
      darkSwapContext.chainId,
      OrderStatus.CANCELLED
    );
  }

  async cancelOrderByNotificaion(orderInfo: OrderDto) {

    const darkSwapContext = await DarkSwapContext.createDarkSwapContext(orderInfo.chainId, orderInfo.wallet);
    await this.cancelOrder(orderInfo.orderId, darkSwapContext, true);
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