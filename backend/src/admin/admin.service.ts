import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { MailService } from '../mail/mail.service';
import { MailSettingsDto } from '../settings/settings.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
    private mail: MailService,
  ) {}

  async stats() {
    const [users, invitations, published, rsvps, views] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.invitation.count(),
      this.prisma.invitation.count({ where: { status: 'published' } }),
      this.prisma.rsvp.count(),
      this.prisma.invitation.aggregate({ _sum: { views: true } }),
    ]);
    return {
      users,
      invitations,
      published,
      drafts: invitations - published,
      rsvps,
      totalViews: views._sum.views ?? 0,
    };
  }

  async listInvitations() {
    const rows = await this.prisma.invitation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true, name: true } },
        _count: { select: { rsvps: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      status: r.status,
      templateId: r.templateId,
      owner: r.user.email,
      views: r.views,
      rsvpCount: r._count.rsvps,
      eventDate: r.eventDate,
      createdAt: r.createdAt,
    }));
  }

  async listUsers() {
    const rows = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { invitations: true } } },
    });
    return rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      invitations: u._count.invitations,
      createdAt: u.createdAt,
    }));
  }

  /** Admin resets a user's password. If no password is supplied a secure
   *  temporary one is generated and returned (so the admin can share it once);
   *  a supplied password is applied and never echoed back. */
  async resetUserPassword(userId: string, password?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    let plain = (password ?? '').trim();
    const generated = plain.length === 0;
    if (generated) plain = this.tempPassword();
    if (plain.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters.');
    }

    const passwordHash = await bcrypt.hash(plain, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { ok: true, email: user.email, password: generated ? plain : undefined };
  }

  private tempPassword(): string {
    const rnd = randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    return `Wi-${rnd}`.slice(0, 16);
  }

  /* ----------------------------- mail settings ----------------------------- */

  /** Current outgoing-email config. The password is never returned — only
   *  whether one is stored. `live` reflects whether real emails will be sent. */
  async getMailSettings() {
    const s = await this.settings.getAll();
    const cfg = await this.mail.resolveConfig();
    return {
      fromName: s['mail.fromName'] ?? '',
      fromEmail: s['mail.fromEmail'] ?? '',
      smtpHost: s['mail.smtpHost'] ?? '',
      smtpPort: s['mail.smtpPort'] ?? '',
      smtpUser: s['mail.smtpUser'] ?? '',
      smtpPassSet: Boolean(s['mail.smtpPass']),
      enabled: s['mail.enabled'] !== 'false',
      live: cfg.live,
      from: cfg.from,
    };
  }

  async saveMailSettings(dto: MailSettingsDto) {
    const entries: Record<string, string | undefined> = {
      'mail.fromName': dto.fromName,
      'mail.fromEmail': dto.fromEmail,
      'mail.smtpHost': dto.smtpHost,
      'mail.smtpPort': dto.smtpPort,
      'mail.smtpUser': dto.smtpUser,
      'mail.enabled': dto.enabled === undefined ? undefined : String(dto.enabled),
    };
    // only overwrite the stored password when a new, non-empty one is provided
    if (dto.smtpPass !== undefined && dto.smtpPass !== '') {
      entries['mail.smtpPass'] = dto.smtpPass;
    }
    await this.settings.setMany(entries);
    return this.getMailSettings();
  }

  sendTestEmail(to: string) {
    return this.mail.sendTest(to);
  }
}
