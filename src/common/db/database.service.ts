import { Database } from 'better-sqlite3';
import config from '../../config/dbConfig';

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
      chain_id, public_key, wallet_address, type, note_commitment, rho, asset, amount, status, transaction_created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const result =
      await this.db.run(query, [chainId, publicKey, walletAddress, type, noteCommitment, rho, asset, amount, status, txHashCreated]);
    return result.lastInsertRowid;
    }

  public async getNotesByWalletAddress(walletAddress: string) {
    const query = `SELECT * FROM NOTES WHERE wallet_address = ?`;
    return await this.db.all(query, [walletAddress]);
  }

  public async updateNoteStatus(id: number, status: number) {
    const query = `UPDATE NOTES SET status = ? WHERE id = ?`;
    await this.db.run(query, [status, id]);
  } 

  public async updateNoteTransactionAndStatus(id: number, txHash: string) {
    const query = `UPDATE NOTES SET transaction = ?, status = 0 WHERE id = ?`;
    await this.db.run(query, [txHash, id]);
  } 

  // Asset pair operations
  public async addAssetPair(assetA: string, assetB: string, chainId: number) {
    const query = `INSERT INTO ASSETS_PAIR (asset_a, asset_b, chain_id) VALUES (?, ?, ?)`;
    await this.db.run(query, [assetA, assetB, chainId]);
  }

  public async getAssetPairsByChainId(chainId: number) {
    const query = `SELECT * FROM ASSETS_PAIR WHERE chain_id = ?`;
    return await this.db.all(query, [chainId]);
  }

  public async getAssetPairById(assetPairId: number) {
    const query = `SELECT * FROM ASSETS_PAIR WHERE id = ?`;
    return await this.db.get(query, [assetPairId]);
  }

  // Order operations
  public async addOrder(
      orderId: string, 
      chainId: number, 
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
    await this.db.run(query, [orderId, chainId, assetPairId, orderDirection, orderType, timeInForce, stpMode, price, amount, partialAmount, status, wallet, publicKey, noteId, signature]);
  }

  public async getOrdersByStatusAndPage(status: number, page: number, limit: number) {
    const offset = (page - 1) * limit;
    const query = `SELECT * FROM ORDERS WHERE status = ? LIMIT ? OFFSET ?`;
    return await this.db.all(query, [status, limit, offset]);
  }

  public async cancelOrder(orderId: string) {
    const query = `UPDATE ORDERS SET status = 2 WHERE order_id = ?`;
    await this.db.run(query, [orderId]);
  }

  public async updateOrderMatched(orderId: string) {
    const query = `UPDATE ORDERS SET status = 1 WHERE order_id = ?`;
    await this.db.run(query, [orderId]);
  }

  public async updateOrderById (orderId: string, orderType: number, timeInForce: number, stpMode: number, price: string, amount: string, partialAmount: string) {
    const query = `UPDATE ORDERS SET order_type = ?, time_in_force = ?, stp_mode = ?, price = ?, amount = ?, partial_amount = ? WHERE order_id = ?`;
    await this.db.run(query, [orderType, timeInForce, stpMode, price, amount, partialAmount, orderId]);
  }

}

export default DatabaseService;

