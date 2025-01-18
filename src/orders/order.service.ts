import { Injectable, Logger } from '@nestjs/common';
import { Note } from '@thesingularitynetwork/darkpool-v1-proof';
import { CancelOrderService, CreateMakerOrderService } from '@thesingularitynetwork/singularity-sdk';
import axios from 'axios';
import { AssetPairDto } from 'src/common/dto/assetPair.dto';
import { NoteBatchJoinSplitService } from 'src/common/noteBatchJoinSplit.service';
import { NoteStatus, OrderDirection } from 'src/types';
import { ConfigLoader } from 'src/utils/configUtil';
import { v4 } from 'uuid';
import { DarkpoolContext } from '../common/context/darkpool.context';
import { DatabaseService } from '../common/db/database.service';
import { CancelOrderDto } from './dto/cancelOrder.dto';
import { OrderDto } from './dto/order.dto';

interface BookNodeCreateOrderDto {
  chainId: number;
  wallet: string;
  orderId: string;
  assetPairId: string;
  orderDirection: number;
  orderType: number;
  timeInForce: number;
  stpMode: number;
  price: number;
  amountOut: string;
  amountIn: string;
  partialAmountIn: string;
  publicKey: string;
  nullifier: string;
  txHashCreated: string;
}


@Injectable()
export class OrderService {

  private readonly logger = new Logger(OrderService.name);

  private static instance: OrderService;
  private dbService: DatabaseService;
  private noteBatchJoinSplitService: NoteBatchJoinSplitService;
  private configLoader: ConfigLoader;

  public constructor() {
    this.dbService = DatabaseService.getInstance();
    this.noteBatchJoinSplitService = NoteBatchJoinSplitService.getInstance();
    this.configLoader = ConfigLoader.getInstance();
  }

  async createOrder(orderDto: OrderDto, darkPoolContext: DarkpoolContext) {
    const createMakerOrderService = new CreateMakerOrderService(darkPoolContext.darkPool);

    const assetPair = await this.dbService.getAssetPairById(orderDto.assetPairId, orderDto.chainId);
    const outAsset = orderDto.orderDirection === OrderDirection.BUY ? assetPair.quoteAddress : assetPair.baseAddress;

    const noteForOrder = await this.noteBatchJoinSplitService.getNoteOfAssetAmount(darkPoolContext, outAsset, BigInt(orderDto.amountOut));
    if (!noteForOrder) {
      throw new Error('Asset not enough');
    }
    const { context } = await createMakerOrderService.prepare(noteForOrder, darkPoolContext.signature);
    await createMakerOrderService.generateProof(context);
    const tx = await createMakerOrderService.execute(context);
    this.dbService.updateNoteLockedByWalletAndNoteCommitment(darkPoolContext.walletAddress, darkPoolContext.chainId, noteForOrder.note);
    if (!orderDto.orderId) {
      orderDto.orderId = v4();
    }
    orderDto.status = NoteStatus.ACTIVE;
    orderDto.noteCommitment = noteForOrder.note.toString();
    orderDto.nullifier = context.proof.outNullifier;
    orderDto.txHashCreated = tx;
    orderDto.publicKey = darkPoolContext.publicKey;

    await this.dbService.addOrderByDto(orderDto);

    delete orderDto.noteCommitment;
    const createOrderRequestDto: BookNodeCreateOrderDto = {
      chainId: orderDto.chainId,
      wallet: orderDto.wallet,
      orderId: orderDto.orderId,
      assetPairId: orderDto.assetPairId,
      orderDirection: orderDto.orderDirection,
      orderType: orderDto.orderType,
      timeInForce: orderDto.timeInForce,
      stpMode: orderDto.stpMode,
      price: Number(orderDto.price),
      amountOut: orderDto.amountOut.toString(),
      amountIn: orderDto.amountIn.toString(),
      partialAmountIn: orderDto.partialAmountIn.toString(),
      publicKey: orderDto.publicKey,
      nullifier: orderDto.nullifier.toString(),
      txHashCreated: orderDto.txHashCreated
    }
    await axios.post(`${this.configLoader.getConfig().bookNodeApiUrl}/api/orders/create`, createOrderRequestDto, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.configLoader.getConfig().bookNodeApiKey}`
      }
    });

    this.logger.log(`Order created: ${orderDto.orderDirection === OrderDirection.BUY ? 'BUY' : 'SELL'} ${orderDto.orderId} ${orderDto.assetPairId} OUT: ${orderDto.amountOut} IN: ${orderDto.amountIn}`);
  }

  // Method to cancel an order
  async cancelOrder(orderId: string, darkPoolContext: DarkpoolContext) {

    const cancelOrderService = new CancelOrderService(darkPoolContext.darkPool);

    const note = await this.dbService.getNoteByOrderId(orderId);

    const noteToProcess = {
      note: note.noteCommitment,
      rho: note.rho,
      asset: note.asset,
      amount: note.amount
    } as Note;

    const cancelOrderDto = {
      orderId: orderId,
      chainId: darkPoolContext.chainId,
      wallet: darkPoolContext.walletAddress
    } as CancelOrderDto;

    const { context } = await cancelOrderService.prepare(noteToProcess, darkPoolContext.signature);
    await cancelOrderService.generateProof(context);
    await cancelOrderService.execute(context);
    await this.dbService.cancelOrder(cancelOrderDto.orderId);
    await axios.post(`${this.configLoader.getConfig().bookNodeApiUrl}/api/orders/cancel`, cancelOrderDto, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.configLoader.getConfig().bookNodeApiKey}`
      }
    });
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