import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { ExcelService } from './excel.service';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';

@Module({
  imports: [MailModule],
  controllers: [ExportController],
  providers: [ExcelService, ExportService],
  exports: [ExportService],
})
export class ExportModule {}
