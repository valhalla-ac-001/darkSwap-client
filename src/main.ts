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
  startWebSocket();
}


bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});