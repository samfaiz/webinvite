import {
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveInvitationDto } from './invitations.dto';
import type { Invitation } from '@prisma/client';

function toDate(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

@Injectable()
export class InvitationsService {
  constructor(private prisma: PrismaService) {}

  /** eventDate + expiryDate columns are derived from the content JSON. */
  private derive(content: Record<string, any>) {
    return {
      eventDate: toDate(content?.countdown?.targetDate),
      expiryDate: toDate(content?.expiry?.expiresAt),
    };
  }

  private full(inv: Invitation) {
    return {
      id: inv.id,
      slug: inv.slug,
      status: inv.status,
      templateId: inv.templateId,
      themeId: inv.themeId,
      motifId: inv.motifId,
      theme: JSON.parse(inv.themeJson),
      content: JSON.parse(inv.contentJson),
      ownerEmail: inv.ownerEmail,
      eventDate: inv.eventDate,
      expiryDate: inv.expiryDate,
      views: inv.views,
      publishedAt: inv.publishedAt,
      updatedAt: inv.updatedAt,
    };
  }

  private names(contentJson: string) {
    try {
      const c = JSON.parse(contentJson);
      return `${c.couple?.partner1?.name ?? ''} & ${c.couple?.partner2?.name ?? ''}`;
    } catch {
      return '';
    }
  }

  private async ensureOwner(userId: string, id: string): Promise<Invitation> {
    const inv = await this.prisma.invitation.findUnique({ where: { id } });
    if (!inv || inv.userId !== userId)
      throw new NotFoundException('Invitation not found');
    return inv;
  }

  async create(userId: string, dto: SaveInvitationDto) {
    const { eventDate, expiryDate } = this.derive(dto.content);
    const inv = await this.prisma.invitation.create({
      data: {
        userId,
        templateId: dto.templateId,
        themeId: dto.themeId,
        motifId: dto.motifId,
        themeJson: JSON.stringify(dto.theme),
        contentJson: JSON.stringify(dto.content),
        ownerEmail: dto.ownerEmail,
        eventDate,
        expiryDate,
      },
    });
    return this.full(inv);
  }

  /** URL-safe slug from free text ('' when nothing usable survives). */
  private sanitizeSlug(raw: string): string {
    return String(raw || '')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /** First free slug starting from `base` ("-2", "-3", … on collision). */
  private async uniqueSlug(base: string, excludeId: string): Promise<string> {
    let slug = base;
    let n = 1;
    while (
      await this.prisma.invitation.findFirst({ where: { slug, NOT: { id: excludeId } } })
    ) {
      n += 1;
      slug = `${base}-${n}`;
    }
    return slug;
  }

  async update(userId: string, id: string, dto: SaveInvitationDto) {
    const existing = await this.ensureOwner(userId, id);
    // Once published, the DB slug and the content's slug must stay in lockstep
    // (the RSVP form posts to the content slug). A different, valid slug typed
    // in the editor is a deliberate rename — move both together. Anything
    // else (unchanged, empty, unsanitizable) keeps the assigned slug, which
    // protects against stale drafts redirecting RSVPs.
    const content = dto.content as { meta?: { slug?: unknown } };
    let renamedSlug: string | undefined;
    if (existing.slug && content && typeof content === 'object') {
      const requested = this.sanitizeSlug(String(content.meta?.slug ?? ''));
      if (requested && requested !== existing.slug) {
        renamedSlug = await this.uniqueSlug(requested, id);
      }
      content.meta = { ...(content.meta || {}), slug: renamedSlug ?? existing.slug };
    }
    const { eventDate, expiryDate } = this.derive(dto.content);
    const inv = await this.prisma.invitation.update({
      where: { id },
      data: {
        templateId: dto.templateId,
        themeId: dto.themeId,
        motifId: dto.motifId,
        themeJson: JSON.stringify(dto.theme),
        contentJson: JSON.stringify(dto.content),
        ownerEmail: dto.ownerEmail,
        eventDate,
        expiryDate,
        ...(renamedSlug ? { slug: renamedSlug } : {}),
      },
    });
    return this.full(inv);
  }

  async listMine(userId: string) {
    const rows = await this.prisma.invitation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { rsvps: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      status: r.status,
      templateId: r.templateId,
      names: this.names(r.contentJson),
      eventDate: r.eventDate,
      expiryDate: r.expiryDate,
      views: r.views,
      rsvpCount: r._count.rsvps,
      updatedAt: r.updatedAt,
    }));
  }

  async getOwned(userId: string, id: string) {
    return this.full(await this.ensureOwner(userId, id));
  }

  async publish(userId: string, id: string) {
    const inv = await this.ensureOwner(userId, id);
    const content = JSON.parse(inv.contentJson);
    const base = this.sanitizeSlug(String(content?.meta?.slug || '')) || 'invite';
    const slug = await this.uniqueSlug(base, id);

    content.meta = { ...(content.meta || {}), slug };
    const { eventDate, expiryDate } = this.derive(content);
    const updated = await this.prisma.invitation.update({
      where: { id },
      data: {
        status: 'published',
        slug,
        contentJson: JSON.stringify(content),
        publishedAt: new Date(),
        eventDate,
        expiryDate,
      },
    });
    return this.full(updated);
  }

  async unpublish(userId: string, id: string) {
    await this.ensureOwner(userId, id);
    const inv = await this.prisma.invitation.update({
      where: { id },
      data: { status: 'draft' },
    });
    return this.full(inv);
  }

  async remove(userId: string, id: string) {
    await this.ensureOwner(userId, id);
    await this.prisma.invitation.delete({ where: { id } });
    return { ok: true };
  }

  /** Public render payload for a published, non-expired invite (counts a view). */
  async getPublicBySlug(slug: string) {
    const inv = await this.prisma.invitation.findUnique({ where: { slug } });
    if (!inv || inv.status === 'draft')
      throw new NotFoundException('Invitation not found');

    if (inv.expiryDate && inv.expiryDate.getTime() < Date.now()) {
      if (inv.status !== 'expired')
        await this.prisma.invitation.update({
          where: { id: inv.id },
          data: { status: 'expired' },
        });
      throw new GoneException('This invitation has expired');
    }

    await this.prisma.invitation.update({
      where: { id: inv.id },
      data: { views: { increment: 1 } },
    });

    // stamp the real slug into the served content: the RSVP form posts to
    // content.meta.slug, and the URL the guest is on is the source of truth
    const content = JSON.parse(inv.contentJson);
    content.meta = { ...(content.meta || {}), slug: inv.slug };

    return {
      templateId: inv.templateId,
      motifId: inv.motifId,
      theme: JSON.parse(inv.themeJson),
      content,
    };
  }
}
