import { Injectable } from '@nestjs/common';

@Injectable()
export class WalletService {
  private wallets: { [key: string]: string };

  constructor() {
    this.wallets = this.loadWallets();
  }

  private loadWallets(): { [key: string]: string } {
    const walletsConfig = process.env.WALLETS || '';
    const walletsArray = walletsConfig.split(',').map(wallet => wallet.trim());
    const wallets: { [key: string]: string } = {};

    walletsArray.forEach(wallet => {
      const [name, privateKey] = wallet.split(':');
      if (name && privateKey) {
        wallets[name] = privateKey;
      }
    });

    return wallets;
  }

  getPrivateKey(walletName: string): string {
    return this.wallets[walletName];
  }
}