import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { IntegrationsController } from './integrations.controller';

@Module({
  imports: [AiModule, AnalyticsModule],
  controllers: [IntegrationsController],
})
export class IntegrationsModule {}
