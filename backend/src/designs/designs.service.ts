import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveDesignDto } from './designs.dto';
import type { Design } from '@prisma/client';

@Injectable()
export class DesignsService {
  constructor(private prisma: PrismaService) {}

  private toDto(d: Design) {
    return {
      id: d.id,
      name: d.name,
      community: d.community,
      templateId: d.templateId,
      colors: JSON.parse(d.colorsJson),
      fonts: JSON.parse(d.fontsJson),
      particles: JSON.parse(d.particlesJson),
      backgrounds: JSON.parse(d.backgroundsJson),
      previewUrl: d.previewUrl,
      active: d.active,
      createdAt: d.createdAt,
      category: d.category,
      country: d.country,
      likes: d.likes,
      saves: d.saves,
    };
  }

  private data(dto: SaveDesignDto) {
    return {
      name: dto.name,
      community: dto.community,
      templateId: dto.templateId,
      colorsJson: JSON.stringify(dto.colors),
      fontsJson: JSON.stringify(dto.fonts),
      particlesJson: JSON.stringify(dto.particles),
      backgroundsJson: JSON.stringify(dto.backgrounds),
      previewUrl: dto.previewUrl,
      active: dto.active ?? true,
      ...(dto.category === undefined ? {} : { category: dto.category }),
      ...(dto.country === undefined ? {} : { country: dto.country }),
    };
  }

  async create(dto: SaveDesignDto) {
    return this.toDto(await this.prisma.design.create({ data: this.data(dto) }));
  }

  async update(id: string, dto: SaveDesignDto) {
    const exists = await this.prisma.design.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Design not found');
    return this.toDto(
      await this.prisma.design.update({ where: { id }, data: this.data(dto) }),
    );
  }

  async remove(id: string) {
    await this.prisma.design.delete({ where: { id } });
    return { ok: true };
  }

  /* ------------------ pushing a design back onto invitations ------------------
   *
   * An invitation does not reference a design. When one is created the
   * design's colours, fonts, particles and background art are COPIED into the
   * invitation's own themeJson, so later edits to the design row are invisible
   * to invitations that already exist — deliberately, since a published page
   * should not restyle itself under a couple.
   *
   * The only link back is the stamp `draftFromDesign` leaves on the copied
   * theme: its id is "design-<designId>". That is what these two methods
   * match on. Quoted so the id has to be a whole JSON string value rather
   * than an incidental substring of, say, an uploaded image URL.
   */

  private fromDesign(id: string) {
    return { themeJson: { contains: `"design-${id}"` } };
  }

