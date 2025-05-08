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

    public init(wallets: string[]): void {
        for (const wallet of wallets) {
            this.getMutex(wallet);
        }
    }

    public getMutex(wallet: string): Mutex {
        if (!this.walletMutex.has(wallet.toLowerCase())) {
            this.walletMutex.set(wallet.toLowerCase(), new Mutex());
        }
        return this.walletMutex.get(wallet.toLowerCase())!;
    }
}