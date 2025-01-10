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
        const result = 
            await axios.get(`${this.configLoader.getConfig().bookNodeApiUrl}/assetPair/getAssetPairs`,{
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.configLoader.getConfig().bookNodeApiKey}`
                }
            });
            
            const assetPairs = result.data as AssetPairDto[];
            for (const assetPair of assetPairs) {
                const assetPairDb = await this.dbService.getAssetPairById(assetPair.id);
                if (!assetPairDb) {
                    await this.dbService.addAssetPair(assetPair);
                }
            }
        }

    async syncAssetPair(assetPairId: string) {
        const result = await axios.get(`${this.configLoader.getConfig().bookNodeApiUrl}/assetPair/getAssetPair/${assetPairId}`,{
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.configLoader.getConfig().bookNodeApiKey}`
            }
        });
        const assetPair = result.data as AssetPairDto;
        const assetPairDb = await this.dbService.getAssetPairById(assetPair.id);
        if (!assetPairDb) {
            await this.dbService.addAssetPair(assetPair);
        }
    }      
}