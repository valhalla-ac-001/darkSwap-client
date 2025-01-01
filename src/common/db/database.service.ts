import { Database } from 'better-sqlite3';
import config from '../../config/dbConfig';
import { noteDto } from '../dto/note.dto';
import { assetPairDto } from '../dto/assetPair.dto';
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
      chain_id, public_key, wallet_address, type, note_commitment, rho, asset, amount, status, transaction_created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const stmt = this.db.prepare(query);
    const result = stmt.run(chain, publicKey, walletAddress, type, noteCommitment, rho, asset, amount, status, txHashCreated);
    return result.lastInsertRowid;
    }

  public async getNotesByWallet(walletAddress: string): Promise<noteDto[]> {
    const query = `SELECT * FROM NOTES WHERE wallet_address = ?`;
    const stmt = this.db.prepare(query);
    const rows = await stmt.all(walletAddress) as noteDto[];

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

  public async getNoteByAsset(asset: string, chain: number): Promise<noteDto[]> {
    const query = `SELECT * FROM NOTES WHERE asset = ? AND chain_id = ? AND status = 0 ORDER BY amount DESC`;
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

  public async getNoteByAssetAndAmount(asset: string, amount: bigint, chain: number): Promise<noteDto[]> {
    const query = `SELECT * FROM NOTES WHERE asset = ? AND amount =? chain_id = ? AND status = 0 ORDER BY amount DESC`;
    const stmt = this.db.prepare(query);
    const rows = stmt.all(asset, amount, chain) as noteDto[];

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
  public async addAssetPair(assetA: string, assetB: string, chain: number) {
    const query = `INSERT INTO ASSETS_PAIR (asset_a, asset_b, chain_id) VALUES (?, ?, ?)`;
    const stmt = this.db.prepare(query);
    await stmt.run(assetA, assetB, chain);
  }

  public async getAssetPairs(chain: number): Promise<assetPairDto[]> {
    const query = `SELECT * FROM ASSETS_PAIR WHERE chain_id = ?`;
    const stmt = this.db.prepare(query);
    const rows = stmt.all(chain) as assetPairDto[];

    const assetPairs = rows.map(row => ({
      id: row.id,
      assetA: row.assetA,
      assetB: row.assetB,
      chain: row.chain,
    }));

    return assetPairs;

  }

  public async getAssetPair(assetA: string, assetB: string, chain: number): Promise<assetPairDto> {
    const query = `SELECT * FROM ASSETS_PAIR WHERE asset_a = ? AND asset_b = ? AND chain_id = ?`;
    const stmt = this.db.prepare(query);
    let row = stmt.get(assetA, assetB, chain) as assetPairDto;
    if (!row) {
      row = stmt.get(assetB, assetA, chain) as assetPairDto;
    }
    const assetPair = {
      id: row.id,
      assetA: row.assetA,
      assetB: row.assetB,
      chain: row.chain,
    };
    return assetPair;
  }

  public async getAssetPairById(assetPairId: number) : Promise<assetPairDto> {
    const query = `SELECT * FROM ASSETS_PAIR WHERE id = ?`;
    const stmt = this.db.prepare(query);
    const row = stmt.get(assetPairId) as assetPairDto;
    const assetPair = {
      id: row.id,
      assetA: row.assetA,
      assetB: row.assetB,
      chain: row.chain,
    };
    return assetPair;

  }

  // Order operations
  public async addOrder(
      orderId: string, 
      chain: number, 
      assetPairId: string, 
      orderDirection: number, 
      orderType: number, 
      timeInForce: number, 
      stpMode: number, 
      price: string, 
      amount: bigint, 
      partialAmount: bigint, 
      status: number, 
      wallet: string, 
      publicKey: string, 
      noteId: string, 
      signature: string) {
    const query = `INSERT INTO ORDERS (
      order_id, chain_id, asset_pair_id, order_direction, order_type, time_in_force, stp_mode, price, amount, partial_amount, status, wallet, public_key, note_id, signature)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const stmt = this.db.prepare(query);
    await stmt.run(orderId, chain, assetPairId, orderDirection, orderType, timeInForce, stpMode, price, amount, partialAmount, status, wallet, publicKey, noteId, signature);
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
      amount: row.amount,
      partialAmount: row.partialAmount,
      wallet: row.wallet,
      status: row.status,
      publicKey: row.publicKey,
      noteId: row.noteId,
      signature: row.signature,
    }));

    return orders;

  }

  public async cancelOrder(orderId: string) {
    const query = `UPDATE ORDERS SET status = 2 WHERE order_id = ?`;
    const stmt = this.db.prepare(query);
    await stmt.run(orderId);
  }

  public async updateOrderMatched(orderId: string) {
    const query = `UPDATE ORDERS SET status = 1 WHERE order_id = ?`;
    const stmt = this.db.prepare(query);
    await stmt.run(orderId);
  }

  public async updateOrderById (orderId: string, orderType: number, timeInForce: number, stpMode: number, price: string, amount: string, partialAmount: string) {
    const query = `UPDATE ORDERS SET order_type = ?, time_in_force = ?, stp_mode = ?, price = ?, amount = ?, partial_amount = ? WHERE order_id = ?`;
    const stmt = this.db.prepare(query);
    await stmt.run(orderType, timeInForce, stpMode, price, amount, partialAmount, orderId);
  }

}

export default DatabaseService;

