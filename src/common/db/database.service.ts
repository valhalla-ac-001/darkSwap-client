import { Database } from 'better-sqlite3';
import config from '../../config/dbConfig';
import { NoteDto } from '../dto/note.dto';
import { AssetPairDto } from '../dto/assetPair.dto';
import { OrderDto } from '../../orders/order.dto';

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
      chain: number, 
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
      chain, publicKey, wallet, type, noteCommitment, rho, asset, amount, status, txHashCreated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const stmt = this.db.prepare(query);
    const result = stmt.run(chain, publicKey, walletAddress, type, noteCommitment, rho, asset, amount, status, txHashCreated);
    return result.lastInsertRowid;
    }

  public async getNotesByWallet(walletAddress: string): Promise<NoteDto[]> {
    const query = `SELECT * FROM NOTES WHERE wallet = ?`;
    const stmt = this.db.prepare(query);
    const rows = await stmt.all(walletAddress) as NoteDto[];

    const notes = rows.map(row => ({
      id: row.id,
      chain: row.chain,
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

  public async getNotesByAsset(asset: string, chain: number): Promise<NoteDto[]> {
    const query = `SELECT * FROM NOTES WHERE asset = ? AND chain = ? AND status = 0 ORDER BY amount DESC`;
    const stmt = this.db.prepare(query);
    const rows = stmt.all(asset, chain);

    const notes = rows.map(row => ({
      id: row.id,
      chain: row.chain,
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

  public async getNoteByAssetAndAmount(asset: string, amount: bigint, chain: number): Promise<NoteDto[]> {
    const query = `SELECT * FROM NOTES WHERE asset = ? AND amount =? chain = ? AND status = 0 ORDER BY amount DESC`;
    const stmt = this.db.prepare(query);
    const rows = stmt.all(asset, amount, chain) as NoteDto[];

    const notes = rows.map(row => ({
      id: row.id,
      chain: row.chain,
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
  public async addAssetPair(assetA: string, assetB: string, symbolA : string, symbolB : string, chain: number) {
    const query = `INSERT INTO ASSET_PAIRS (assetA, assetB, symbolA,  symbolB, chain) VALUES (?, ?, ?, ?, ?)`;
    const stmt = this.db.prepare(query);
    await stmt.run(assetA, assetB, chain);
  }

  public async getAssetPairs(chain: number): Promise<AssetPairDto[]> {
    const query = `SELECT * FROM ASSET_PAIRS WHERE chain = ?`;
    const stmt = this.db.prepare(query);
    const rows = stmt.all(chain) as AssetPairDto[];

    const assetPairs = rows.map(row => ({
      id: row.id,
      assetA: row.assetA,
      assetB: row.assetB,
      symbolA: row.symbolA,
      symbolB: row.symbolB,
      chain: row.chain,
    }));

    return assetPairs;

  }

  public async getAssetPair(assetA: string, assetB: string, chain: number): Promise<AssetPairDto> {
    const query = `SELECT * FROM ASSET_PAIRS WHERE assetA = ? AND assetB = ? AND chain = ?`;
    const stmt = this.db.prepare(query);
    let row = stmt.get(assetA, assetB, chain) as AssetPairDto;
    if (!row) {
      row = stmt.get(assetB, assetA, chain) as AssetPairDto;
    }
    const assetPair = {
      id: row.id,
      assetA: row.assetA,
      assetB: row.assetB,
      symbolA: row.symbolA,
      symbolB: row.symbolB,
      chain: row.chain,
    };
    return assetPair;
  }

  public async getAssetPairById(assetPairId: number) : Promise<AssetPairDto> {
    const query = `SELECT * FROM ASSET_PAIRS WHERE id = ?`;
    const stmt = this.db.prepare(query);
    const row = stmt.get(assetPairId) as AssetPairDto;
    const assetPair = {
      id: row.id,
      assetA: row.assetA,
      assetB: row.assetB,
      symbolA: row.symbolA,
      symbolB: row.symbolB,
      chain: row.chain,
    };
    return assetPair;

  }

  // Order operations
  public async addOrderByDto(order: OrderDto) {
    const query = `INSERT INTO ORDERS (
      orderId, chain, assetPairId, orderDirection, orderType, timeInForce, stpMode, price, amountOut, amountIn, partialAmountIn, status, wallet, publicKey, noteCommitment, signature, txHashCreated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const stmt = this.db.prepare(query);
    await stmt.run(order.orderId, order.chain, order.assetPairId, order.orderDirection, order.orderType, order.timeInForce, order.stpMode, order.price, order.amountOut, order.amountIn, order.partialAmountIn, order.status, order.wallet, order.publicKey, order.noteCommitment, order.signature, order.txHashCreated);

  }

  public async addOrder(
      orderId: string, 
      chain: number, 
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
      signature: string,
      txHashCreated: string) {
    const query = `INSERT INTO ORDERS (
      orderId, chain, assetPairId, orderDirection, orderType, timeInForce, stpMode, price, amountOut, amountIn, partialAmountIn, status, wallet, publicKey, noteCommitment, signature, txHashCreated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const stmt = this.db.prepare(query);
    await stmt.run(orderId, chain, assetPairId, orderDirection, orderType, timeInForce, stpMode, price, amountOut, amountIn, partialAmountIn, status, wallet, publicKey, noteCommitment, signature, txHashCreated);
  }

  public async getOrdersByStatusAndPage(status: number, page: number, limit: number): Promise<OrderDto[]> {
    const offset = (page - 1) * limit;
    const query = `SELECT * FROM ORDERS WHERE status = ? LIMIT ? OFFSET ?`;
    const stmt = this.db.prepare(query);
    const rows = await stmt.all(status, limit, offset) as OrderDto[];
    const orders = rows.map(row => ({
      id: row.id,
      orderId: row.orderId,
      chain: row.chain,
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
      txHashCreated: row.txHashCreated,
      signature: row.signature,
    }));

    return orders;

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


}

export default DatabaseService;

