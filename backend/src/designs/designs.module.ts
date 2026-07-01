import { Module } from '@nestjs/common';
import { DesignsService } from './designs.service';
import { DesignsController } from './designs.controller';

@Module({
  controllers: [DesignsController],
  providers: [DesignsService],
})
export class DesignsModule {}
