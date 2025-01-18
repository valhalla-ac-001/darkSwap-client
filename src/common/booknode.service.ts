import axios from 'axios';
import { ConfigLoader } from '../utils/configUtil';
import { SettlementDto } from 'src/settlement/dto/settlement.dto';
import { MatchedOrderDto } from 'src/settlement/dto/matchedOder.dto';
import { TakerConfirmDto } from 'src/settlement/dto/takerConfirm.dto';

interface BookNodeMatchedOrder {
    orderId: string;
    chainId: number;
    assetPairId: string;
    orderDirection: number;
    isMaker: boolean;
    matchedPrice: number;
    makerAmount: string;
    makerMatchedAmount: string;
    takerMatchedAmount: string;
    makerPublicKey: string;
    takerSwapMessage: string;
}


export class BooknodeService {

    private configLoader: ConfigLoader; 

    private static instance: BooknodeService;

    private constructor() {
        this.configLoader = ConfigLoader.getInstance();
    } 

    public static getInstance(): BooknodeService {
        if (!BooknodeService.instance) {
            BooknodeService.instance = new BooknodeService();
        }
        return BooknodeService.instance;
    }

    async sendRequest(req: any, url: string): Promise<any> {
        const result = await axios.post(`${this.configLoader.getConfig().bookNodeApiUrl}${url}`, req,{
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.configLoader.getConfig().bookNodeApiKey}`
            }
          });
        return result;
    }

    public async getMatchedOrderDetails(settlementDto: SettlementDto): Promise<MatchedOrderDto> {
        const result = await this.sendRequest(settlementDto,'/api/orders/matchdetails');
        const bookNodeMathedOrderDetail =  result.data.data as BookNodeMatchedOrder;
        return {
            orderId: bookNodeMathedOrderDetail.orderId,
            chainId: bookNodeMathedOrderDetail.chainId,
            assetPairId: bookNodeMathedOrderDetail.assetPairId,
            orderDirection: bookNodeMathedOrderDetail.orderDirection,
            isMaker: bookNodeMathedOrderDetail.isMaker,
            makerAmount: BigInt(bookNodeMathedOrderDetail.makerAmount),
            makerMatchedAmount: BigInt(bookNodeMathedOrderDetail.makerMatchedAmount),
            takerMatchedAmount: BigInt(bookNodeMathedOrderDetail.takerMatchedAmount),
            takerSwapMessage: bookNodeMathedOrderDetail.takerSwapMessage
        } as MatchedOrderDto;
    }

    public async settleOrder(settlementDto: SettlementDto): Promise<any> {
        const result = await this.sendRequest(settlementDto,'/api/orders/settle');
        return result.data;
    }

    public async confirmOrder(takerConfirmDto: TakerConfirmDto): Promise<any> {
        const result = await this.sendRequest(takerConfirmDto,'/api/orders/confirm');
        return result.data;
    }
}