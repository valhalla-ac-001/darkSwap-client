import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import WebSocket from 'ws';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  await app.listen(3000);
  startWebSocket();
}

function startWebSocket() {
  const ws = new WebSocket('ws://booknode-server-url');

  ws.on('open', () => {
    console.log('Connected to BookNode server');
  });

  ws.on('message', (data) => {
    console.log('Received data from BookNode:', data);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('close', () => {
    console.log('Disconnected from BookNode server');
  });
}

bootstrap();