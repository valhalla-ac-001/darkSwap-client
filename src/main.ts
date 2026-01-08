import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'reflect-metadata';
import { AppModule } from './app.module';
import { AssetPairService } from './common/assetPair.service';
import { DarkSwapExceptionFilter } from './common/exception.filter';
import { ResponseInterceptor } from './common/response.interceptor';
import { ConfigLoader } from './utils/configUtil';

import { startWebSocket } from './wsmain';
import { WalletMutexService } from './common/mutex/walletMutex.service';
import dotenv from 'dotenv';


dotenv.config();

// Global error handlers to prevent server crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - log and continue
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit for rate limit errors
  if (error.message?.includes('request limit reached')) {
    console.warn('Rate limit error caught - server continuing...');
    return;
  }
  // For other critical errors, exit gracefully
  console.error('Critical error - exiting...');
  process.exit(1);
});

async function bootstrap() {
  try {
    ConfigLoader.getInstance();
  } catch (error) {
    console.error('Failed to load config:', error);
    throw error;
  }
  
  const assetPairService = AssetPairService.getInstance();

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  app.useGlobalFilters(new DarkSwapExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger config
  const config = new DocumentBuilder()
    .setTitle('API doc')
    .setDescription('API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await assetPairService.syncAssetPairs();
  const wallets = ConfigLoader.getInstance().getConfig().wallets.map((wallet) => wallet.address.toLowerCase());
  const chains = ConfigLoader.getInstance().getConfig().chainRpcs.map((rpc) => rpc.chainId);
  chains.forEach((chainId) => {
    WalletMutexService.getInstance().init(chainId, wallets);
  });

  const port = process.env.PORT || 3002;
  await app.listen(port);
  const stopWebSocket = startWebSocket();

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    
    // Stop WebSocket connection
    if (stopWebSocket) {
      console.log('Closing WebSocket connection...');
      stopWebSocket();
    }
    
    // Close NestJS app
    console.log('Closing HTTP server...');
    await app.close();
    
    console.log('Shutdown complete. Exiting...');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}


bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});