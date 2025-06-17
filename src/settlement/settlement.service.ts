import { calcNullifier, DarkPoolTakerSwapMessage, getNullifier, Note } from '@thesingularitynetwork/darkswap-sdk';
import { deserializeDarkPoolTakerSwapMessage, getNoteOnChainStatusByPublicKey, getNoteOnChainStatusBySignature, hexlify32, MakerSwapService, NoteOnChainStatus, Order, serializeDarkPoolTakerSwapMessage } from '@thesingularitynetwork/singularity-sdk';
import { BooknodeService } from '../common/booknode.service';
import { DarkSwapContext } from '../common/context/darkSwap.context';
import { DatabaseService } from '../common/db/database.service';
import { NoteDto } from '../common/dto/note.dto';
import { NoteService } from '../common/note.service';
import { SubgraphService } from '../common/subgraph.service';
import { getConfirmations } from '../config/networkConfig';
import { DarkSwapException } from '../exception/darkSwap.exception';
import { OrderDto } from '../orders/dto/order.dto';
import { OrderEventService } from '../orders/orderEvent.service';
import { OrderDirection, OrderStatus } from '../types';
import { TakerConfirmDto } from './dto/takerConfirm.dto';
import { WalletMutexService } from '../common/mutex/walletMutex.service';
export class SettlementService {

