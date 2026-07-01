import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { GaService } from './ga.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, GaService],
  exports: [AnalyticsService, GaService],
})
export class AnalyticsModule {}
