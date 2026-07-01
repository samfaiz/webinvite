import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';

@Module({
  imports: [AiModule],
  controllers: [SeoController],
  providers: [SeoService],
})
export class SeoModule {}
