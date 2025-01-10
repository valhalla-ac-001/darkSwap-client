import { Injectable } from '@nestjs/common';
import { OrderDto } from './dto/order.dto';
import { CancelOrderDto } from './dto/cancelOrder.dto';
import { Note } from '@thesingularitynetwork/darkpool-v1-proof';
import { DatabaseService } from '../common/db/database.service';
import { DarkpoolContext } from '../common/context/darkpool.context';
import { CreateMakerOrderService, CancelOrderService} from '@thesingularitynetwork/singularity-sdk';
import { NoteBatchJoinSplitService } from 'src/common/noteBatchJoinSplit.service';
import { ConfigLoader } from 'src/utils/configUtil';
import { v4 } from 'uuid';
import axios from 'axios';

@Injectable()
export class OrderService {
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

    const assetPair = await this.dbService.getAssetPairById(orderDto.assetPairId);
    const outAsset = orderDto.orderDirection === 0 ? assetPair.quoteAddress : assetPair.baseAddress;
    const notes = await this.dbService.getNotesByAsset(outAsset, darkPoolContext.chainId);
    const notesToProcess = notes.map(note => {
      return {
        note: note.noteCommitment,
        rho: note.rho,
        asset: note.asset,
        amount: note.amount
      } as Note;
    });

    const noteForOrder = await this.noteBatchJoinSplitService.notesJoinSplit(notesToProcess, darkPoolContext, orderDto.amountOut); 
    const {context, outNotes} = await createMakerOrderService.prepare(noteForOrder,darkPoolContext.signature);
    await createMakerOrderService.generateProof(context);
    const tx = await createMakerOrderService.execute(context);
    if (!orderDto.orderId){
      orderDto.orderId = v4();
    }
    orderDto.status = 0;
    orderDto.nullifier = BigInt(context.proof.outNullifier);
    orderDto.txHashCreated = tx;
    orderDto.publicKey = darkPoolContext.publicKey;

    await this.dbService.addOrderByDto(orderDto);

    delete orderDto.noteCommitment;
    await axios.post(`${this.configLoader.getConfig().bookNodeApiUrl}/order/createOrder`, orderDto,{
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.configLoader.getConfig().bookNodeApiKey}`
      }
    });
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
    
    const {context, outNotes} = await cancelOrderService.prepare(noteToProcess, darkPoolContext.signature);
    await cancelOrderService.generateProof(context);
    await cancelOrderService.execute(context);
    await this.dbService.cancelOrder(cancelOrderDto.orderId);
    await axios.post(`${this.configLoader.getConfig().bookNodeApiUrl}/order/cancelOrder`, cancelOrderDto,{
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.configLoader.getConfig().bookNodeApiKey}`
      }
    });
  }
  // Method to get orders by status and page
  getOrdersByStatusAndPage(status: number, page: number, limit: number): Promise<OrderDto[]> {
    return this.dbService.getOrdersByStatusAndPage(status, page, limit);
  }
}