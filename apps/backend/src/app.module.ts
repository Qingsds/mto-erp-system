import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';

import { OrdersModule } from './orders/orders.module';
import { PartsService } from './parts/parts.service';
import { PartsModule } from './parts/parts.module';

@Module({
  imports: [PrismaModule, OrdersModule, PartsModule],
  controllers: [AppController],
  providers: [AppService, PartsService],
})
export class AppModule {}
