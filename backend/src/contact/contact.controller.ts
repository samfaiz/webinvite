import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ContactService } from './contact.service';
import { SubmitContactMessageDto } from './contact.dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/auth.decorators';

@Controller()
export class ContactController {
  constructor(private svc: ContactService) {}

  /** Public — submit a new message from the /contact form. */
  @Post('contact/messages')
  @HttpCode(200)
  submit(@Body() dto: SubmitContactMessageDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for']?.toString().split(',')[0].trim() as string) || req.ip;
    return this.svc.submit(dto, {
      ip,
      userAgent: req.headers['user-agent'] as string | undefined,
      source: dto.source,
    });
  }

  /* -------------------------------- admin ------------------------------- */

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/contact/messages')
  list(@Query('status') status?: string) {
    return this.svc.list(status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/contact/messages/unread-count')
  unread() {
    return this.svc.unreadCount().then((count) => ({ count }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/contact/messages/:id/read')
  markRead(@Param('id') id: string) {
    return this.svc.markRead(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/contact/messages/:id/replied')
  markReplied(@Param('id') id: string) {
    return this.svc.markReplied(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('admin/contact/messages/:id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
