import { Database } from 'better-sqlite3';
import config from '../../config/dbConfig';
import { NoteDto } from '../dto/note.dto';
import { AssetPairDto } from '../dto/assetPair.dto';
import { OrderDto } from '../../orders/dto/order.dto';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: Database;

  private constructor() {
    this.db = new Database(config.dbFile);
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
      await this.db.exec(table);
    }
  }

  // Note operations
  public async addNote(
      chainId: number, 
      publicKey: string, 
      walletAddress: string, 
      type: number, 
      noteCommitment: bigint, 
      rho: bigint, 
      asset: string, 
      amount: bigint, 
      status: number,
      txHashCreated: string): Promise<number> {
    const query = `INSERT INTO NOTES (
      chainId, publicKey, wallet, type, noteCommitment, rho, asset, amount, status, txHashCreated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const stmt = this.db.prepare(query);
    const result = stmt.run(chainId, publicKey, walletAddress, type, noteCommitment, rho, asset, amount, status, txHashCreated);
    return result.lastInsertRowid;
    }

  public async getNotesByWallet(walletAddress: string): Promise<NoteDto[]> {
    const query = `SELECT * FROM NOTES WHERE wallet = ?`;
    const stmt = this.db.prepare(query);
    const rows = await stmt.all(walletAddress) as NoteDto[];

    const notes = rows.map(row => ({
      id: row.id,
      chainId: row.chainId,
      publicKey: row.publicKey,
      wallet: row.wallet,
      type: row.type,
      noteCommitment: row.noteCommitment,
      rho: row.rho,
      asset: row.asset,
      amount: row.amount,
      status: row.status,
      txHashCreated: row.txHashCreated,
    }));

    return notes;
  }

  public async getNotesByAsset(asset: string, chainId: number): Promise<NoteDto[]> {
    const query = `SELECT * FROM NOTES WHERE asset = ? AND chainId = ? AND status = 0 ORDER BY amount DESC`;
    const stmt = this.db.prepare(query);
    const rows = stmt.all(asset, chainId) as NoteDto[];

    const notes = rows.map(row => ({
      id: row.id,
      chainId: row.chainId,
      publicKey: row.publicKey,
      wallet: row.wallet,
      type: row.type,
      noteCommitment: row.noteCommitment,
      rho: row.rho,
      asset: row.asset,
      amount: row.amount,
      status: row.status,
      txHashCreated: row.txHashCreated
    }));

    return notes;
  }

  public async getNoteByCommitment(noteCommitment: bigint): Promise<NoteDto> {
    const query = `SELECT * FROM NOTES WHERE noteCommitment = ?`;
    const stmt = this.db.prepare(query);
    const row = stmt.get(noteCommitment) as NoteDto;
    const note = {
      id: row.id,
      chainId: row.chainId,
      publicKey: row.publicKey,
      wallet: row.wallet,
      type: row.type,
      noteCommitment: row.noteCommitment,
      rho: row.rho,
      asset: row.asset,
      amount: row.amount,
      status: row.status,
      txHashCreated: row.txHashCreated
    };
    return note;
  }

  public async getNoteByOrderId(orderId: string): Promise<NoteDto> {
    const query = `SELECT * FROM NOTES WHERE orderId = ?`;
    const stmt = this.db.prepare(query);
    const row = stmt.get(orderId) as NoteDto;
    const note = {
      id: row.id,
      chainId: row.chainId,
      publicKey: row.publicKey,
      wallet: row.wallet,
      type: row.type,
      noteCommitment: row.noteCommitment,
      rho: row.rho,
      asset: row.asset,
      amount: row.amount,
      status: row.status,
      txHashCreated: row.txHashCreated
    };
    return note;
  }

  public async getNoteByAssetAndAmount(asset: string, amount: bigint, chainId: number): Promise<NoteDto[]> {
    const query = `SELECT * FROM NOTES WHERE asset = ? AND amount =? chainId = ? AND status = 0 ORDER BY amount DESC`;
    const stmt = this.db.prepare(query);
    const rows = stmt.all(asset, amount, chainId) as NoteDto[];

    const notes = rows.map(row => ({
      id: row.id,
      chainId: row.chainId,
      publicKey: row.publicKey,
      wallet: row.wallet,
      type: row.type,
      noteCommitment: row.noteCommitment,
      rho: row.rho,
      asset: row.asset,
      amount: row.amount,
      status: row.status,
      txHashCreated: row.txHashCreated,
    }));

    return notes;
  }


  public async updateNoteStatus(id: number, status: number) {
    const query = `UPDATE NOTES SET status = ? WHERE id = ?`;
    const stmt = this.db.prepare(query);
    await stmt.run(status, id);
  } 

  public async updateNoteTransactionAndStatus(id: number, txHash: string) {
    const query = `UPDATE NOTES SET transaction = ?, status = 0 WHERE id = ?`;
    const stmt = this.db.prepare(query);
    await stmt.run(txHash, id);
  } 

  // Asset pair operations
  public async addAssetPair(id: string, assetA: string, assetB: string, symbolA : string, symbolB : string, chainId: number) {
    const query = `INSERT INTO ASSET_PAIRS (id, assetA, assetB, symbolA,  symbolB, chainId) VALUES (?, ?, ?, ?, ?, ?)`;
    const stmt = this.db.prepare(query);
    await stmt.run(id, assetA, assetB, symbolA, symbolB, chainId);
  }

  public async getAssetPairs(chainId: number): Promise<AssetPairDto[]> {
    const query = `SELECT * FROM ASSET_PAIRS WHERE chainId = ?`;
    const stmt = this.db.prepare(query);
    const rows = stmt.all(chainId) as AssetPairDto[];

    const assetPairs = rows.map(row => ({
      id: row.id,
      assetA: row.assetA,
      assetB: row.assetB,
      symbolA: row.symbolA,
      symbolB: row.symbolB,
      chainId: row.chainId,
    }));

    return assetPairs;

  }

  public async getAssetPair(assetA: string, assetB: string, chainId: number): Promise<AssetPairDto> {
    const query = `SELECT * FROM ASSET_PAIRS WHERE assetA = ? AND assetB = ? AND chainId = ?`;
    const stmt = this.db.prepare(query);
    let row = stmt.get(assetA, assetB, chainId) as AssetPairDto;
    if (!row) {
      row = stmt.get(assetB, assetA, chainId) as AssetPairDto;
    }
    const assetPair = {
      id: row.id,
      assetA: row.assetA,
      assetB: row.assetB,
      symbolA: row.symbolA,
      symbolB: row.symbolB,
      chainId: row.chainId,
    };
    return assetPair;
  }

  public async getAssetPairById(assetPairId: string) : Promise<AssetPairDto> {
    const query = `SELECT * FROM ASSET_PAIRS WHERE id = ?`;
    const stmt = this.db.prepare(query);
    const row = stmt.get(assetPairId) as AssetPairDto;
    const assetPair = {
      id: row.id,
      assetA: row.assetA,
      assetB: row.assetB,
      symbolA: row.symbolA,
      symbolB: row.symbolB,
      chainId: row.chainId,
    };
    return assetPair;

  }

  // Order operations
  public async addOrderByDto(order: OrderDto) {
    const query = `INSERT INTO ORDERS (
      orderId, chainId, assetPairId, orderDirection, orderType, timeInForce, stpMode, price, amountOut, amountIn, partialAmountIn, status, wallet, publicKey, noteCommitment, nullifier, signature, txHashCreated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const stmt = this.db.prepare(query);
    await stmt.run(order.orderId, order.chainId, order.assetPairId, order.orderDirection, order.orderType, order.timeInForce, order.stpMode, order.price, order.amountOut, order.amountIn, order.partialAmountIn, order.status, order.wallet, order.publicKey, order.noteCommitment, order.nullifier, order.txHashCreated);

  }

  public async addOrder(
      orderId: string, 
      chainId: number, 
      assetPairId: string, 
      orderDirection: number, 
      orderType: number, 
      timeInForce: number, 
      stpMode: number, 
      price: string, 
      amountOut: bigint, 
      amountIn: bigint,
      partialAmountIn: bigint, 
      status: number, 
      wallet: string, 
      publicKey: string, 
      noteCommitment: bigint,
      nullifier: bigint, 
      signature: string,
      txHashCreated: string) {
    const query = `INSERT INTO ORDERS (
      orderId, chainId, assetPairId, orderDirection, orderType, timeInForce, stpMode, price, amountOut, amountIn, partialAmountIn, status, wallet, publicKey, noteCommitment, nullifier, signature, txHashCreated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const stmt = this.db.prepare(query);
    await stmt.run(orderId, chainId, assetPairId, orderDirection, orderType, timeInForce, stpMode, price, amountOut, amountIn, partialAmountIn, status, wallet, publicKey, noteCommitment, nullifier, signature, txHashCreated);
  }

  public async getOrdersByStatusAndPage(status: number, page: number, limit: number): Promise<OrderDto[]> {
    const offset = (page - 1) * limit;
    const query = `SELECT * FROM ORDERS WHERE status = ? LIMIT ? OFFSET ?`;
    const stmt = this.db.prepare(query);
    const rows = await stmt.all(status, limit, offset) as OrderDto[];
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

  public async getOrderByOrderId(orderId: string): Promise<OrderDto> {
    const query = `SELECT * FROM ORDERS WHERE orderId = ?`;
    const stmt = this.db.prepare(query);
    const row = stmt.get(orderId) as OrderDto;
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
      wallet: row.wallet,
      status: row.status,
      publicKey: row.publicKey,
      noteCommitment: row.noteCommitment,
      nullifier: row.nullifier,
      txHashCreated: row.txHashCreated,
      txHashSettled: row.txHashSettled
    };
    return order;
  }


  public async cancelOrder(orderId: string) {
    const query = `UPDATE ORDERS SET status = 2 WHERE orderId = ?`;
    const stmt = this.db.prepare(query);
    await stmt.run(orderId);
  }

  public async updateOrderMatched(orderId: string) {
    const query = `UPDATE ORDERS SET status = 1 WHERE orderId = ?`;
    const stmt = this.db.prepare(query);
    await stmt.run(orderId);
  }

  public async updateOrderSettlementTransaction(orderId: string, txHash: string) {
    const query = `UPDATE ORDERS SET txHashSettled = ? WHERE orderId = ?`;
    const stmt = this.db.prepare(query);
    await stmt.run(txHash, orderId);
  }


}

export default DatabaseService;

