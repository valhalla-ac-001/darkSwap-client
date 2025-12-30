import { calcNullifier, DarkSwapMessage, DarkSwapNote, DarkSwapOrderNote } from '@thesingularitynetwork/darkswap-sdk';
import { deserializeDarkSwapMessage, getNoteOnChainStatusByPublicKey, getNoteOnChainStatusBySignature, hexlify32, ProSwapService, NoteOnChainStatus, serializeDarkSwapMessage } from '@thesingularitynetwork/darkswap-sdk';
import { BooknodeService } from '../common/booknode.service';
import { DarkSwapContext } from '../common/context/darkSwap.context';
import { DatabaseService } from '../common/db/database.service';
import { NoteDto } from '../common/dto/note.dto';
import { NoteService } from '../common/note.service';
import { NotesJoinService } from '../common/notesJoin.service';
import { SubgraphService } from '../common/subgraph.service';
import { getConfirmations } from '../config/networkConfig';
import { DarkSwapException } from '../exception/darkSwap.exception';
import { OrderDto } from '../orders/dto/order.dto';
import { OrderEventService } from '../orders/orderEvent.service';
import { OrderDirection, OrderStatus } from '../types';
import { bobConfirmDto } from './dto/bobConfirm.dto';

export class SettlementService {

  private static instance: SettlementService;
  private dbService: DatabaseService;
  private booknodeService: BooknodeService;
  private noteService: NoteService;
  private noteJoinService: NotesJoinService;
  private orderEventService: OrderEventService;
  private subgraphService: SubgraphService;
  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.booknodeService = BooknodeService.getInstance();
    this.noteService = NoteService.getInstance();
    this.noteJoinService = NotesJoinService.getInstance();
    this.orderEventService = OrderEventService.getInstance();
    this.subgraphService = SubgraphService.getInstance();
  }

  public static getInstance(): SettlementService {
    if (!SettlementService.instance) {
      SettlementService.instance = new SettlementService();
    }
    return SettlementService.instance;
  }

  private async checkBobNoteStatus(darkSwapContext: DarkSwapContext, darkSwapMessage: DarkSwapMessage) {
    const onChainStatus = await getNoteOnChainStatusByPublicKey(darkSwapContext.darkSwap, darkSwapMessage.orderNote, darkSwapMessage.publicKey);
    if (onChainStatus != NoteOnChainStatus.ACTIVE) {
      throw new DarkSwapException("counter party's note is not valid");
    }
  }

  private noteDtoToNote(noteDto: NoteDto): DarkSwapNote {
    return {
      note: noteDto.note,
      rho: noteDto.rho,
      asset: noteDto.asset,
      amount: noteDto.amount,
      address: noteDto.wallet,
    } as DarkSwapNote;
  }

  async aliceSwap(orderInfo: OrderDto) {
    await this.orderEventService.logOrderStatusChange(orderInfo.orderId, orderInfo.wallet, orderInfo.chainId, OrderStatus.MATCHED);

    const matchedOrderDto = await this.booknodeService.getMatchedOrderDetails(orderInfo);
    const bobSwapMessage = deserializeDarkSwapMessage(matchedOrderDto.bobSwapMessage);

    const darkSwapContext = await DarkSwapContext.createDarkSwapContext(orderInfo.chainId, orderInfo.wallet);
    //check note status

    const rawNote = await this.dbService.getNoteByCommitment(orderInfo.noteCommitment);
    const orderNote = this.noteDtoToNote(rawNote);
    const aliceNoteOnChainStatus = await getNoteOnChainStatusBySignature(
      darkSwapContext.darkSwap,
      orderNote,
      darkSwapContext.signature
    );
    if (aliceNoteOnChainStatus != NoteOnChainStatus.ACTIVE) {
      const aliceNullifier = orderInfo.nullifier;
      const bobNullifier = hexlify32(calcNullifier(bobSwapMessage.orderNote.rho, bobSwapMessage.publicKey));
      const subgraphData = await this.subgraphService.getSwapTxByNullifiers(orderInfo.chainId, aliceNullifier, bobNullifier);
      if (subgraphData) {
        console.log('Order settle recovered for ', orderInfo.orderId);
        const incomingNoteDto = await this.dbService.getNoteByCommitment(BigInt(subgraphData.aliceInNote).toString());
        const incomingNote = this.noteDtoToNote(incomingNoteDto);
        const unprocessedNotes = [incomingNote];
        if (BigInt(subgraphData.aliceChangeNote) !== 0n) {
          const changeNoteDto = await this.dbService.getNoteByCommitment(BigInt(subgraphData.aliceChangeNote).toString());
          const changeNote = this.noteDtoToNote(changeNoteDto);
          unprocessedNotes.push(changeNote);
        }
        await this.updateAliceOrderData(orderInfo, { ...orderNote, feeRatio: BigInt(orderInfo.feeRatio) }, unprocessedNotes, darkSwapContext, subgraphData.txHash);
        return;
      }
      throw new DarkSwapException(`Order Note ${orderNote.note} is not active and no settlement transaction found`);
    }

    await this.checkBobNoteStatus(darkSwapContext, bobSwapMessage);

    const assetPair = await this.dbService.getAssetPairById(orderInfo.assetPairId, orderInfo.chainId);
    const bobAsset = orderInfo.orderDirection === OrderDirection.BUY ? assetPair.quoteAddress : assetPair.baseAddress;

    const proSwapService = new ProSwapService(darkSwapContext.relayerDarkSwap);
    const { context, swapInNote, changeNote } = await proSwapService.prepare(
      darkSwapContext.walletAddress,
      { ...orderNote, feeRatio: BigInt(orderInfo.feeRatio) },
      bobSwapMessage.address,
      bobSwapMessage,
      darkSwapContext.signature);

    const notesToAdd = [swapInNote];
    if (changeNote.amount !== 0n) {
      notesToAdd.push(changeNote);
    }
    this.noteService.addNotes(notesToAdd, darkSwapContext, false);
    this.dbService.updateOrderIncomingNoteCommitment(orderInfo.orderId, swapInNote.note);

    const tx = await proSwapService.execute(context);

    const receipt = await darkSwapContext.relayerDarkSwap.provider.waitForTransaction(tx, getConfirmations(darkSwapContext.chainId));
    if (receipt.status !== 1) {
      throw new DarkSwapException("pro swap failed with tx hash " + tx);
    }

    await this.updateAliceOrderData(orderInfo, { ...orderNote, feeRatio: BigInt(orderInfo.feeRatio) }, notesToAdd, darkSwapContext, tx);
  }

  private async updateAliceOrderData(order: OrderDto, aliceOutNote: DarkSwapOrderNote, aliceInNotes: DarkSwapNote[], darkSwapContext: DarkSwapContext, txHash: string) {
    this.noteService.setNoteUsed(aliceOutNote, darkSwapContext);

    await this.dbService.updateOrderSettlementTransaction(order.orderId, txHash);
    await this.booknodeService.settleOrder(order, txHash);
    console.log('Order settled for ', order.orderId);
    await this.orderEventService.logOrderStatusChange(order.orderId, order.wallet, order.chainId, OrderStatus.SETTLED);

    for (const note of aliceInNotes) {
      if (note && note.amount !== 0n) {
        await this.noteService.setNoteActive(note, darkSwapContext, txHash);
        await this.noteJoinService.getCurrentBalanceNote(darkSwapContext, note.asset);
      }
    }
  }

  async bobPostSettlement(orderInfo: OrderDto, txHash: string) {
    //TODO 
    const outgoingNote = await this.dbService.getNoteByCommitment(orderInfo.noteCommitment);
    const darkSwapContext = await DarkSwapContext.createDarkSwapContext(orderInfo.chainId, orderInfo.wallet);
    this.noteService.setNoteUsed(this.noteDtoToNote(outgoingNote), darkSwapContext);
    await this.dbService.updateOrderSettlementTransaction(orderInfo.orderId, txHash);
    if (orderInfo.incomingNoteCommitment) {
      const incomingNote = await this.dbService.getNoteByCommitment(orderInfo.incomingNoteCommitment);
      await this.noteService.setNoteActive(this.noteDtoToNote(incomingNote), darkSwapContext, txHash);
      await this.noteJoinService.getCurrentBalanceNote(darkSwapContext, incomingNote.asset, [this.noteDtoToNote(incomingNote)]);
    }
    console.log('Post settlement for ', orderInfo.orderId);
    await this.orderEventService.logOrderStatusChange(orderInfo.orderId, orderInfo.wallet, orderInfo.chainId, OrderStatus.SETTLED);
    await this.booknodeService.bobPostSettlement({
      orderId: orderInfo.orderId,
      wallet: orderInfo.wallet,
      chainId: orderInfo.chainId,
    });
  }

  async matchedForAlice(orderInfo: OrderDto) {
    if (orderInfo.status === OrderStatus.OPEN) {
      await this.orderEventService.logOrderStatusChange(orderInfo.orderId, orderInfo.wallet, orderInfo.chainId, OrderStatus.MATCHED);
      await this.dbService.updateOrderMatched(orderInfo.orderId);
    } else {
      console.log('Order ', orderInfo.orderId, ' is not in open status', orderInfo.status);
    }
  }

  async bobConfirm(orderInfo: OrderDto) {
    const assetPair = await this.dbService.getAssetPairById(orderInfo.assetPairId, orderInfo.chainId);

    const rawNote = await this.dbService.getNoteByCommitment(orderInfo.noteCommitment);
    const orderNote = {
      note: rawNote.note,
      rho: rawNote.rho,
      asset: rawNote.asset,
      amount: rawNote.amount,
      feeRatio: BigInt(orderInfo.feeRatio),
      address: orderInfo.wallet
    } as DarkSwapOrderNote;

    const swapInAsset = orderNote.asset === assetPair.quoteAddress ? assetPair.baseAddress : assetPair.quoteAddress;

    const darkSwapContext = await DarkSwapContext.createDarkSwapContext(orderInfo.chainId, orderInfo.wallet);
    const darkSwapMessage = await ProSwapService.prepareProSwapMessageForBob(
      darkSwapContext.walletAddress,
      orderNote,
      BigInt(orderInfo.amountIn),
      swapInAsset,
      darkSwapContext.signature
    );

    this.noteService.addNote(darkSwapMessage.inNote, darkSwapContext, false);

    const bobConfirmDto = {
      chainId: orderInfo.chainId,
      wallet: orderInfo.wallet,
      orderId: orderInfo.orderId,
      swapMessage: serializeDarkSwapMessage(darkSwapMessage)
    } as bobConfirmDto;

    await this.booknodeService.confirmOrder(bobConfirmDto);
    console.log('Order confirmed for ', orderInfo.orderId);
    await this.orderEventService.logOrderStatusChange(orderInfo.orderId, orderInfo.wallet, orderInfo.chainId, OrderStatus.MATCHED);
  }
}