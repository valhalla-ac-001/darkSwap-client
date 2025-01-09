import { ConfigLoader } from "src/utils/configUtil";

export default{
    dbFile: ConfigLoader.getInstance().getConfig().dbFilePath,
    tables:[
        //status: 0: normal, 1: used, 2: locked, 3: created
        //type: 0: note, 1: partial note
        `CREATE TABLE IF NOT EXISTS NOTES (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            chainId INTERGER NOT NULL, 
            publicKey TEXT NOT NULL, 
            wallet TEXT NOT NULL,
            type  INTERGER NOT NULL,
            note_commitment TEXT NOT NULL, 
            rho TEXT NOT NULL, 
            asset TEXT NOT NULL, 
            amount NUMERIC NOT NULL
            status INTEGER NOT NULL
            txHashCreated TEXT,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON INSERT,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE
            );`,
            
        `CREATE TABLE IF NOT EXISTS ASSET_PAIRS (
            id TEXT PRIMARY KEY,
            assetA TEXT NOT NULL,
            assetB TEXT NOT NULL,
            symbolA TEXT NOT NULL,
            symbolB TEXT NOT NULL,
            chainId INTERGER NOT NULL
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON INSERT,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE
            );`,

        //order_direction: 0: buy, 1: sell
        //order_type: 0: market, 1: limit, 2: stop loss, 3: stop loss limit, 4: take profit, 5: take profit limit, 6: limit maker
        //time_in_force in bitmap 
        // GTC: 0000
        // GTD: 0001
        // IOC: 0010
        // FOK: 0100
        // AON (GTC): 1000
        // AON (GTD): 1001
        //stp in bitmap
        // none: 00
        // expire_maker: 01
        // expire_taker: 10
        // both: 11
        //status: 0: open, 1: matched, 2: cancelled
    
        `CREATE TABLE IF NOT EXISTS ORDERS (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            orderId TEXT NOT NULL,
            chainId INTERGER NOT NULL, 
            assetPairId TEXT NOT NULL,
            orderDirection INTERGER NOT NULL,
            orderType INTERGER NOT NULL,
            timeInForce INTERGER NOT NULL,
            stpMode INTERGER NOT NULL,
            price TEXT NOT NULL,
            amountOut TEXT NOT NULL,
            amountIn TEXT NOT NULL,
            partialAmountIn TEXT NOT NULL,
            status INTERGER NOT NULL,
            wallet TEXT NOT NULL,
            publicKey TEXT NOT NULL,
            noteCommitment TEXT NOT NULL,
            nullifier TEXT NOT NULL,
            txHashCreated TEXT,
            txHashSettled TEXT,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON INSERT,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE);`,
    ]
}