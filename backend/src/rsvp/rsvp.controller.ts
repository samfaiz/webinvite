import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RsvpService } from './rsvp.service';
import { CreateRsvpDto } from './rsvp.dto';
import { buildGuestEmail } from '../mail/guest-email';
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

  /** One-click unsubscribe from guest emails — returns a tiny friendly page. */
  @Get('public/rsvps/:id/unsubscribe')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async unsubscribe(@Param('id') id: string) {
    const ok = await this.svc.unsubscribe(id);
    const msg = ok
      ? "You've been unsubscribed — you won't receive further updates about this wedding."
      : 'This unsubscribe link is no longer valid.';
    return `<!doctype html><html><body style="margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#f2efe9;font-family:Georgia,serif;color:#2b3a67;">
      <div style="text-align:center;padding:24px;"><h1 style="font-weight:normal;font-size:22px;">${ok ? 'Unsubscribed' : 'Link expired'}</h1>
      <p style="color:#5b6478;font-size:15px;">${msg}</p></div></body></html>`;
  }

  /** Live preview for the Studio's guest-email designer. Pure render of the
   *  posted content — no data access, works for drafts too. */
  @Post('public/email-preview')
  preview(
    @Body()
    body: {
      content?: Record<string, unknown>;
      kind?: string;
      guestName?: string;
    },
  ) {
    if (!body?.content || (body.kind !== 'accept' && body.kind !== 'decline'))
      throw new BadRequestException('content and kind (accept|decline) are required');
    const built = buildGuestEmail({
      content: body.content,
      guestName: (body.guestName || 'Aisha').slice(0, 120),
      attending: body.kind,
      guests: 2,
      origin: 'https://example.invalid',
      slug: String((body.content as { meta?: { slug?: string } })?.meta?.slug || '') || undefined,
      unsubscribeUrl: '#',
      allowDataUrls: true, // browser preview can render data: photos
    });
    return { subject: built.subject, html: built.html };
  }

  @UseGuards(JwtAuthGuard)
  @Get('invitations/:id/rsvps')
  list(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.listForOwner(user.id, id, user.role === 'admin');
  }
}
