import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/auth.decorators';
import { MailSettingsDto, TestMailDto } from '../settings/settings.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private svc: AdminService) {}

  @Get('stats')
  stats() {
    return this.svc.stats();
  }

  @Get('invitations')
  invitations() {
    return this.svc.listInvitations();
  }

  @Get('users')
  users() {
    return this.svc.listUsers();
  }

  /* outgoing-email configuration */
  @Get('settings/mail')
  getMail() {
    return this.svc.getMailSettings();
  }

  @Put('settings/mail')
  saveMail(@Body() dto: MailSettingsDto) {
    return this.svc.saveMailSettings(dto);
  }

  @Post('settings/mail/test')
  testMail(@Body() dto: TestMailDto) {
    return this.svc.sendTestEmail(dto.to);
  }
}
