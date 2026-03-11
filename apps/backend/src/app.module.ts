import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { OrdersController } from './orders/orders.controller';

@Module({
  imports: [PrismaModule, OrdersController],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
