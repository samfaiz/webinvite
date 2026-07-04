import { Module } from '@nestjs/common';
import { RsvpService } from './rsvp.service';
import { RsvpController } from './rsvp.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [RsvpController],
  providers: [RsvpService],
})
export class RsvpModule {}
