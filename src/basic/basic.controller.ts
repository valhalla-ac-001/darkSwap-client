import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { BasicService } from './basic.service';

@Controller('basic')
export class BasicController {
  constructor(private readonly basicService: BasicService) {}

  @Post('deposit')
  deposit() {
    return this.basicService.deposit();
  }

  @Post('withdraw')
  withdraw() {
    return this.basicService.withdraw();
  }

}