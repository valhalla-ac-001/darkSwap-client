import { Injectable } from '@nestjs/common';
import { OrderDto } from './order.dto';
import { Note } from '@thesingularitynetwork/darkpool-v1-proof';
import { DatabaseService } from '../common/db/database.service';
import { DarkpoolContext } from '../common/context/darkpool.context';
import { CreateMakerOrderService } from '@thesingularitynetwork/singularity-sdk';
import { NoteBatchJoinSplitService } from 'src/common/noteBatchJoinSplit.service';

@Injectable()
export class OrderService {
  // Method to create an order
  async createOrder(orderDto: OrderDto, darkPoolContext: DarkpoolContext) {
    const createMakerOrderService = new CreateMakerOrderService(darkPoolContext.darkPool);

    const dbservice = DatabaseService.getInstance();
    const assetPair = await dbservice.getAssetPairById(orderDto.assetPairId);
    const outAsset = orderDto.orderDirection === 0 ? assetPair.assetB : assetPair.assetA;
    const notes = await dbservice.getNotesByAsset(outAsset, darkPoolContext.chainId);
    const notesToProcess = notes.map(note => {
      return {
        note: note.noteCommitment,
        rho: note.rho,
        asset: note.asset,
        amount: note.amount
      } as Note;
    });

    const noteForOrder = await NoteBatchJoinSplitService.notesJoinSplit(notesToProcess, darkPoolContext, orderDto.amountOut); 
    const {context, outNotes} = await createMakerOrderService.prepare(noteForOrder,darkPoolContext.signature);
    await createMakerOrderService.generateProof(context);
    const tx = await createMakerOrderService.execute(context);
    orderDto.status = 0;
    orderDto.noteCommitment = noteForOrder.note;
    orderDto.signature = context.signature
    orderDto.txHashCreated = tx;

    await dbservice.addOrderByDto(orderDto);
    // send order info to booknode
  }

  // Method to cancel an order
  cancelOrder(orderId: string) {
    // Logic to cancel an order
  }

  // Method to get orders by status and page
  getOrdersByStatusAndPage(status: string, page: number, limit: number) {
    // Logic to retrieve orders based on status and pagination
  }
}