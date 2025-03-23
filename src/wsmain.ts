import { WebSocket } from 'ws';
import { ConfigLoader } from './utils/configUtil';
import { SettlementService } from './settlement/settlement.service';
import { AssetPairService } from './common/assetPair.service';
import { OrderService } from './orders/order.service';


enum EventType {
    OrderMatched = 1,
    OrderConfirmed = 2,
    OrderSettled = 3,
    AssetPairCreated = 4,
    orderCancelled = 5,
    Unknown = 0
}

interface QueuedMessage {
    data: string;
}

enum ProcessingState {
    Idle = 'idle',
    Processing = 'processing'
}

const messageQueue: QueuedMessage[] = [];
let processingState: ProcessingState = ProcessingState.Idle;

async function processMessage(message: QueuedMessage): Promise<void> {
    try {
        const settlementService = SettlementService.getInstance();
        const assetPairService = AssetPairService.getInstance();
        const notificationEvent = JSON.parse(message.data);
        const orderService = OrderService.getInstance();

        switch (notificationEvent.eventType) {
            case EventType.OrderMatched:
                console.log('Event for order matched: ', notificationEvent.orderId);
                await settlementService.takerConfirm(notificationEvent.orderId);
                break;
            case EventType.OrderConfirmed:
                console.log('Event for order confirmed: ', notificationEvent.orderId);
                await settlementService.makerSwap(notificationEvent.orderId);
                break;
            case EventType.OrderSettled:
                console.log('Event for order settled: ', notificationEvent.orderId);
                await settlementService.takerPostSettlement(notificationEvent.orderId, notificationEvent.txHash || '');
                break;
            case EventType.AssetPairCreated:
                await assetPairService.syncAssetPair(notificationEvent.assetPairId, notificationEvent.chainId);
                break;
            case EventType.orderCancelled:
                await orderService.cancelOrderByNotificaion(notificationEvent.orderId);
                break;
            default:
                console.log('Unknown event:', notificationEvent);
                break;
        }
    } catch (error) {
        console.log(error.stack, error.message);
        console.error('Invalid message:', message.data);
    }
}

async function processMessageQueue(): Promise<void> {
    if (processingState === ProcessingState.Processing || messageQueue.length === 0) {
        return;
    }

    processingState = ProcessingState.Processing;
    
    try {
        while (messageQueue.length > 0) {
            const message = messageQueue.shift();
            if (message) {
                await processMessage(message);
            }
        }
    } catch (error) {
        console.error('Error processing message:', error);
    } finally {
        processingState = ProcessingState.Idle;
    }
}

function enqueueMessage(data: string): void {
    messageQueue.push({ data });
    if (processingState === ProcessingState.Idle) {
        setImmediate(() => processMessageQueue());
    }
}

export function startWebSocket() {
    const booknodeUrl = ConfigLoader.getInstance().getConfig().bookNodeSocketUrl;

    if (!booknodeUrl) {
        throw new Error('BOOKNODE_URL is not set');
    }

    let ws: WebSocket;
    let isReconnecting = false;
    let reconnectTimeout: NodeJS.Timeout;
    
    let heartbeatInterval: NodeJS.Timeout;
    let lastHeartbeatTime: number = Date.now();
    const HEARTBEAT_INTERVAL = 30000;
    const HEARTBEAT_TIMEOUT = HEARTBEAT_INTERVAL * 3;

    const updateLastHeartbeat = () => {
        lastHeartbeatTime = Date.now();
        console.log('Heartbeat updated to:', new Date(lastHeartbeatTime).toUTCString());
    };

    const startHeartbeatCheck = () => {
        heartbeatInterval = setInterval(() => {
            const currentTime = Date.now();
            if (currentTime - lastHeartbeatTime >= HEARTBEAT_TIMEOUT) {
                console.log('Heartbeat timeout, reconnecting...');
                cleanup();
                reconnect();
            }
        }, HEARTBEAT_INTERVAL);
    };

    const cleanup = () => {
        if (ws) {
            ws.removeAllListeners();
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        }
        clearInterval(heartbeatInterval);
    };

    const connect = () => {
        cleanup();
        
        ws = new WebSocket(booknodeUrl);

        ws.on('open', () => {
            console.log('Connected to BookNode server');
            isReconnecting = false;
            const authMessage = JSON.stringify({
                type: 'auth',
                token: ConfigLoader.getInstance().getConfig().bookNodeApiKey
            });

            ws.send(authMessage);
            updateLastHeartbeat();
            startHeartbeatCheck();
        });

        ws.on('ping', () => {
            updateLastHeartbeat();
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            clearInterval(heartbeatInterval);
            isReconnecting = false;
            reconnect();
        });

        ws.on('close', () => {
            console.log('Disconnected from BookNode server');
            clearInterval(heartbeatInterval);
            reconnect();
        });

        ws.on('message', (data) => {
            console.log('Received message:', data.toString());
            updateLastHeartbeat();
            enqueueMessage(data.toString());
        });
    };

    const reconnect = () => {
        if (isReconnecting) {
            clearTimeout(reconnectTimeout);
        }
        isReconnecting = true;
        console.log('Attempting to reconnect...');
        reconnectTimeout = setTimeout(() => {
            connect();
        }, 10000);
    };

    connect();

    return () => {
        clearTimeout(reconnectTimeout);
        cleanup();
    };
}