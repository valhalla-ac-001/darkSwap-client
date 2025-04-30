import axios from 'axios';
import { CancelOrderDto } from '../orders/dto/cancelOrder.dto';
import { MatchedOrderDto } from '../settlement/dto/matchedOder.dto';
import { SettlementDto } from '../settlement/dto/settlement.dto';
import { TakerConfirmDto } from '../settlement/dto/takerConfirm.dto';
import { ConfigLoader } from '../utils/configUtil';
import { UpdatePriceDto } from '../orders/dto/updatePrice.dto';
import { OrderDto } from '../orders/dto/order.dto';
import { DarkpoolException } from '../exception/darkpool.exception';
import { OrderType } from '../types';

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

interface BookNodeCreateOrderDto {
    chainId: number;
    wallet: string;
    orderId: string;
    assetPairId: string;
    orderDirection: number;
    orderType: number;
    timeInForce: number;
    stpMode: number;
    orderTriggerPrice: number;
    price: number;
    amountOut: string;
    amountIn: string;
    partialAmountIn: string;
    publicKey: string;
    nullifier: string;
    txHashCreated: string;
}

interface BookNodeUpdatePriceDto {
    chainId: number;
    wallet: string;
    orderId: string;
    price: number;
    amountIn: string;
    partialAmountIn: string;
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

    private async sendPutRequest(req: any, url: string): Promise<any> {
        try {
            const result = await axios.put(`${this.configLoader.getConfig().bookNodeApiUrl}${url}`, req, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.configLoader.getConfig().bookNodeApiKey}`
                }
            });
            return result;
        } catch (error) {
            console.error('Error in sendPutRequest:', error.response ? error.response.data : error.message);
            throw new DarkpoolException(`Failed to send request to booknode for url: ${url}`);
        }
    }

    private async sendRequest(req: any, url: string): Promise<any> {
        try {
            const result = await axios.post(`${this.configLoader.getConfig().bookNodeApiUrl}${url}`, req, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.configLoader.getConfig().bookNodeApiKey}`
                }
            });
            return result;
        } catch (error) {
            console.error('Error in sendRequest:', error.response ? error.response.data : error.message);
            throw new DarkpoolException(`Failed to send request to booknode for url: ${url}`);
        }
    }

    public async getMatchedOrderDetails(order: OrderDto): Promise<MatchedOrderDto> {
        const settlementDto = new SettlementDto();
        settlementDto.orderId = order.orderId;
        settlementDto.wallet = order.wallet;
        settlementDto.chainId = order.chainId;
        const result = await this.sendRequest(settlementDto, '/api/orders/matchdetails');
        const bookNodeMathedOrderDetail = result.data.data as BookNodeMatchedOrder;
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

    public async createOrder(orderDto: OrderDto): Promise<any> {
        let orderTriggerPrice = 0;
        if (orderDto.orderType === OrderType.STOP_LOSS_LIMIT
            || orderDto.orderType === OrderType.STOP_LOSS
            || orderDto.orderType === OrderType.TAKE_PROFIT
            || orderDto.orderType === OrderType.TAKE_PROFIT_LIMIT) {
            orderTriggerPrice = Number(orderDto.orderTriggerPrice);
        }

        const createOrderRequestDto: BookNodeCreateOrderDto = {
            chainId: orderDto.chainId,
            wallet: orderDto.wallet,
            orderId: orderDto.orderId,
            assetPairId: orderDto.assetPairId,
            orderDirection: orderDto.orderDirection,
            orderType: orderDto.orderType,
            timeInForce: orderDto.timeInForce,
            stpMode: orderDto.stpMode,
            orderTriggerPrice: orderTriggerPrice,
            price: Number(orderDto.price),
            amountOut: orderDto.amountOut.toString(),
            amountIn: orderDto.amountIn.toString(),
            partialAmountIn: orderDto.partialAmountIn.toString(),
            publicKey: orderDto.publicKey,
            nullifier: orderDto.nullifier.toString(),
            txHashCreated: orderDto.txHashCreated
        }
        const result = await this.sendRequest(createOrderRequestDto, '/api/orders/create');
        return result.data;
    }

    public async cancelOrder(cancelOrderDto: CancelOrderDto): Promise<any> {
        const result = await this.sendRequest(cancelOrderDto, '/api/orders/cancel');
        return result.data;
    }

    public async settleOrder(order: OrderDto, txHash: string): Promise<any> {
        const settlementDto = new SettlementDto();
        settlementDto.orderId = order.orderId;
        settlementDto.wallet = order.wallet;
        settlementDto.chainId = order.chainId;
        settlementDto.txHashSettled = txHash;
        const result = await this.sendRequest(settlementDto, '/api/orders/settle');
        return result.data;
    }

    public async confirmOrder(takerConfirmDto: TakerConfirmDto): Promise<any> {
        const result = await this.sendRequest(takerConfirmDto, '/api/orders/confirm');
        return result.data;
    }

    public async updateOrderPrice(updatePriceDto: UpdatePriceDto): Promise<any> {
        const bookNodeUpdatePriceDto: BookNodeUpdatePriceDto = {
            chainId: updatePriceDto.chainId,
            wallet: updatePriceDto.wallet,
            orderId: updatePriceDto.orderId,
            price: Number(updatePriceDto.price),
            amountIn: updatePriceDto.amountIn,
            partialAmountIn: updatePriceDto.partialAmountIn
        }
        const result = await this.sendPutRequest(bookNodeUpdatePriceDto, '/api/orders/price');
        return result.data;
    }
}