import { DatabaseService } from './db/database.service';
import { ConfigLoader } from '../utils/configUtil';
import { AssetPairDto } from './dto/assetPair.dto';
import axios from 'axios';

export class AssetPairService {
    private static instance: AssetPairService;
    private dbService: DatabaseService;
    private configLoader: ConfigLoader;

    private constructor() {
        this.dbService = DatabaseService.getInstance();
        this.configLoader = ConfigLoader.getInstance();
    }

    public static getInstance(): AssetPairService {
        if (!AssetPairService.instance) {
            AssetPairService.instance = new AssetPairService();
        }
        return AssetPairService.instance;
    }

    async syncAssetPairs() {
        console.log("Syncing asset pairs");
        try {
            const result =
                await axios.get(`${this.configLoader.getConfig().bookNodeApiUrl}/api/trading-pairs`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.configLoader.getConfig().bookNodeApiKey}`
                    },
                    timeout: 10000 // 10 second timeout
                });

            if (result.status == 200 && result.data.code == 200 && result.data.data) {
                const assetPairs = result.data.data as AssetPairDto[];
                for (const assetPair of assetPairs) {
                    const assetPairDb = await this.dbService.getAssetPairById(assetPair.id, assetPair.chainId);
                    if (!assetPairDb) {
                        await this.dbService.addAssetPair(assetPair);
                    }
                }
                console.log(`Synced ${assetPairs.length} asset pairs`);
            } else {
                console.warn(`Failed to sync asset pairs: status=${result.status}, code=${result.data?.code}`);
            }
        } catch (error) {
            console.error('Error syncing asset pairs:', error.message);
            console.error('BookNode URL:', this.configLoader.getConfig().bookNodeApiUrl);
            console.error('Continuing without asset pairs...');
        }
    }

    async syncAssetPair(assetPairId: string, chainId: number) {
        const result = await axios.get(`${this.configLoader.getConfig().bookNodeApiUrl}/assetPair/getAssetPair/${assetPairId}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.configLoader.getConfig().bookNodeApiKey}`
            }
        });
        const assetPair = result.data as AssetPairDto;
        const assetPairDb = await this.dbService.getAssetPairById(assetPair.id, chainId);
        if (!assetPairDb) {
            await this.dbService.addAssetPair(assetPair);
        }
    }
}