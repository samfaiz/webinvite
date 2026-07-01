import { Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthUser } from '../auth/auth.decorators';

@UseGuards(JwtAuthGuard)
@Controller('invitations')
export class ExportController {
  constructor(private svc: ExportService) {}

  /** Download the RSVP attendee list as an .xlsx file. */
  @Get(':id/rsvps.xlsx')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.svc.download(id, user.id);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.end(buffer);
  }

  /** Email the RSVP attendee list (Excel attached) to the invitation owner. */
  @Post(':id/send-export')
  send(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.emailById(id, user.id);
  }
}
