import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RsvpService } from './rsvp.service';
import { CreateRsvpDto } from './rsvp.dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthUser } from '../auth/auth.decorators';

@Controller()
export class RsvpController {
  constructor(private svc: RsvpService) {}

  @Post('public/invitations/:slug/rsvp')
  create(@Param('slug') slug: string, @Body() dto: CreateRsvpDto) {
    return this.svc.create(slug, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('invitations/:id/rsvps')
  list(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.listForOwner(user.id, id);
  }
}
