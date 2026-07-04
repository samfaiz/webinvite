import {
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Invitation } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateRsvpDto } from './rsvp.dto';

@Injectable()
export class RsvpService {
  private readonly logger = new Logger(RsvpService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  async create(slug: string, dto: CreateRsvpDto) {
    const inv = await this.prisma.invitation.findUnique({ where: { slug } });
    if (!inv || inv.status === 'draft')
      throw new NotFoundException('Invitation not found');
    if (inv.expiryDate && inv.expiryDate.getTime() < Date.now())
      throw new GoneException('This invitation has expired');

    const r = await this.prisma.rsvp.create({
      data: {
        invitationId: inv.id,
        guestName: dto.guestName,
        attending: dto.attending,
        guests: dto.guests ?? 1,
        message: dto.message,
      },
    });

    // instant heads-up to the couple — fire-and-forget so a mail hiccup can
    // never fail the guest's RSVP
    this.notifyOwner(inv, dto).catch((e) =>
      this.logger.warn(`RSVP notification not sent: ${(e as Error).message}`),
    );

    return { ok: true, id: r.id };
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

  async listForOwner(userId: string, invitationId: string) {
    const inv = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });
    if (!inv || inv.userId !== userId)
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
