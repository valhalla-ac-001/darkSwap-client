import { DarkPoolTakerSwapMessage, generateKeyPair, Note } from '@thesingularitynetwork/darkpool-v1-proof';
import { MakerSwapService, Order } from '@thesingularitynetwork/singularity-sdk';
import { BooknodeService } from 'src/common/booknode.service';
import { OrderDirection } from 'src/types';
import { DarkpoolContext } from '../common/context/darkpool.context';
import { DatabaseService } from '../common/db/database.service';
import { ConfigLoader } from '../utils/configUtil';
import { SettlementDto } from './dto/settlement.dto';
import { TakerConfirmDto } from './dto/takerConfirm.dto';
import { ethers } from 'ethers';
import { Fr } from '@aztec/bb.js';
import { NoteService } from 'src/common/note.service';

export class SettlementService {

  private static instance: SettlementService;
  private configLoader: ConfigLoader;
  private dbService: DatabaseService;
  private booknodeService: BooknodeService;
  private noteService: NoteService;

  private constructor() {
    this.configLoader = ConfigLoader.getInstance();
    this.dbService = DatabaseService.getInstance();
    this.booknodeService = BooknodeService.getInstance();
    this.noteService = NoteService.getInstance();
  }

  public static getInstance(): SettlementService {
    if (!SettlementService.instance) {
      SettlementService.instance = new SettlementService();
    }
    return SettlementService.instance;
  }

  async makerSwap(orderId: string) {
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
    const darkPoolContext = await DarkpoolContext.createDarkpoolContext(orderInfo.chainId, orderInfo.wallet);

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
    const makerSwapService = new MakerSwapService(darkPoolContext.darkPool);
    const takerSwapMessage = this.deserializeSwapMessage(matchedOrderDto.takerSwapMessage);

    const { context, outNotes } = await makerSwapService.prepare(order, note, takerSwapMessage, darkPoolContext.signature);
    this.noteService.addNotes(outNotes, darkPoolContext);

    await makerSwapService.generateProof(context);
    const tx = await makerSwapService.execute(context);
    this.noteService.setNoteUsed(note, darkPoolContext);

    await this.dbService.updateOrderMatched(orderId);
    await this.dbService.updateOrderSettlementTransaction(orderId, tx);
    //send settle info to booknode
    settlementDto.txHashSettled = tx;

    await this.booknodeService.settleOrder(settlementDto);
  }


  async takerPostSettlement(orderId: string, txHash: string) {
    //TODO 
    const orderInfo = await this.dbService.getOrderByOrderId(orderId);
    const rawNote = await this.dbService.getNoteByCommitment(orderInfo.noteCommitment);
    this.dbService.updateNoteTransactionByWalletAndNoteCommitment(orderInfo.wallet, orderInfo.chainId, rawNote.noteCommitment, txHash);
  }

  private deserializePublicKey(publicKeyString: string): any {
    const buffer = Buffer.from(publicKeyString.replace(/^0x/i, ''), 'hex')
    return {
      x: Fr.fromBuffer(buffer.subarray(0, 32)),
      y: Fr.fromBuffer(buffer.subarray(32, 64))
    }
  }

  private deserializeSwapMessage(swapMessageString: string): DarkPoolTakerSwapMessage {
    const tmpMessage = JSON.parse(swapMessageString);
    const swapMessage = {
      outNote: {
        note: BigInt(tmpMessage.outNote.note),
        rho: BigInt(tmpMessage.outNote.rho),
        asset: tmpMessage.outNote.asset,
        amount: BigInt(tmpMessage.outNote.amount)
      },
      inNote: {
        note: BigInt(tmpMessage.inNote.note),
        rho: BigInt(tmpMessage.inNote.rho),
        asset: tmpMessage.inNote.asset,
        amount: BigInt(tmpMessage.inNote.amount)
      },
      feeAsset: tmpMessage.feeAsset,
      feeAmount: BigInt(tmpMessage.feeAmount),
      publicKey: this.deserializePublicKey(tmpMessage.publicKey),
      swapSignature: tmpMessage.swapSignature
    }
    return swapMessage;
  }


  private serializeSwapMessage(swapMessage: DarkPoolTakerSwapMessage): string {
    const tmpMessage = {
      outNote: {
        note: ethers.toBeHex(swapMessage.outNote.note),
        rho: ethers.toBeHex(swapMessage.outNote.rho),
        asset: swapMessage.outNote.asset,
        amount: ethers.toBeHex(swapMessage.outNote.amount)
      },
      inNote: {
        note: ethers.toBeHex(swapMessage.inNote.note),
        rho: ethers.toBeHex(swapMessage.inNote.rho),
        asset: swapMessage.inNote.asset,
        amount: ethers.toBeHex(swapMessage.inNote.amount)
      },
      feeAsset: swapMessage.feeAsset,
      feeAmount: ethers.toBeHex(swapMessage.feeAmount),
      publicKey: swapMessage.publicKey.toString(),
      swapSignature: swapMessage.swapSignature
    }
    return JSON.stringify(tmpMessage);
  }

  async takerSwap(orderId: string) {
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

    const makerSwapService = new MakerSwapService(darkPoolContext.darkPool);
    const { incomingNote, bobSwapMessage } = await makerSwapService.getFullMatchSwapMessage(order, note, darkPoolContext.signature);

    await this.dbService.addNote(
      darkPoolContext.chainId,
      darkPoolContext.publicKey,
      darkPoolContext.walletAddress,
      0,
      incomingNote.note,
      incomingNote.rho,
      incomingNote.asset,
      incomingNote.amount,
      '')

    const takerConfirmDto = {
      chainId: orderInfo.chainId,
      wallet: orderInfo.wallet,
      orderId: orderId,
      swapMessage: this.serializeSwapMessage(bobSwapMessage)
    } as TakerConfirmDto;

    await this.booknodeService.confirmOrder(takerConfirmDto);
  }
}