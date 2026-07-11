import {
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Invitation } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { buildGuestEmail } from '../mail/guest-email';
import { CreateRsvpDto } from './rsvp.dto';

@Injectable()
export class RsvpService {
  private readonly logger = new Logger(RsvpService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private config: ConfigService,
  ) {}

  /** Public site origin for links/photos inside guest emails. */
  private origin(): string {
    return (this.config.get<string>('FRONTEND_ORIGIN') || 'http://localhost:3000').replace(/\/+$/, '');
  }

  async create(slug: string, dto: CreateRsvpDto) {
    const inv = await this.prisma.invitation.findUnique({ where: { slug } });
    if (!inv || inv.status === 'draft')
      throw new NotFoundException('Invitation not found');
    if (inv.expiryDate && inv.expiryDate.getTime() < Date.now())
      throw new GoneException('This invitation has expired');

    const email = dto.email?.trim().toLowerCase() || undefined;
    const r = await this.prisma.rsvp.create({
      data: {
        invitationId: inv.id,
        guestName: dto.guestName,
        attending: dto.attending,
        guests: dto.guests ?? 1,
        message: dto.message,
        email,
        subscribed: Boolean(email && dto.subscribed),
      },
    });

    // both mails are fire-and-forget — a mail hiccup can never fail the RSVP
    this.notifyOwner(inv, dto).catch((e) =>
      this.logger.warn(`RSVP notification not sent: ${(e as Error).message}`),
    );
    if (email) {
      this.sendGuestConfirmation(inv, dto, r.id, email).catch((e) =>
        this.logger.warn(`Guest confirmation not sent: ${(e as Error).message}`),
      );
    }

    return { ok: true, id: r.id };
  }

  /** Confirmation email to the guest (welcome + venue details when coming,
   *  a warm note when not). One per guest email per invitation, so the public
   *  form can't be abused to spam an inbox. */
  private async sendGuestConfirmation(
    inv: Invitation,
    dto: CreateRsvpDto,
    rsvpId: string,
    email: string,
  ) {
    // one confirmation per guest email PER OUTCOME — a guest who changes
    // their answer gets the confirmation matching the new response (so at
    // most 2 emails per address), and only DELIVERED sends count, so a
    // failed send (e.g. SMTP misconfigured at the time) can be retried
    const earlier = await this.prisma.rsvp.count({
      where: {
        invitationId: inv.id,
        email,
        attending: dto.attending,
        confirmedAt: { not: null },
        NOT: { id: rsvpId },
      },
    });
    if (earlier > 0) return;

    const owner = await this.prisma.user.findUnique({ where: { id: inv.userId } });
    const built = buildGuestEmail({
      content: JSON.parse(inv.contentJson),
      guestName: dto.guestName,
      attending: dto.attending as 'accept' | 'decline',
      guests: dto.guests,
      origin: this.origin(),
      slug: inv.slug ?? undefined,
      unsubscribeUrl:
        dto.subscribed && inv.slug
          ? `${this.origin()}/api/public/rsvps/${rsvpId}/unsubscribe`
          : undefined,
    });
    const result = await this.mail.send({
      to: email,
      subject: built.subject,
      text: built.text,
      html: built.html,
      replyTo: inv.ownerEmail || owner?.email || undefined,
    });
    // stamp only real deliveries (dev/jsonTransport sends report sent=false)
    if (result.sent) {
      await this.prisma.rsvp.update({ where: { id: rsvpId }, data: { confirmedAt: new Date() } });
    }
  }

  /** One-click unsubscribe (linked from guest emails; the cuid is the token). */
  async unsubscribe(rsvpId: string): Promise<boolean> {
    const r = await this.prisma.rsvp.findUnique({ where: { id: rsvpId } });
    if (!r) return false;
    if (r.subscribed)
      await this.prisma.rsvp.update({ where: { id: rsvpId }, data: { subscribed: false } });
    return true;
  }

  /** Email the couple the moment a guest responds: who, coming or not, and
   *  the running totals. Goes to the invitation's notification address,
   *  falling back to the owner's account email. */
  private async notifyOwner(inv: Invitation, dto: CreateRsvpDto) {
    const owner = await this.prisma.user.findUnique({ where: { id: inv.userId } });
    const to = inv.ownerEmail || owner?.email;
    if (!to) return;

    let names = inv.slug;
    try {
      const c = JSON.parse(inv.contentJson)?.couple;
      if (c?.partner1?.name && c?.partner2?.name) names = `${c.partner1.name} & ${c.partner2.name}`;
    } catch {
      /* keep slug */
    }

    const [rsvps, headcount] = await Promise.all([
      this.prisma.rsvp.findMany({ where: { invitationId: inv.id }, select: { attending: true } }),
      this.prisma.rsvp.aggregate({
        where: { invitationId: inv.id, attending: 'accept' },
        _sum: { guests: true },
      }),
    ]);
    const accepted = rsvps.filter((x) => x.attending === 'accept').length;
    const declined = rsvps.length - accepted;

    const coming = dto.attending === 'accept';
    const lines = [
      `${dto.guestName} just responded to your invitation (${names}):`,
      '',
      coming ? '✔ Joyfully accepts' : "✖ Regretfully declines",
      dto.guests && dto.guests > 1 ? `Party of ${dto.guests}` : undefined,
      dto.message ? `Message: “${dto.message}”` : undefined,
      '',
      `Totals so far — coming: ${accepted} (headcount ${headcount._sum.guests ?? 0}), not coming: ${declined}.`,
      `Invitation: /i/${inv.slug}`,
    ].filter((l): l is string => l !== undefined);

    await this.mail.send({
      to,
      subject: `RSVP: ${dto.guestName} ${coming ? 'is coming 🎉' : "can't make it"} — ${names}`,
      text: lines.join('\n'),
    });
  }

  async listForOwner(userId: string, invitationId: string, asAdmin = false) {
    const inv = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });
    if (!inv || (!asAdmin && inv.userId !== userId))
      throw new NotFoundException('Invitation not found');

    const rsvps = await this.prisma.rsvp.findMany({
      where: { invitationId },
      orderBy: { createdAt: 'desc' },
    });
    const accepted = rsvps.filter((r) => r.attending === 'accept');
    return {
      total: rsvps.length,
      accepted: accepted.length,
      declined: rsvps.length - accepted.length,
      headcount: accepted.reduce((s, r) => s + r.guests, 0),
      rsvps,
    };
  }
}