  private static instance: SettlementService;
  private dbService: DatabaseService;
  private booknodeService: BooknodeService;
  private noteService: NoteService;
  private orderEventService: OrderEventService;
  private subgraphService: SubgraphService;
  private walletMutexService: WalletMutexService;
  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.booknodeService = BooknodeService.getInstance();
    this.noteService = NoteService.getInstance();
    this.orderEventService = OrderEventService.getInstance();
    this.subgraphService = SubgraphService.getInstance();
    this.walletMutexService = WalletMutexService.getInstance();
  }

  public static getInstance(): SettlementService {
    if (!SettlementService.instance) {
      SettlementService.instance = new SettlementService();
    }
    return SettlementService.instance;
  }

  private async checkTakerNoteStatus(darkPoolContext: DarkpoolContext, takerSwapMessage: DarkPoolTakerSwapMessage) {
    const onChainStatus = await getNoteOnChainStatusByPublicKey(darkPoolContext.relayerDarkPool, takerSwapMessage.outNote, takerSwapMessage.publicKey);
    if (onChainStatus != NoteOnChainStatus.LOCKED) {
      throw new DarkpoolException("Taker note is not locked");
    }
  }

  private noteDtoToNote(noteDto: NoteDto): Note {
    return {
      note: noteDto.noteCommitment,
      rho: noteDto.rho,
      asset: noteDto.asset,
      amount: noteDto.amount
    } as Note;
  }

  async makerSwap(orderId: string) {
    const orderInfo = await this.dbService.getOrderByOrderId(orderId);
    await this.orderEventService.logOrderStatusChange(orderId, orderInfo.wallet, orderInfo.chainId, OrderStatus.MATCHED);

    const matchedOrderDto = await this.booknodeService.getMatchedOrderDetails(orderInfo);
    const takerSwapMessage = deserializeDarkPoolTakerSwapMessage(matchedOrderDto.takerSwapMessage);



    const darkPoolContext = await DarkpoolContext.createDarkpoolContext(orderInfo.chainId, orderInfo.wallet);
    //check note status

    const rawNote = await this.dbService.getNoteByCommitment(orderInfo.noteCommitment);
    const note = this.noteDtoToNote(rawNote);
    const makerNoteOnChainStatus = await getNoteOnChainStatusBySignature(
      darkPoolContext.relayerDarkPool,
      note,
      darkPoolContext.signature
    );
    if (makerNoteOnChainStatus != NoteOnChainStatus.LOCKED) {
      const makerNullifier = await getNullifier({
        rho: note.rho,
        signedMessage: darkPoolContext.signature
      });
      const takerNullifier = hexlify32(calcNullifier(takerSwapMessage.outNote.rho, takerSwapMessage.publicKey));
      const subgraphData = await this.subgraphService.getSwapTxByNullifiers(orderInfo.chainId, makerNullifier, takerNullifier);
      if (subgraphData) {
        console.log('Order settle recovered for ', orderId);
        const incomingNoteDto = await this.dbService.getNoteByCommitment(BigInt(subgraphData.makerInNote).toString());
        const incomingNote = this.noteDtoToNote(incomingNoteDto);
        await this.updateMakerOrderData(orderInfo, note, incomingNote, darkPoolContext, subgraphData.txHash);
        return;
      }
      throw new DarkpoolException(`Note ${note.note} is not locked and no settlement transaction found`);
    }

    await this.checkTakerNoteStatus(darkPoolContext, takerSwapMessage);

    const assetPair = await this.dbService.getAssetPairById(orderInfo.assetPairId, orderInfo.chainId);
    const takerAsset = orderInfo.orderDirection === OrderDirection.BUY ? assetPair.quoteAddress : assetPair.baseAddress;

    const order = {
      orderId: orderId,
      makerAsset: note.asset,
      makerAmount: matchedOrderDto.makerMatchedAmount,
      takerAsset: takerAsset,
      takerAmount: matchedOrderDto.takerMatchedAmount
    } as Order;
    const makerSwapService = new MakerSwapService(darkPoolContext.relayerDarkPool);
    const { context, outNotes } = await makerSwapService.prepare(order, note, takerSwapMessage, darkPoolContext.signature);
    this.noteService.addNotes(outNotes, darkPoolContext);
    this.dbService.updateOrderIncomingNoteCommitment(orderId, outNotes[0].note);

    await makerSwapService.generateProof(context);
    const mutex = this.walletMutexService.getMutex(darkPoolContext.walletAddress.toLowerCase());
    const tx = await mutex.runExclusive(async () => {
      return await makerSwapService.execute(context);
    });
    const receipt = await darkPoolContext.relayerDarkPool.provider.waitForTransaction(tx, getConfirmations(darkPoolContext.chainId));
    if (receipt.status !== 1) {
      throw new DarkpoolException("Maker swap failed with tx hash " + tx);
    }

    await this.updateMakerOrderData(orderInfo, note, outNotes[0], darkPoolContext, tx);
  }

  private async updateMakerOrderData(order: OrderDto, makerOutNote: Note, makerInNote: Note, darkPoolContext: DarkpoolContext, txHash: string) {
    this.noteService.setNoteUsed(makerOutNote, darkPoolContext);
    this.noteService.setNotesActive([makerInNote], darkPoolContext, txHash);

    await this.dbService.updateOrderSettlementTransaction(order.orderId, txHash);
    //send settle info to booknode
    await this.booknodeService.settleOrder(order, txHash);
    console.log('Order settled for ', order.orderId);
    await this.orderEventService.logOrderStatusChange(order.orderId, order.wallet, order.chainId, OrderStatus.SETTLED);
  }

  async takerPostSettlement(orderId: string, txHash: string) {
    //TODO 
    const orderInfo = await this.dbService.getOrderByOrderId(orderId);
    const outgoingNote = await this.dbService.getNoteByCommitment(orderInfo.noteCommitment);
    const darkPoolContext = await DarkpoolContext.createDarkpoolContext(orderInfo.chainId, orderInfo.wallet);
    this.noteService.setNoteUsed(this.noteDtoToNote(outgoingNote), darkPoolContext);
    if (orderInfo.incomingNoteCommitment) {
      const incomingNote = await this.dbService.getNoteByCommitment(orderInfo.incomingNoteCommitment);
      this.dbService.updateNoteTransactionByWalletAndNoteCommitment(orderInfo.wallet, orderInfo.chainId, incomingNote.noteCommitment, txHash);
    }
    console.log('Post settlement for ', orderId);
    await this.orderEventService.logOrderStatusChange(orderId, orderInfo.wallet, orderInfo.chainId, OrderStatus.SETTLED);
  }

  async matchedForMaker(orderId: string) {
    const orderInfo = await this.dbService.getOrderByOrderId(orderId);
    if (orderInfo && orderInfo.status === OrderStatus.OPEN) {
      await this.orderEventService.logOrderStatusChange(orderId, orderInfo.wallet, orderInfo.chainId, OrderStatus.MATCHED);
      await this.dbService.updateOrderMatched(orderId);
    } else {
      console.log('Order ', orderId, ' is not in open status', orderInfo.status);
    }
  }

  async takerConfirm(orderId: string) {
    const orderInfo = await this.dbService.getOrderByOrderId(orderId);
    const rawNote = await this.dbService.getNoteByCommitment(orderInfo.noteCommitment);
    const note = {
      note: rawNote.noteCommitment,
      rho: rawNote.rho,
      asset: rawNote.asset,
      amount: rawNote.amount
    } as Note;
    const assetPair = await this.dbService.getAssetPairById(orderInfo.assetPairId, orderInfo.chainId);
    const takerAsset = orderInfo.orderDirection === OrderDirection.BUY ? assetPair.quoteAddress : assetPair.baseAddress;
    const makerAsset = orderInfo.orderDirection === OrderDirection.BUY ? assetPair.baseAddress : assetPair.quoteAddress;
    const darkPoolContext = await DarkpoolContext.createDarkpoolContext(orderInfo.chainId, orderInfo.wallet);

    const matchedOrderDto = await this.booknodeService.getMatchedOrderDetails(orderInfo);

    const order = {
      orderId: orderId,
      makerAsset: makerAsset,
      makerAmount: matchedOrderDto.makerMatchedAmount,
      takerAsset: takerAsset,
      takerAmount: matchedOrderDto.takerMatchedAmount
    } as Order;

    const makerSwapService = new MakerSwapService(darkPoolContext.relayerDarkPool);
    const { incomingNote, bobSwapMessage } = await makerSwapService.getFullMatchSwapMessage(order, note, darkPoolContext.signature);

    this.noteService.addNotes([incomingNote], darkPoolContext);

    const takerConfirmDto = {
      chainId: orderInfo.chainId,
      wallet: orderInfo.wallet,
      orderId: orderId,
      swapMessage: serializeDarkPoolTakerSwapMessage(bobSwapMessage)
    } as TakerConfirmDto;

    await this.booknodeService.confirmOrder(takerConfirmDto);
    console.log('Order confirmed for ', orderId);
    await this.orderEventService.logOrderStatusChange(orderId, orderInfo.wallet, orderInfo.chainId, OrderStatus.MATCHED);
  }
}