  /** Preview: which invitations a re-apply would touch. */
  async usage(id: string) {
    await this.getOne(id); // 404s if the design is gone
    const rows = await this.prisma.invitation.findMany({
      where: this.fromDesign(id),
      select: { id: true, slug: true, status: true, ownerEmail: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
    return {
      total: rows.length,
      published: rows.filter((r) => r.status === 'published').length,
      // enough to recognise what is about to change without shipping the lot
      invitations: rows.slice(0, 50),
    };
  }

  /**
   * Copy the named parts of the design onto every invitation created from it.
   * Only those keys are replaced — the rest of each invitation's theme, and
   * all of its content, is left exactly as it was.
   *
   * This DOES overwrite a couple's own edits to the parts being re-applied;
   * there is no way to tell a couple's colour from an older design's colour
   * once both live in the same snapshot. The admin UI says so before running.
   */
  async reapply(id: string, parts: string[]) {
    const design = await this.prisma.design.findUnique({ where: { id } });
    if (!design) throw new NotFoundException('Design not found');

    const next: Record<string, unknown> = {};
    if (parts.includes('backgrounds')) next.backgrounds = JSON.parse(design.backgroundsJson);
    if (parts.includes('colors')) next.colors = JSON.parse(design.colorsJson);
    if (parts.includes('fonts')) next.fonts = JSON.parse(design.fontsJson);
    if (parts.includes('particles')) next.particles = JSON.parse(design.particlesJson);
    if (Object.keys(next).length === 0)
      throw new BadRequestException('Pick at least one part to re-apply');

    const rows = await this.prisma.invitation.findMany({
      where: this.fromDesign(id),
      select: { id: true, themeJson: true },
    });

    let updated = 0;
    let skipped = 0;
    for (const inv of rows) {
      let theme: Record<string, unknown>;
      try {
        theme = JSON.parse(inv.themeJson) as Record<string, unknown>;
      } catch {
        skipped += 1; // unreadable theme — leave it alone rather than replace it
        continue;
      }
      const merged = JSON.stringify({ ...theme, ...next });
      if (merged === inv.themeJson) continue; // already identical
      await this.prisma.invitation.update({
        where: { id: inv.id },
        data: { themeJson: merged },
      });
      updated += 1;
    }
    return { ok: true, matched: rows.length, updated, skipped };
  }

  async listAll() {
    const rows = await this.prisma.design.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((d) => this.toDto(d));
  }

  async listActive() {
    const rows = await this.prisma.design.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((d) => this.toDto(d));
  }

  async getOne(id: string) {
    const d = await this.prisma.design.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Design not found');
    return this.toDto(d);
  }

  /**
   * The explore feed: active designs matching the chip filters, most popular
   * first. "For You" is simply no filters. Ordering uses the denormalised
   * counters so this stays a single indexed query as the catalogue grows.
   */
  async explore(filter: { category?: string; community?: string; country?: string }) {
    const where: Record<string, unknown> = { active: true };
    if (filter.category) where.category = filter.category;
    if (filter.community) where.community = filter.community;
    if (filter.country) where.country = filter.country;
    const rows = await this.prisma.design.findMany({
      where,
      orderBy: [{ likes: 'desc' }, { saves: 'desc' }, { createdAt: 'desc' }],
      take: 60,
    });
    return rows.map((d) => this.toDto(d));
  }

  /**
   * Which designs this actor has liked / saved, for hydrating the feed.
   * Takes the actor rather than a user id so a signed-out guest still gets
   * their own likes back (they are keyed on a browser-local id).
   */
  async reactionsFor(actor: string) {
    const rows = await this.prisma.designReaction.findMany({
      where: { actor },
      select: { designId: true, kind: true },
    });
    return {
      likes: rows.filter((r) => r.kind === 'like').map((r) => r.designId),
      saves: rows.filter((r) => r.kind === 'save').map((r) => r.designId),
    };
  }

  /**
   * Toggle a like or save. The unique (design, user, kind) row is the source
   * of truth and the counter on Design is updated in the same transaction, so
   * a double-tap can never drift the count.
   */
  async react(
    { userId, guestKey }: { userId?: string; guestKey?: string },
    designId: string,
    kind: string,
  ) {
    if (kind !== 'like' && kind !== 'save')
      throw new BadRequestException('kind must be "like" or "save"');
    // Liking is open to everyone; saving needs somewhere to save to.
    if (kind === 'save' && !userId)
      throw new UnauthorizedException('Sign in to save designs');
    const actor = userId ? `u:${userId}` : guestKey ? `g:${guestKey}` : null;
    if (!actor) throw new BadRequestException('guestKey is required when signed out');

    const design = await this.prisma.design.findUnique({ where: { id: designId } });
    if (!design) throw new NotFoundException('Design not found');

    const existing = await this.prisma.designReaction.findUnique({
      where: { designId_actor_kind: { designId, actor, kind } },
    });
    const field = kind === 'like' ? 'likes' : 'saves';
    const delta = existing ? -1 : 1;

    const [, updated] = await this.prisma.$transaction([
      existing
        ? this.prisma.designReaction.delete({ where: { id: existing.id } })
        : this.prisma.designReaction.create({
            data: { designId, actor, userId: userId ?? null, kind },
          }),
      this.prisma.design.update({
        where: { id: designId },
        // guard against a negative count if a row was ever removed out of band
        data: { [field]: Math.max(0, design[field] + delta) },
      }),
    ]);

    return { kind, on: !existing, likes: updated.likes, saves: updated.saves };
  }
}
