import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  controllers: [OrdersController], // 注册控制器
  providers: [OrdersService], // 注册服务
})
export class OrdersModule {}
