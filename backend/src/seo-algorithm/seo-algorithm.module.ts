import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { SeoAlgorithmController } from './seo-algorithm.controller';
import { SeoAlgorithmService } from './seo-algorithm.service';

@Module({
  imports: [AiModule],
  controllers: [SeoAlgorithmController],
  providers: [SeoAlgorithmService],
  exports: [SeoAlgorithmService],
})
export class SeoAlgorithmModule {}
