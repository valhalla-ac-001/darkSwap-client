import { DarkPoolTakerSwapMessage, Note } from '@thesingularitynetwork/darkpool-v1-proof';
import { deserializeDarkPoolTakerSwapMessage, getNoteOnChainStatusByPublicKey, getNoteOnChainStatusBySignature, MakerSwapService, NoteOnChainStatus, Order, serializeDarkPoolTakerSwapMessage } from '@thesingularitynetwork/singularity-sdk';
import { BooknodeService } from '../common/booknode.service';
import { OrderDirection, OrderStatus } from '../types';
import { DarkpoolContext } from '../common/context/darkpool.context';
import { DatabaseService } from '../common/db/database.service';
import { ConfigLoader } from '../utils/configUtil';
import { SettlementDto } from './dto/settlement.dto';
import { TakerConfirmDto } from './dto/takerConfirm.dto';
import { NoteService } from '../common/note.service';
import { DarkpoolException } from '../exception/darkpool.exception';
import { getConfirmations } from '../config/networkConfig';
import { OrderEventService } from '../orders/orderEvent.service';

export class SettlementService {

  private static instance: SettlementService;
  private configLoader: ConfigLoader;
  private dbService: DatabaseService;
  private booknodeService: BooknodeService;
  private noteService: NoteService;
  private orderEventService: OrderEventService;
  private constructor() {
    this.configLoader = ConfigLoader.getInstance();
    this.dbService = DatabaseService.getInstance();
    this.booknodeService = BooknodeService.getInstance();
    this.noteService = NoteService.getInstance();
    this.orderEventService = OrderEventService.getInstance();
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

  async makerSwap(orderId: string) {
    const orderInfo = await this.dbService.getOrderByOrderId(orderId);
    await this.orderEventService.logOrderStatusChange(orderId, orderInfo.wallet, orderInfo.chainId, OrderStatus.MATCHED);

    const rawNote = await this.dbService.getNoteByCommitment(orderInfo.noteCommitment);
    const note = {
      note: rawNote.noteCommitment,
      rho: rawNote.rho,
      asset: rawNote.asset,
      amount: rawNote.amount
    } as Note;
    
    const assetPair = await this.dbService.getAssetPairById(orderInfo.assetPairId, orderInfo.chainId);
    const takerAsset = orderInfo.orderDirection === OrderDirection.BUY ? assetPair.quoteAddress : assetPair.baseAddress;
    const darkPoolContext = await DarkpoolContext.createDarkpoolContext(orderInfo.chainId, orderInfo.wallet);

    //check note status
    const noteOnChainStatus = await getNoteOnChainStatusBySignature(
      darkPoolContext.relayerDarkPool,
      note,
      darkPoolContext.signature
    );
    if (noteOnChainStatus != NoteOnChainStatus.LOCKED) {
      throw new DarkpoolException(`Note ${note.note} is not locked`);
    }

    const settlementDto = new SettlementDto();
    settlementDto.orderId = orderId;
    settlementDto.wallet = orderInfo.wallet;
    settlementDto.chainId = orderInfo.chainId;

    const matchedOrderDto = await this.booknodeService.getMatchedOrderDetails(settlementDto);

    const order = {
      orderId: orderId,
      makerAsset: note.asset,
      makerAmount: matchedOrderDto.makerMatchedAmount,
      takerAsset: takerAsset,
      takerAmount: matchedOrderDto.takerMatchedAmount
    } as Order;

    const wallet = this.configLoader.getWallets()
      .find(w => w.address.toLowerCase() === darkPoolContext.walletAddress.toLowerCase());

    if (!wallet) {
      throw new Error(`No wallet found for address: ${darkPoolContext.walletAddress}`);
    }
    const makerSwapService = new MakerSwapService(darkPoolContext.relayerDarkPool);
    const takerSwapMessage = deserializeDarkPoolTakerSwapMessage(matchedOrderDto.takerSwapMessage);
    await this.checkTakerNoteStatus(darkPoolContext, takerSwapMessage);
    
    const { context, outNotes } = await makerSwapService.prepare(order, note, takerSwapMessage, darkPoolContext.signature);
    this.noteService.addNotes(outNotes, darkPoolContext);

    await makerSwapService.generateProof(context);
    const tx = await makerSwapService.execute(context);
    const receipt = await darkPoolContext.relayerDarkPool.provider.waitForTransaction(tx, getConfirmations(darkPoolContext.chainId));
    if (receipt.status !== 1) {
      throw new Error("Maker swap failed");
    }

    this.noteService.setNoteUsed(note, darkPoolContext);
    this.noteService.setNotesActive(outNotes, darkPoolContext, tx);

    await this.dbService.updateOrderMatched(orderId);
    await this.dbService.updateOrderSettlementTransaction(orderId, tx);
    //send settle info to booknode
    settlementDto.txHashSettled = tx;

    await this.booknodeService.settleOrder(settlementDto);
    console.log('Order settled for ', orderId);
    await this.orderEventService.logOrderStatusChange(orderId, orderInfo.wallet, orderInfo.chainId, OrderStatus.SETTLED);
  }

  async takerPostSettlement(orderId: string, txHash: string) {
    //TODO 
    const orderInfo = await this.dbService.getOrderByOrderId(orderId);
    const outgoingNote = await this.dbService.getNoteByCommitment(orderInfo.noteCommitment);
    const darkPoolContext = await DarkpoolContext.createDarkpoolContext(orderInfo.chainId, orderInfo.wallet);
    this.noteService.setNoteUsed({
      note: outgoingNote.noteCommitment,
      rho: outgoingNote.rho,
      asset: outgoingNote.asset,
      amount: outgoingNote.amount
    } as Note, darkPoolContext);
    if (orderInfo.incomingNoteCommitment) {
      const incomingNote = await this.dbService.getNoteByCommitment(orderInfo.incomingNoteCommitment);
      this.dbService.updateNoteTransactionByWalletAndNoteCommitment(orderInfo.wallet, orderInfo.chainId, incomingNote.noteCommitment, txHash);
    }
    console.log('Post settlement for ', orderId);
    await this.orderEventService.logOrderStatusChange(orderId, orderInfo.wallet, orderInfo.chainId, OrderStatus.SETTLED);
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

    const settlementDto = new SettlementDto();
    settlementDto.orderId = orderId;
    settlementDto.wallet = orderInfo.wallet;
    settlementDto.chainId = orderInfo.chainId;

    const matchedOrderDto = await this.booknodeService.getMatchedOrderDetails(settlementDto);

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