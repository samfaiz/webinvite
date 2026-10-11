import { Module } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  providers: [ContactService],
  controllers: [ContactController],
  exports: [ContactService],
})
export class ContactModule {}
