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

  /**
   * Everything the admin dashboard needs, in one round trip.
   *
   * Every figure here is measured, not estimated. Note the RSVP split is
   * two-way: the schema stores "accept" | "decline" only, so there is no
   * "maybe" bucket to report.
   */
  async dashboard() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 864e5);
    /** Monday 00:00 of the week containing `d`. */
    const weekStart = (d: Date) => {
      const s = new Date(d);
      s.setHours(0, 0, 0, 0);
      s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
      return s;
    };
    const firstWeek = weekStart(new Date(now.getTime() - 11 * 7 * 864e5));

    const [
      base,
      newUsers,
      newInvitations,
      newRsvps,
      accepted,
      declined,
      byTemplate,
      views,
      rsvpRows,
      unreadEnquiries,
    ] = await Promise.all([
      this.stats(),
      this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.invitation.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.rsvp.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.rsvp.count({ where: { attending: 'accept' } }),
      this.prisma.rsvp.count({ where: { attending: 'decline' } }),
      this.prisma.invitation.groupBy({
        by: ['templateId'],
        _count: { templateId: true },
        orderBy: { _count: { templateId: 'desc' } },
        take: 5,
      }),
      this.prisma.pageView.findMany({
        where: { createdAt: { gte: firstWeek } },
        select: { createdAt: true },
      }),
      this.prisma.rsvp.findMany({
        where: { createdAt: { gte: firstWeek } },
        select: { createdAt: true },
      }),
      this.prisma.contactMessage.count({ where: { status: 'new' } }),
    ]);

    // 12 weekly buckets, oldest first.
    const buckets = Array.from({ length: 12 }, (_, i) => {
      const start = new Date(firstWeek.getTime() + i * 7 * 864e5);
      return {
        label: start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        start: start.getTime(),
        views: 0,
        rsvps: 0,
      };
    });
    const bucketFor = (d: Date) =>
      Math.min(11, Math.max(0, Math.floor((d.getTime() - firstWeek.getTime()) / (7 * 864e5))));
    for (const v of views) buckets[bucketFor(v.createdAt)].views++;
    for (const r of rsvpRows) buckets[bucketFor(r.createdAt)].rsvps++;

    const staleDrafts = await this.prisma.invitation.count({
      where: { status: 'draft', updatedAt: { lt: new Date(now.getTime() - 30 * 864e5) } },
    });

    return {
      ...base,
      deltas: { users: newUsers, invitations: newInvitations, rsvps: newRsvps },
      staleDrafts,
      unreadEnquiries,
      rsvpSplit: { accepted, declined },
      topTemplates: byTemplate.map((t) => ({
        templateId: t.templateId,
        count: t._count.templateId,
      })),
      weeks: buckets.map(({ label, views: v, rsvps: r }) => ({ label, views: v, rsvps: r })),
    };
  }

  /** Couple names out of an invitation's content JSON. */
  private coupleNames(contentJson: string): string {
    try {
      const c = JSON.parse(contentJson)?.couple;
      return c?.partner1?.name && c?.partner2?.name
        ? `${c.partner1.name} & ${c.partner2.name}`
        : 'Untitled invitation';
    } catch {
      return 'Untitled invitation';
    }
  }

  async listInvitations() {
    const rows = await this.prisma.invitation.findMany({
      orderBy: { updatedAt: 'desc' },
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
      names: this.coupleNames(r.contentJson),
      owner: r.user.email,
      ownerEmail: r.user.email,
      ownerName: r.user.name ?? '',
      views: r.views,
      rsvpCount: r._count.rsvps,
      eventDate: r.eventDate,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
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
      canDuplicate: u.canDuplicate,
      invitations: u._count.invitations,
      createdAt: u.createdAt,
    }));
  }

  /** Admin toggles per-user feature permissions (currently: duplicate). */
  async setUserPermissions(userId: string, perms: { canDuplicate?: boolean }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(perms.canDuplicate === undefined ? {} : { canDuplicate: perms.canDuplicate }),
      },
    });
    return { id: updated.id, email: updated.email, canDuplicate: updated.canDuplicate };
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
    // trim everything — a trailing space pasted from a password manager or
    // hosting panel otherwise reaches the SMTP server verbatim and fails
    // auth (535) with no visible cause
    const entries: Record<string, string | undefined> = {
      'mail.fromName': dto.fromName?.trim(),
      'mail.fromEmail': dto.fromEmail?.trim(),
      'mail.smtpHost': dto.smtpHost?.trim(),
      'mail.smtpPort': dto.smtpPort?.trim(),
      'mail.smtpUser': dto.smtpUser?.trim(),
      'mail.enabled': dto.enabled === undefined ? undefined : String(dto.enabled),
    };
    // only overwrite the stored password when a new, non-empty one is provided
    const pass = dto.smtpPass?.trim();
    if (pass) {
      entries['mail.smtpPass'] = pass;
    }
    await this.settings.setMany(entries);
    return this.getMailSettings();
  }

  sendTestEmail(to: string) {
    return this.mail.sendTest(to);
  }
}
