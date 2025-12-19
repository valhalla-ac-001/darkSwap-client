import Database from 'better-sqlite3';
import config from '../../config/dbConfig';
import { NoteDto } from '../dto/note.dto';
import { AssetPairDto } from '../dto/assetPair.dto';
import { OrderDto } from '../../orders/dto/order.dto';
import { ConfigLoader } from '../../utils/configUtil';
import { NoteStatus, OrderStatus, NoteType } from '../../types';
import { OrderEventDto } from '../../orders/dto/orderEvent.dto';


interface NoteEntity {
  id: number;
  chainId: number;
  publicKey: string;
  wallet: string;
  type: number;
  noteCommitment: string;
  rho: string;
  asset: string;
  amount: string;
  status: number;
  txHashCreated: string;
  createdAt: Date;
  updatedAt: Date;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private db: Database.Database;

  private constructor() {
    const dbFilePath = ConfigLoader.getInstance().getConfig().dbFilePath;
    this.db = new Database(dbFilePath)
    this.init();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async init() {
    for (const table of config.tables) {
      this.db.exec(table);
    }
  }

  // Note operations
  public addNote(
    chainId: number,
    publicKey: string,
    walletAddress: string,
    type: number,
    noteCommitment: bigint,
    rho: bigint,
    asset: string,
    amount: bigint,
    txHashCreated: string): number {
    const query = `INSERT INTO NOTES (
      chainId, publicKey, wallet, type, noteCommitment, 
      rho, asset, amount, status, txHashCreated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const stmt = this.db.prepare(query);
    const result = stmt.run(
      chainId, 
      publicKey, 
      walletAddress.toLowerCase(), 
      type, 
      noteCommitment.toString(), 
      rho.toString(), 
      asset.toLowerCase(), 
      amount.toString(), 
      NoteStatus.CREATED, 
      txHashCreated);
    return Number(result.lastInsertRowid);
  }

  public getAssetNotesByWalletAndChainIdAndAsset(walletAddress: string, chainId: number, asset: string): NoteDto[] {
    const query = `SELECT * FROM NOTES WHERE wallet = ? AND chainId = ? AND asset = ? AND status = ? AND type = ?`;
    const stmt = this.db.prepare(query);
    const rows = stmt.all(walletAddress.toLowerCase(), chainId, asset.toLowerCase(), NoteStatus.ACTIVE, NoteType.DARKSWAP) as NoteEntity[];

    const notes = rows.map(row => ({
      id: row.id,
      chainId: row.chainId,
      publicKey: row.publicKey,
      wallet: row.wallet,
      type: row.type,
      note: BigInt(row.noteCommitment),
      rho: BigInt(row.rho),
      asset: row.asset.toLowerCase(),
      amount: BigInt(row.amount),
      status: row.status,
      txHashCreated: row.txHashCreated,
    }));

    return notes;
  }


  public async getNotesByWalletAndChainIdAndAsset(walletAddress: string, chainId: number, asset: string): Promise<NoteDto[]> {
    const query = `SELECT * FROM NOTES WHERE wallet = ? AND chainId = ? AND asset = ? AND (status = ? OR status = ?)`;
    const stmt = this.db.prepare(query);
    const rows = stmt.all(walletAddress.toLowerCase(), chainId, asset.toLowerCase(), NoteStatus.ACTIVE, NoteStatus.CREATED) as NoteEntity[];

    const notes = rows.map(row => ({
      id: row.id,
      chainId: row.chainId,
      publicKey: row.publicKey,
      wallet: row.wallet,
      type: row.type,
      note: BigInt(row.noteCommitment),
      rho: BigInt(row.rho),
      asset: row.asset.toLowerCase(),
      amount: BigInt(row.amount.toString()),
      status: row.status,
      txHashCreated: row.txHashCreated,
    }));

    return notes;
  }

    public async getAssetsNotesByWalletAndChainId(walletAddress: string, chainId: number): Promise<NoteDto[]> {
    const query = `SELECT * FROM NOTES WHERE wallet = ? AND chainId = ? AND (status = ? OR status = ?) AND type = ?`;
    const stmt = this.db.prepare(query);
    const rows = stmt.all(walletAddress.toLowerCase(), chainId, NoteStatus.ACTIVE, NoteStatus.LOCKED, NoteType.DARKSWAP) as NoteEntity[];

    const notes = rows.map(row => ({
      id: row.id,
      chainId: row.chainId,
      publicKey: row.publicKey,
      wallet: row.wallet,
      type: row.type,
      note: BigInt(row.noteCommitment),
      rho: BigInt(row.rho),
      asset: row.asset.toLowerCase(),
      amount: BigInt(row.amount.toString()),
      status: row.status,
      txHashCreated: row.txHashCreated,
    }));

    return notes;
  }


  public async getNotesByWalletAndChainId(walletAddress: string, chainId: number): Promise<NoteDto[]> {
    const query = `SELECT * FROM NOTES WHERE wallet = ? AND chainId = ? AND (status = ? OR status = ?)`;
    const stmt = this.db.prepare(query);
    const rows = stmt.all(walletAddress.toLowerCase(), chainId, NoteStatus.ACTIVE, NoteStatus.CREATED) as NoteEntity[];

    const notes = rows.map(row => ({
      id: row.id,
      chainId: row.chainId,
      publicKey: row.publicKey,
      wallet: row.wallet,
      type: row.type,
      note: BigInt(row.noteCommitment),
      rho: BigInt(row.rho),
      asset: row.asset.toLowerCase(),
      amount: BigInt(row.amount.toString()),
      status: row.status,
      txHashCreated: row.txHashCreated,
    }));

    return notes;
  }

  public async getNotesByWallet(walletAddress: string): Promise<NoteDto[]> {
    const query = `SELECT * FROM NOTES WHERE wallet = ? AND (status = ? OR status = ?)`;
    const stmt = this.db.prepare(query);
    const rows = stmt.all(walletAddress.toLowerCase(), NoteStatus.ACTIVE, NoteStatus.LOCKED) as NoteEntity[];

    const notes = rows.map(row => ({
      id: row.id,
      chainId: row.chainId,
      publicKey: row.publicKey,
      wallet: row.wallet,
      type: row.type,
      note: BigInt(row.noteCommitment),
      rho: BigInt(row.rho),
      asset: row.asset.toLowerCase(),
      amount: BigInt(row.amount.toString()),
      status: row.status,
      txHashCreated: row.txHashCreated,
    }));

    return notes;
  }

  public async getNotesByAsset(asset: string, chainId: number): Promise<NoteDto[]> {
    const query = `SELECT * FROM NOTES WHERE asset = ? AND chainId = ? AND status = ? ORDER BY amount DESC`;
    const stmt = this.db.prepare(query);
    const rows = stmt.all(asset.toLowerCase(), chainId, NoteStatus.ACTIVE) as NoteEntity[];

    const notes = rows.map(row => ({
      id: row.id,
      chainId: row.chainId,
      publicKey: row.publicKey,
      wallet: row.wallet,
      type: row.type,
      note: BigInt(row.noteCommitment),
      rho: BigInt(row.rho),
      asset: row.asset,
      amount: BigInt(row.amount.toString()),
      status: row.status,
      txHashCreated: row.txHashCreated
    }));

    return notes;
  }

  public async getNoteByCommitment(noteCommitment: string): Promise<NoteDto> {
    const query = `SELECT * FROM NOTES WHERE noteCommitment = ?`;
    const stmt = this.db.prepare(query);
    const row = stmt.get(noteCommitment) as NoteEntity;
    const note = {
      id: row.id,
      chainId: row.chainId,
      publicKey: row.publicKey,
      wallet: row.wallet,
      type: row.type,
      note: BigInt(row.noteCommitment),
      rho: BigInt(row.rho),
      asset: row.asset,
      amount: BigInt(row.amount.toString()),
      status: row.status,
      txHashCreated: row.txHashCreated
    };
    return note;
  }

  public async getNoteByOrderId(orderId: string): Promise<NoteDto> {
    const query = `SELECT * FROM NOTES WHERE orderId = ?`;
    const stmt = this.db.prepare(query);
    const row = stmt.get(orderId) as NoteEntity;
    const note = {
      id: row.id,
      chainId: row.chainId,
      publicKey: row.publicKey,
      wallet: row.wallet,
      type: row.type,
      note: BigInt(row.noteCommitment),
      rho: BigInt(row.rho),
      asset: row.asset,
      amount: BigInt(row.amount.toString()),
      status: row.status,
      txHashCreated: row.txHashCreated
    };
    return note;
  }

  public async getNoteByAssetAndAmount(asset: string, amount: bigint, chainId: number): Promise<NoteDto[]> {
    const query = `SELECT * FROM NOTES WHERE asset = ? AND amount =? chainId = ? AND status = ? ORDER BY amount DESC`;
    const stmt = this.db.prepare(query);
    const rows = stmt.all(asset, amount.toString(), chainId, NoteStatus.ACTIVE) as NoteEntity[];

    const notes = rows.map(row => ({
      id: row.id,
      chainId: row.chainId,
      publicKey: row.publicKey,
      wallet: row.wallet,
      type: row.type,
      note: BigInt(row.noteCommitment),
      rho: BigInt(row.rho),
      asset: row.asset,
      amount: BigInt(row.amount.toString()),
      status: row.status,
      txHashCreated: row.txHashCreated,
    }));

    return notes;
  }

  public updateNoteTransactionAndStatus(id: number, txHash: string) {
    const query = `UPDATE NOTES SET txHashCreated = ?, status = ? WHERE id = ?`;
    const stmt = this.db.prepare(query);
    stmt.run(txHash, NoteStatus.ACTIVE, id);
  }

  private async updateNoteStatus(wallet: string, chainId: number, noteCommitment: bigint, status: number) {
    const query = `UPDATE NOTES SET status = ? WHERE wallet = ? AND chainId = ? AND noteCommitment = ?`;
    const stmt = this.db.prepare(query);
    stmt.run(status, wallet.toLowerCase(), chainId, noteCommitment.toString());
  }

  public async updateNoteTransactionByWalletAndNoteCommitment(wallet: string, chainId: number, noteCommitment: bigint, txHash: string) {
    const query = `UPDATE NOTES SET txHashCreated = ?, status = ? WHERE wallet = ? AND chainId = ? AND noteCommitment = ?`;
    const stmt = this.db.prepare(query);
    stmt.run(txHash, NoteStatus.ACTIVE, wallet.toLowerCase(), chainId, noteCommitment.toString());
  }

  public async updateNoteCreatedByWalletAndNoteCommitment(wallet: string, chainId: number, noteCommitment: bigint) {
    const query = `UPDATE NOTES SET status = ? WHERE wallet = ? AND chainId = ? AND noteCommitment = ?`;
    const stmt = this.db.prepare(query);
    stmt.run(NoteStatus.CREATED, wallet.toLowerCase(), chainId, noteCommitment.toString());
  }

  public async updateNoteActiveByWalletAndNoteCommitment(wallet: string, chainId: number, noteCommitment: bigint) {
    const query = `UPDATE NOTES SET status = ? WHERE wallet = ? AND chainId = ? AND noteCommitment = ?`;
    const stmt = this.db.prepare(query);
    stmt.run(NoteStatus.ACTIVE, wallet.toLowerCase(), chainId, noteCommitment.toString());
  }



  public updateNoteSpentByWalletAndNoteCommitment(wallet: string, chainId: number, noteCommitment: bigint) {
    this.updateNoteStatus(wallet, chainId, noteCommitment, NoteStatus.SPENT);
  }

  public updateNoteLockedByWalletAndNoteCommitment(wallet: string, chainId: number, noteCommitment: bigint) {
    this.updateNoteStatus(wallet, chainId, noteCommitment, NoteStatus.LOCKED);
  }

  // Asset pair operations
  public async addAssetPair(assetPair: AssetPairDto) {
    const query = `INSERT INTO ASSET_PAIRS ( id, chainId, baseAddress, baseSymbol, baseDecimal, quoteAddress, quoteSymbol, quoteDecimal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const stmt = this.db.prepare(query);
    stmt.run(assetPair.id, assetPair.chainId, assetPair.baseAddress, assetPair.baseSymbol, assetPair.baseDecimal, assetPair.quoteAddress, assetPair.quoteSymbol, assetPair.quoteDecimal);
  }

  public async getAssetPairs(chainId: number): Promise<AssetPairDto[]> {
    const query = `SELECT * FROM ASSET_PAIRS WHERE chainId = ?`;
    const stmt = this.db.prepare(query);
    const rows = stmt.all(chainId) as AssetPairDto[];

    const assetPairs = rows.map(row => ({
      id: row.id,
      chainId: row.chainId,
      baseAddress: row.baseAddress,
      baseSymbol: row.baseSymbol,
      baseDecimal: row.baseDecimal,
      quoteAddress: row.quoteAddress,
      quoteSymbol: row.quoteSymbol,
      quoteDecimal: row.quoteDecimal,
    }));

    return assetPairs;

  }

  public async getAssetPairById(assetPairId: string, chainId: number): Promise<AssetPairDto | null> {
    const query = `SELECT * FROM ASSET_PAIRS WHERE id = ? AND chainId = ?`;
    const stmt = this.db.prepare(query);
    const row = stmt.get(assetPairId, chainId) as AssetPairDto | undefined;

    if (!row) {
      return null;
    }

    const assetPair: AssetPairDto = {
      id: row.id,
      chainId: row.chainId,
      baseAddress: row.baseAddress,
      baseSymbol: row.baseSymbol,
      baseDecimal: row.baseDecimal,
      quoteAddress: row.quoteAddress,
      quoteSymbol: row.quoteSymbol,
      quoteDecimal: row.quoteDecimal,
    };

    return assetPair;
  }

  // Order operations
  public async addOrderByDto(order: OrderDto) {
    const query = `INSERT INTO ORDERS (
      orderId, chainId, assetPairId, orderDirection, orderType, 
      timeInForce, stpMode, price, amountOut, amountIn, 
      partialAmountIn, feeRatio, status, wallet, publicKey, noteCommitment, 
      nullifier, txHashCreated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const stmt = this.db.prepare(query);
    stmt.run(
      order.orderId, order.chainId, order.assetPairId, order.orderDirection, order.orderType, 
      order.timeInForce, order.stpMode, order.price, order.amountOut, order.amountIn, 
      order.partialAmountIn, order.feeRatio,order.status, order.wallet, order.publicKey, order.noteCommitment.toString(), 
      order.nullifier, order.txHashCreated);

  }


  public async getOrdersByStatusAndPage(status: number, page: number, limit: number): Promise<OrderDto[]> {
    const offset = (page - 1) * limit;
    const query = `SELECT * FROM ORDERS WHERE status = ? LIMIT ? OFFSET ?`;
    const stmt = this.db.prepare(query);
    const rows = stmt.all(status, limit, offset) as OrderDto[];
    const orders = rows.map(row => ({
      id: row.id,
      orderId: row.orderId,
      chainId: row.chainId,
      assetPairId: row.assetPairId,
      orderDirection: row.orderDirection,
      orderType: row.orderType,
      timeInForce: row.timeInForce,
      stpMode: row.stpMode,
      price: row.price,
      amountOut: row.amountOut,
      amountIn: row.amountIn,
      partialAmountIn: row.partialAmountIn,
      feeRatio: row.feeRatio, 
      wallet: row.wallet,
      status: row.status,
      publicKey: row.publicKey,
      noteCommitment: row.noteCommitment,
      nullifier: row.nullifier,
      txHashCreated: row.txHashCreated,
      txHashSettled: row.txHashSettled
    }));

    return orders;

  }

  public async updateOrderPrice(orderId: string, price: string, amountIn: bigint, partialAmountIn: bigint) {
    const query = `UPDATE ORDERS SET price = ?, amountIn = ?, partialAmountIn = ? WHERE orderId = ?`;
    const stmt = this.db.prepare(query);
    stmt.run(price, amountIn.toString(), partialAmountIn.toString(), orderId);
  }

  public async getOrderByOrderId(orderId: string): Promise<OrderDto> {
    const query = `SELECT * FROM ORDERS WHERE orderId = ?`;
    const stmt = this.db.prepare(query);
    const row = stmt.get(orderId) as OrderDto;
    if (!row) {
      return null;
    }

    const order = {
      id: row.id,
      orderId: row.orderId,
      chainId: row.chainId,
      assetPairId: row.assetPairId,
      orderDirection: row.orderDirection,
      orderType: row.orderType,
      timeInForce: row.timeInForce,
      stpMode: row.stpMode,
      price: row.price,
      amountOut: row.amountOut,
      amountIn: row.amountIn,
      partialAmountIn: row.partialAmountIn,
      feeRatio: row.feeRatio,
      wallet: row.wallet,
      status: row.status,
      publicKey: row.publicKey,
      noteCommitment: row.noteCommitment,
      incomingNoteCommitment: row.incomingNoteCommitment,
      nullifier: row.nullifier,
      txHashCreated: row.txHashCreated,
      txHashSettled: row.txHashSettled
    };
    return order;
  }


  public async cancelOrder(orderId: string) {
    const query = `UPDATE ORDERS SET status = ? WHERE orderId = ?`;
    const stmt = this.db.prepare(query);
    stmt.run(OrderStatus.CANCELLED, orderId);
  }

  public updateOrderIncomingNoteCommitment(orderId: string, incomingNoteCommitment: bigint) {
    const query = `UPDATE ORDERS SET incomingNoteCommitment = ? WHERE orderId = ?`;
    const stmt = this.db.prepare(query);
    stmt.run(incomingNoteCommitment.toString(), orderId);
  }

  public updateOrderConfirmedAndIncomingNoteCommitment(orderId: string, incomingNoteCommitment: bigint) {
    const query = `UPDATE ORDERS SET status = ?, incomingNoteCommitment = ? WHERE orderId = ?`;
    const stmt = this.db.prepare(query);
    stmt.run(OrderStatus.BOB_CONFIRMED, incomingNoteCommitment.toString(), orderId);
  }

  public updateOrderTriggered(orderId: string) {
    const query = `UPDATE ORDERS SET status = ? WHERE orderId = ? AND status = ?`;
    const stmt = this.db.prepare(query);
    stmt.run(OrderStatus.OPEN, orderId, OrderStatus.NOT_TRIGGERED);
  }

  public async updateOrderMatched(orderId: string) {
    const query = `UPDATE ORDERS SET status = ? WHERE orderId = ? AND status = ?`;
    const stmt = this.db.prepare(query);
    await stmt.run(OrderStatus.MATCHED, orderId, OrderStatus.OPEN);
  }


  public async updateOrderSettlementTransaction(orderId: string, txHash: string) {
    const query = `UPDATE ORDERS SET txHashSettled = ?, status = ? WHERE orderId = ?`;
    const stmt = this.db.prepare(query);
    stmt.run(txHash, OrderStatus.SETTLED, orderId);
  }

  public async addOrderEvent(chainId: number, orderId: string, wallet: string, status: number): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO ORDER_EVENTS (orderId, wallet, chainId, status)
      VALUES (?, ?, ?, ?)
      ON CONFLICT DO NOTHING
    `);
    
    const result = stmt.run(
      orderId,
      wallet.toLowerCase(),
      chainId,
      status
    );
    
    return result.lastInsertRowid as number;
  }

  public async getOrderEventsByOrderId(orderId: string): Promise<OrderEventDto[]> {
    const stmt = this.db.prepare(`
      SELECT id, createdAt, orderId, wallet, chainId, status
      FROM ORDER_EVENTS
      WHERE orderId = ?
      ORDER BY createdAt DESC
    `);
    
    const rows = stmt.all(orderId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      createdAt: row.createdAt,
      orderId: row.orderId,
      wallet: row.wallet,
      chainId: row.chainId,
      status: row.status
    }));
  }

  public async getIncrementalOrderEvents(lastEventId: number): Promise<OrderEventDto[]> {
    const stmt = this.db.prepare(`
      SELECT id, createdAt, orderId, wallet, chainId, status
      FROM ORDER_EVENTS
      WHERE id > ?
      ORDER BY id
    `);

    const rows = stmt.all(lastEventId) as any[];

    return rows.map(row => ({
      id: row.id,
      createdAt: row.createdAt,
      orderId: row.orderId,
      wallet: row.wallet,
      chainId: row.chainId,
      status: row.status
    }));
  }
}

export default DatabaseService;

