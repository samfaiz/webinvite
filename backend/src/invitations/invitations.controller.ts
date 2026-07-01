import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { SaveInvitationDto } from './invitations.dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthUser } from '../auth/auth.decorators';

@Controller()
export class InvitationsController {
  constructor(private svc: InvitationsService) {}

  /* ----------------------------- owner ----------------------------- */

  @UseGuards(JwtAuthGuard)
  @Post('invitations')
  create(@CurrentUser() user: AuthUser, @Body() dto: SaveInvitationDto) {
    return this.svc.create(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('invitations')
  list(@CurrentUser() user: AuthUser) {
    return this.svc.listMine(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('invitations/:id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.getOwned(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('invitations/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SaveInvitationDto,
  ) {
    return this.svc.update(user.id, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('invitations/:id/publish')
  publish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.publish(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('invitations/:id/unpublish')
  unpublish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.unpublish(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('invitations/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.remove(user.id, id);
  }

  /* ----------------------------- public ----------------------------- */

  @Get('public/invitations/:slug')
  publicGet(@Param('slug') slug: string) {
    return this.svc.getPublicBySlug(slug);
  }
}
