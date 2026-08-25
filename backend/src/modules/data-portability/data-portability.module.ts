import { Module } from '@nestjs/common';
import { DataPortabilityController } from './data-portability.controller';
import { DataPortabilityService } from './data-portability.service';

@Module({
  controllers: [DataPortabilityController],
  providers: [DataPortabilityService],
  exports: [DataPortabilityService],
})
export class DataPortabilityModule {}
