import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'reflect-metadata';
import { AppModule } from './app.module';
import { AssetPairService } from './common/assetPair.service';
import { DarkSwapExceptionFilter } from './common/exception.filter';
import { ResponseInterceptor } from './common/response.interceptor';
import { ConfigLoader } from './utils/configUtil';

import { startWebSocket } from './wsmain';
import { WalletMutexService } from './common/mutex/walletMutex.service';

async function bootstrap() {
  ConfigLoader.getInstance();
  const assetPairService = AssetPairService.getInstance();

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
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


bootstrap();