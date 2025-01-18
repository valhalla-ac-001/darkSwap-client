import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'reflect-metadata';
import { WebSocket } from 'ws';
import { AppModule } from './app.module';
import { AssetPairService } from './common/assetPair.service';
import { SettlementService } from './settlement/settlement.service';
import { ConfigLoader } from './utils/configUtil';

enum EventType {
  OrderMatched = 1,
  OrderConfirm = 2,
  OrderSettled = 3,
  AssetPairCreated = 4,
  Unknown = 0
}

async function bootstrap() {
  ConfigLoader.getInstance();
  const assetPairService = AssetPairService.getInstance();

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  // Swagger config
  const config = new DocumentBuilder()
    .setTitle('API doc')
    .setDescription('API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await assetPairService.syncAssetPairs();

  await app.listen(3002);
  startWebSocket();
}

function startWebSocket() {
  const booknodeUrl = ConfigLoader.getInstance().getConfig().bookNodeSocketUrl;

  if (!booknodeUrl) {
    throw new Error('BOOKNODE_URL is not set');
  }

  let ws: WebSocket;

  const connect = () => {
    ws = new WebSocket(booknodeUrl);

    ws.on('open', () => {
      console.log('Connected to BookNode server');
      const authMessage = JSON.stringify({
        type: 'auth',
        token: ConfigLoader.getInstance().getConfig().bookNodeApiKey
      });

      ws.send(authMessage);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      reconnect();
    });

    ws.on('close', () => {
      console.log('Disconnected from BookNode server');
      reconnect();
    });

    ws.on('message', async (data) => {
      try {
        const settlementService = SettlementService.getInstance();
        const assetPairService = AssetPairService.getInstance();
        const notificationEvent = JSON.parse(data.toString());
        switch (notificationEvent.eventType) {
          case EventType.OrderMatched:
            await settlementService.takerSwap(notificationEvent.orderId);
            break;
          case EventType.OrderConfirm:
            await settlementService.makerSwap(notificationEvent.orderId);
            break;
          case EventType.OrderSettled:
            await settlementService.takerPostSettlement(notificationEvent.orderId, notificationEvent.txHash || '');
            break;
          case EventType.AssetPairCreated:
            await assetPairService.syncAssetPair(notificationEvent.assetPairId, notificationEvent.chainId);
            break;
          default:
            console.log('Unknown event:', notificationEvent);
            break;
        }
      } catch (error) {
        console.log(error.stack, error.message);
        console.error('Invalid message:', data.toString());
      }
    });
  };

  const reconnect = () => {
    console.log('Attempting to reconnect...');
    setTimeout(connect, 10000);
  };

  connect();
}

bootstrap();