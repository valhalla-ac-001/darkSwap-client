import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WebSocket } from 'ws';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import crypto from 'crypto';
import { ConfigLoader } from './utils/configUtil';
(global as any).crypto = crypto;


async function bootstrap() {
  ConfigLoader.getInstance();

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

  await app.listen(3001);
  // startWebSocket();
}

function startWebSocket() {
  const booknodeUrl = process.env.BOOKNODE_URL;
  if (!booknodeUrl) {
    throw new Error('BOOKNODE_URL is not set');
  }
  const ws = new WebSocket(booknodeUrl);

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