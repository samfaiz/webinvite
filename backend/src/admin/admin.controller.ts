import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
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

  /** Reset a user's password. Body `{ password? }` — omit to auto-generate a
   *  temporary one (returned in the response so the admin can share it). */
  @Post('users/:id/reset-password')
  resetPassword(@Param('id') id: string, @Body() dto: { password?: string }) {
    return this.svc.resetUserPassword(id, dto?.password);
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
