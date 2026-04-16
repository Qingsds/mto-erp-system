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
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { ProductionTaskModule } from './production-task/production-task.module';
import { NotificationModule } from './notification/notification.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    OrdersModule,
    PartsModule,
    DeliveriesModule,
    BillingModule,
    SealsModule,
    DocumentsModule,
    ProductionTaskModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
