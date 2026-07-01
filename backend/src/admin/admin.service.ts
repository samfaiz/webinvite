import { Injectable } from '@nestjs/common';
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
