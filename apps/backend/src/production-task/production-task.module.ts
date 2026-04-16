import { Module } from '@nestjs/common';
import { ProductionTaskController } from './production-task.controller';
import { ProductionTaskService } from './production-task.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductionTaskController],
  providers: [ProductionTaskService]
})
export class ProductionTaskModule {}
