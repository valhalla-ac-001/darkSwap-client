import dotenv from 'dotenv';
dotenv.config();

export default{
    dbFile: process.env.DB_FILE_PATH || "/data/db.sqlite",
    tables:[
        //status: 0: normal, 1: used, 2: locked, 3: created
        //type: 0: note, 1: partial note
        `CREATE TABLE IF NOT EXISTS NOTES (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            chain_id INTERGER NOT NULL, 
            public_key VARCHAR NOT NULL, 
            wallet_address VARCHAR NOT NULL,
            type VARCHAR NOT NULL,
            note_commitment VARCHAR NOT NULL, 
            rho VARCHAR NOT NULL, 
            asset VARCHAR NOT NULL, 
            amount NUMERIC NOT NULL
            status INTEGER NOT NULL
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE
            );`,
            
        `CREATE TABLE IF NOT EXISTS ASSETS_PAIR (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_a VARCHAR NOT NULL, 
            asset_b VARCHAR NOT NULL, 
            chain_id INTERGER NOT NULL);`,

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
            order_id TEXT NOT NULL,
            chain_id INTERGER NOT NULL, 
            asset_pair_id TEXT NOT NULL,
            order_direction INTERGER NOT NULL,
            order_type INTERGER NOT NULL,
            time_in_force INTERGER NOT NULL,
            stp_mode INTERGER NOT NULL,
            price TEXT NOT NULL,
            amount TEXT NOT NULL,
            partial_amount TEXT NOT NULL,
            status integer NOT NULL,
            wallet TEXT NOT NULL,
            public_key TEXT NOT NULL,
            note_id TEXT NOT NULL,
            signature TEXT NOT NULL
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE);`,
    ]
}