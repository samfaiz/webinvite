import {
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRsvpDto } from './rsvp.dto';

@Injectable()
export class RsvpService {
  constructor(private prisma: PrismaService) {}

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
    return { ok: true, id: r.id };
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
