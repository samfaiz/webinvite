import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ReplyContactMessageDto, SubmitContactMessageDto } from './contact.dto';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

@Injectable()
export class ContactService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

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

  /** Answer a message from the admin inbox: sent through the site's own email
   *  (Admin → Email settings), so no mail app is needed on the admin's computer.
   *  Their original message is quoted under the reply. */
  async reply(id: string, dto: ReplyContactMessageDto) {
    const row = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Message not found');
    const body = dto.message.trim();
    if (!body) throw new BadRequestException('Please write a reply first.');
    const subject = dto.subject?.trim() || (row.subject ? `Re: ${row.subject}` : 'Re: your message');
    const when = row.createdAt.toUTCString().replace(/ GMT$/, ' UTC');
    const br = (t: string) => esc(t).replace(/\r?\n/g, '<br />');

    let sent = false;
    try {
      const result = await this.mail.send({
        to: row.email,
        subject,
        text: `${body}\n\n—\nOn ${when}, ${row.name} wrote:\n> ${row.message.replace(/\r?\n/g, '\n> ')}`,
        html:
          `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#2b2b2b;">${br(body)}</div>` +
          `<div style="margin-top:24px;padding-left:12px;border-left:3px solid #ddd;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;color:#777;">` +
          `On ${esc(when)}, ${esc(row.name)} wrote:<br />${br(row.message)}</div>`,
      });
      sent = result.sent;
    } catch (e) {
      throw new BadRequestException(`The email could not be sent: ${(e as Error).message}`);
    }
    if (!sent)
      throw new BadRequestException(
        'Email sending is switched off. Set it up in Admin → Email settings, then send again.',
      );

    return this.prisma.contactMessage.update({
      where: { id },
      data: { status: 'replied', repliedAt: new Date(), readAt: row.readAt ?? new Date(), replyText: body },
    });
  }

  async remove(id: string) {
    const row = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Message not found');
    await this.prisma.contactMessage.delete({ where: { id } });
    return { ok: true };
  }
}
