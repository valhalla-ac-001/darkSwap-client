import { Module } from '@nestjs/common';
import { OrdersModule } from './orders/orders.module';
import { BasicModule } from './basic/basic.module';

@Module({
  imports: [
    OrdersModule,  // Import the Orders module
    BasicModule    // Import the Basic module
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}