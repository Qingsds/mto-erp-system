import { Module } from '@nestjs/common';
import { SealsService } from './seals.service';
import { SealsController } from './seals.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [SealsController],
  providers: [SealsService],
})
export class SealsModule {}
