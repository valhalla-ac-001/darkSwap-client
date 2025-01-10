import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WebSocket } from 'ws';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { SettlementService }  from './settlement/settlement.service';
import { AssetPairService } from './common/assetPair.service';

import * as crypto from 'crypto';
import { ConfigLoader } from './utils/configUtil';


async function bootstrap() {
  ConfigLoader.getInstance();
  const assetPairService = AssetPairService.getInstance();

  (global as any).crypto = {
    getRandomValues: (buffer: Uint8Array) => crypto.randomFillSync(buffer),
  };

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

  await app.listen(3000);
  startWebSocket();
}

function startWebSocket() {
  const booknodeUrl = ConfigLoader.getInstance().getConfig().bookNodeSocketUrl;

  if (!booknodeUrl) {
    throw new Error('BOOKNODE_URL is not set');
  }
  const ws = new WebSocket(booknodeUrl);

  ws.on('open', () => {
    console.log('Connected to BookNode server');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('close', () => {
    console.log('Disconnected from BookNode server');
  });

  ws.on('message', async (data) => {
    try{
      const settlementService = SettlementService.getInstance();
      const assetPairService = AssetPairService.getInstance();
      const notificationEvent = JSON.parse(data.toString());
      switch (notificationEvent.eventType) {
        case 1:
          await settlementService.takerSwap(notificationEvent.orderId);
          break;
        case 2:
          await settlementService.makerSwap(notificationEvent.orderId);
          break;
        case 3:
          await assetPairService.syncAssetPair(notificationEvent.assetPairId);
          break;
        default:
          console.log('Unknown event:', notificationEvent);
          break;
      }
    } catch (error) {
      console.error('Invalid message:', data.toString());
    }
    // Handle incoming messages
  });

}

bootstrap();