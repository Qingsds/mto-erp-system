import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';

import { OrdersModule } from './orders/orders.module';
import { PartsModule } from './parts/parts.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { BillingModule } from './billing/billing.module';
import { SealsModule } from './seals/seals.module';
import { DocumentsModule } from './documents/documents.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    OrdersModule,
    PartsModule,
    DeliveriesModule,
    BillingModule,
    SealsModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
