import { Module } from '@nestjs/common';
import { BasicService } from './basic.service';
import { BasicController } from './basic.controller';

@Module({
  providers: [BasicService],
  controllers: [BasicController],
})
export class BasicModule {}