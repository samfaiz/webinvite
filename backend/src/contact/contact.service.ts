import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitContactMessageDto } from './contact.dto';

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) {}

  /** Rough IP anonymisation — trims to /24 for IPv4, /48 for IPv6, so we still
   *  see roughly-where without storing anyone's exact address. */
  private anonymiseIp(ip?: string): string | null {
    if (!ip) return null;
    const clean = ip.replace(/^::ffff:/, '');
    if (clean.includes('.')) {
      const parts = clean.split('.');
      return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.0` : clean.slice(0, 40);
    }
    if (clean.includes(':')) {
      const parts = clean.split(':').filter(Boolean);
      return parts.slice(0, 3).join(':') + '::';
    }
    return clean.slice(0, 40);
  }

  /** Public — accept a submission from the /contact form. */
  async submit(dto: SubmitContactMessageDto, meta: { ip?: string; userAgent?: string; source?: string }) {
    const row = await this.prisma.contactMessage.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone?.trim() || null,
        subject: dto.subject?.trim() || null,
        message: dto.message.trim(),
        source: (meta.source || 'contact-page').slice(0, 40),
        ip: this.anonymiseIp(meta.ip),
        userAgent: meta.userAgent?.slice(0, 240) || null,
      },
    });
    // Frontend only needs a confirmation — never leak the stored id publicly.
    return { ok: true, receivedAt: row.createdAt };
  }

  /* ------------------------------- admin ------------------------------- */

  async list(status?: string) {
    return this.prisma.contactMessage.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async unreadCount() {
    return this.prisma.contactMessage.count({ where: { status: 'new' } });
  }

  async markRead(id: string) {
    const row = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Message not found');
    return this.prisma.contactMessage.update({
      where: { id },
      data: { status: 'read', readAt: row.readAt ?? new Date() },
    });
  }

  async markReplied(id: string) {
    const row = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Message not found');
    return this.prisma.contactMessage.update({
      where: { id },
      data: { status: 'replied', repliedAt: new Date(), readAt: row.readAt ?? new Date() },
    });
  }

  async remove(id: string) {
    const row = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Message not found');
    await this.prisma.contactMessage.delete({ where: { id } });
    return { ok: true };
  }
}
