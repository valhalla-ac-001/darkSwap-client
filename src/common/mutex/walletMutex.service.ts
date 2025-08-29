import { Mutex } from "async-mutex";

export class WalletMutexService {
    private static instance: WalletMutexService;
    private walletMutex: Map<string, Mutex>;

    private constructor() {
        this.walletMutex = new Map<string, Mutex>();
    }

    public static getInstance(): WalletMutexService {
        if (!WalletMutexService.instance) {
            WalletMutexService.instance = new WalletMutexService();
        }
        return WalletMutexService.instance;
    }

    public init(chainId: number, wallets: string[]): void {
        for (const wallet of wallets) {
            this.getMutex(chainId, wallet);
        }
    }

    public getMutex(chainId: number, wallet: string): Mutex {
        const key = `${chainId}:${wallet.toLowerCase()}`;
        if (!this.walletMutex.has(key)) {
            this.walletMutex.set(key, new Mutex());
        }
        return this.walletMutex.get(key)!;
    }
}