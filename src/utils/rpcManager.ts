import { ethers } from 'ethers';
import { ConfigLoader } from './configUtil';
import { WalletConfig } from './configValidator';
import { DarkSwapException } from '../exception/darkSwap.exception';
import { FireblocksWeb3Provider } from '@fireblocks/fireblocks-web3-provider';

/**
 * Rate-limited JsonRpcProvider wrapper
 * Throttles RPC calls to stay under QuickNode's 15 req/sec limit
 */
class RateLimitedProvider extends ethers.JsonRpcProvider {
  private lastCallTime = 0;
  private readonly minDelayMs: number;

  constructor(url: string, requestsPerSecond: number = 12) {
    super(url);
    // Use 12 req/sec as safe default (80% of 15 req/sec limit)
    this.minDelayMs = 1000 / requestsPerSecond;
  }

  override async send(method: string, params: Array<any>): Promise<any> {
    // Throttle requests
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    
    if (timeSinceLastCall < this.minDelayMs) {
      await new Promise(resolve => setTimeout(resolve, this.minDelayMs - timeSinceLastCall));
    }
    
    this.lastCallTime = Date.now();
    return super.send(method, params);
  }
}

class RpcManager {
  private static instance: RpcManager;
  private providers: Map<number, ethers.JsonRpcProvider>;
  private signers: Map<string, [ethers.Signer, string]>;
  private configLoader: ConfigLoader;

  private constructor() {
    this.providers = new Map();
    this.signers = new Map();
    this.configLoader = ConfigLoader.getInstance();
    this.initializeProviders();
  }

  private initializeProviders() {
    const config = this.configLoader.getConfig();
    config.chainRpcs.forEach(({ chainId, rpcUrl }) => {
      // Use rate-limited provider to avoid QuickNode limits
      const provider = new RateLimitedProvider(rpcUrl, 12);
      this.providers.set(chainId, provider);
    });
  }

  public static getInstance(): RpcManager {
    if (!RpcManager.instance) {
      RpcManager.instance = new RpcManager();
    }
    return RpcManager.instance;
  }

  public getProvider(chainId: number): ethers.JsonRpcProvider {
    const provider = this.providers.get(chainId);
    if (!provider) {
      throw new Error(`No provider found for chainId: ${chainId}`);
    }
    return provider;
  }

  public getSignerForUserSwapRelayer(chainId: number): ethers.Signer | null {
    const config = this.configLoader.getConfig();
    const userSwapRelayerPrivateKey = config.userSwapRelayerPrivateKey;

    if (!userSwapRelayerPrivateKey) {
      return null;
    }

    const provider = this.getProvider(chainId);
    return new ethers.Wallet(userSwapRelayerPrivateKey, provider);
  }

  public getSignerAndPublicKey(walletAddress: string, chainId: number): [ethers.Signer, string] {
    const key = `${walletAddress}-${chainId}`;
    if (this.signers.has(key)) {
      return this.signers.get(key)!;
    }

    const wallet = this.configLoader.getWallets()
      .find(w => w.address.toLowerCase() === walletAddress.toLowerCase());

    if (!wallet) {
      throw new Error(`No wallet found for address: ${walletAddress}`);
    }

    const provider = this.getProvider(chainId);
    let signer: ethers.Signer;
    if (wallet.type === 'privateKey') {
      signer = this.getSignerForPrivateKey(wallet, provider);
    } else if (wallet.type === 'fireblocks') {
      signer = this.getSignerForFireblocks(wallet, chainId);
    } else {
      throw new DarkSwapException('Invalid wallet type');
    }
    const publicKey = "0x";
    this.signers.set(key, [signer, publicKey]);
    return [signer, publicKey];
  }

  private getSignerForPrivateKey(wallet: WalletConfig, provider: ethers.JsonRpcProvider): ethers.Signer {
    if (wallet.type === 'privateKey') {
      return new ethers.Wallet(wallet.privateKey, provider);
    }
    throw new DarkSwapException('Invalid wallet type');
  }

  private getSignerForFireblocks(wallet: WalletConfig, chainId: number): ethers.Signer {
    if (wallet.type !== 'fireblocks') {
      throw new DarkSwapException('Invalid wallet type');
    }

    const fireblocksConfig = this.configLoader.getConfig().fireblocks;
    if (!fireblocksConfig) {
      throw new DarkSwapException('Fireblocks config not found');
    }
    const eip1193Provider = new FireblocksWeb3Provider({
      privateKey: fireblocksConfig.privateKey,
      apiKey: fireblocksConfig.apiKey,
      vaultAccountIds: wallet.address,
      chainId,
    });
    if (fireblocksConfig.apiBaseUrl) {
      eip1193Provider.setApiBaseUrl(fireblocksConfig.apiBaseUrl);
    }
    return eip1193Provider.getSigner();
  }

  public reloadProviders() {
    this.providers.clear();
    this.signers.clear();
    this.initializeProviders();
  }
}

export default RpcManager;
