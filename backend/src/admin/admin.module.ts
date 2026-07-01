import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { SettingsModule } from '../settings/settings.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [SettingsModule, MailModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
