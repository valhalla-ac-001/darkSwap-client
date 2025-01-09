import { Note } from '@thesingularitynetwork/darkpool-v1-proof';
import { DatabaseService } from '../common/db/database.service';
import { DarkpoolContext } from '../common/context/darkpool.context';
import { MakerSwapService, Order} from '@thesingularitynetwork/singularity-sdk';
import { SettlementDto } from './dto/settlement.dto';
import { MatchedOrderDto } from './dto/matchedOder.dto';
import { TakerConfirmDto } from './dto/takerConfirm.dto';
import { ConfigLoader } from '../utils/configUtil';
import axios from 'axios';

export class SettlementService {

  private static instance: SettlementService;
  private configLoader: ConfigLoader;
  private dbService: DatabaseService;

  private constructor() {
    this.configLoader = ConfigLoader.getInstance();
    this.dbService = DatabaseService.getInstance();
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
    const assetPair = await this.dbService.getAssetPairById(orderInfo.assetPairId);
    const takerAsset = orderInfo.orderDirection === 0 ? assetPair.assetB : assetPair.assetA;
    const darkPoolContext = await DarkpoolContext.createDarkpoolContext(orderInfo.chainId, orderInfo.wallet);

    const settlementDto = new SettlementDto();
    settlementDto.orderId = orderId;
    settlementDto.wallet = orderInfo.wallet;
    settlementDto.chainId = orderInfo.chainId;

    const result = await axios.post(`${this.configLoader.getConfig().bookNodeApiUrl}/order/getOrderMatchDetails`, settlementDto,{
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.configLoader.getConfig().bookNodeApiKey}`
      }
    });

    const matchedOrderDto = result.data as MatchedOrderDto;
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
    const takerSwapMessage = await makerSwapService.decryptSwapMessageWithPrivateKey(wallet.privateKey, matchedOrderDto.takerSwapMessage)
    const {context, outNotes } = await makerSwapService.prepare(order, note, takerSwapMessage, darkPoolContext.signature);
    await makerSwapService.generateProof(context);
    const tx = await makerSwapService.execute(context);

    await this.dbService.updateOrderMatched(orderId);
    await this.dbService.updateOrderSettlementTransaction(orderId, tx);
    //send settle info to booknode
    settlementDto.txHashSettled = tx;

    await axios.post(`${this.configLoader.getConfig().bookNodeApiUrl}/order/settle`, settlementDto,{
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.configLoader.getConfig().bookNodeApiKey}`
      }
    });
  }

  async takerSwap(orderId: string){
    const orderInfo = await this.dbService.getOrderByOrderId(orderId);
    const rawNote = await this.dbService.getNoteByCommitment(orderInfo.noteCommitment);
    const note = {
      note: rawNote.noteCommitment,
      rho: rawNote.rho,
      asset: rawNote.asset,
      amount: rawNote.amount
    } as Note;
    const assetPair = await this.dbService.getAssetPairById(orderInfo.assetPairId);
    const takerAsset = orderInfo.orderDirection === 0 ? assetPair.assetB : assetPair.assetA;
    const makerAsset = orderInfo.orderDirection === 0 ? assetPair.assetA : assetPair.assetB;
    const darkPoolContext = await DarkpoolContext.createDarkpoolContext(orderInfo.chainId, orderInfo.wallet);

    const settlementDto = new SettlementDto();
    settlementDto.orderId = orderId;
    settlementDto.wallet = orderInfo.wallet;
    settlementDto.chainId = orderInfo.chainId;

    const result = await axios.post(`${this.configLoader.getConfig().bookNodeApiUrl}/order/getOrderMatchDetails`, settlementDto,{
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.configLoader.getConfig().bookNodeApiKey}`
      }
    });

    const matchedOrderDto = result.data as MatchedOrderDto;
    const order = {
      orderId: orderId,
      makerAsset: makerAsset,
      makerAmount: matchedOrderDto.makerMatchedAmount,
      takerAsset: takerAsset,
      takerAmount: matchedOrderDto.takerMatchedAmount
    } as Order;

    const makerSwapService = new MakerSwapService(darkPoolContext.darkPool);
    const {incomingNote,bobSwapMessage}= await makerSwapService.getFullMatchSwapMessage(order, note, darkPoolContext.signature);
    const takerSwapMessage = await makerSwapService.encryptSwapMessageWithPublicKey(bobSwapMessage, matchedOrderDto.makerPublicKey);
    matchedOrderDto.takerSwapMessage = takerSwapMessage;

    const id = await this.dbService.addNote(
      darkPoolContext.chainId, 
      darkPoolContext.publicKey, 
      darkPoolContext.walletAddress, 
      0, 
      incomingNote.note,
      incomingNote.rho, 
      incomingNote.asset,
      incomingNote.amount,
      3,
      '')
    
    const takerConfirmDto = {
      chainId: orderInfo.chainId,
      wallet: orderInfo.wallet,
      orderId: orderId,
      swapMessage: takerSwapMessage
    } as TakerConfirmDto;

    await axios.post(`${this.configLoader.getConfig().bookNodeApiUrl}/order/confirm`, takerConfirmDto,{
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.configLoader.getConfig().bookNodeApiKey}`
      }
    });
  }
}