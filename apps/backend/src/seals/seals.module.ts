import { Module } from '@nestjs/common';
import { SealsService } from './seals.service';
import { SealsController } from './seals.controller';

@Module({
  controllers: [SealsController],
  providers: [SealsService],
})
export class SealsModule {}
