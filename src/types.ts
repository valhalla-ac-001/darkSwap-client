
export enum ChainId {
    HARDHAT = 31337,
    HARDHAT_ARBITRUM = 31338,
    HARDHAT_BASE = 31339,
    MAINNET = 1,
    SEPOLIA = 11155111,
    HORIZEN_TESTNET = 845320009,
    ARBITRUM_ONE = 42161,
    BASE = 8453,
}

export type HexData = `0x${string}`



export type NetworkConfig = {
    priceOracle: HexData
    ethAddress: HexData
    nativeWrapper: HexData
    merkleTreeOperator: HexData
    darkSwapAssetManager: HexData
    darkSwapFeeAssetManager: HexData
    drakSwapSubgraphUrl: string

    explorerUrl: {
        tx: string
        address: string
        block: string
    }
}

export type RelayerInfo = {
    relayerName: string
    relayerAddress: HexData
    hostUrl: string
}


export enum OrderDirection {
    BUY = 0,
    SELL = 1
}

export enum NoteStatus {
    CREATED = 0,
    ACTIVE = 1,
    SPENT = 2,
    LOCKED = 3,
}

export enum NoteType{
    DARKSWAP = 0,
    DARKSWAP_ORDER = 1,
    SINGULARITY = 2,
}

export enum OrderStatus {
    OPEN = 0,
    MATCHED = 1,
    BOB_CONFIRMED = 2,
    SETTLED = 3,
    CANCELLED = 4,
    NOT_TRIGGERED = 5,
    TRIGGERED = 6,
}

export enum OrderType {
    MARKET = 0,
    LIMIT = 1,
    STOP_LOSS = 2,
    STOP_LOSS_LIMIT = 3,
    TAKE_PROFIT = 4,
    TAKE_PROFIT_LIMIT = 5,
    LIMIT_MAKER = 6,
}

export enum StpMode {
    NONE = 0,
    EXPIRE_MAKER = 1,
    EXPIRE_TAKER = 2,
    BOTH = 3,
}

export enum TimeInForce {
    GTC = 0,
    GTD = 1,
    IOC = 2,
    FOK = 4,
    AON_GTC = 8,
    AON_GTD = 9,
}