import { ethers } from 'ethers';
import { ConfigLoader } from './configUtil';

class RpcManager {
  private static instance: RpcManager;
  private providers: Map<number, ethers.JsonRpcProvider>;
  private signers: Map<string, [ethers.Signer,string]>;
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
      const provider = new ethers.JsonRpcProvider(rpcUrl);
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
    const signer = new ethers.Wallet(wallet.privateKey, provider);
    const publicKey = ethers.SigningKey.computePublicKey(wallet.privateKey, true);
    this.signers.set(key, [signer,publicKey]);
    return [signer, publicKey];
  }

  public reloadProviders() {
    this.providers.clear();
    this.signers.clear();
    this.initializeProviders();
  }
}

export default RpcManager;
