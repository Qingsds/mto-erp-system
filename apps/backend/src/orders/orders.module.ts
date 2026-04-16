import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [OrdersController], // 注册控制器
  providers: [OrdersService], // 注册服务
})
export class OrdersModule {}
