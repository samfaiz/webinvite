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
