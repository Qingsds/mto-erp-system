import { Module } from '@nestjs/common';
import { SealsService } from './seals.service';
import { SealsController } from './seals.controller';
import { StorageModule } from '../storage/storage.module';
import { SealImageService } from './seal-image.service';

@Module({
  imports: [StorageModule],
  controllers: [SealsController],
  providers: [SealsService, SealImageService],
})
export class SealsModule {}
