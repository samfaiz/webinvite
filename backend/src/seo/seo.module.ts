import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';

@Module({
  imports: [AiModule, AnalyticsModule],
  controllers: [SeoController],
  providers: [SeoService],
})
export class SeoModule {}
