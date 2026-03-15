import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';

import { OrdersModule } from './orders/orders.module';
import { PartsService } from './parts/parts.service';
import { PartsModule } from './parts/parts.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { BillingModule } from './billing/billing.module';
import { SealsModule } from './seals/seals.module';
import { DocumentsModule } from './documents/documents.module';

@Module({
  imports: [
    PrismaModule,
    OrdersModule,
    PartsModule,
    DeliveriesModule,
    BillingModule,
    SealsModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PartsService],
})
export class AppModule {}
