import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type ContentDoc } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SaveContentDto } from './content.dto';

type DocType = 'page' | 'post';

function safeParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  private slugify(s: string): string {
    return (
      s
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'untitled'
    );
  }

  /** Public/admin shape. `full` includes the block body. */
  private toDto(d: ContentDoc, full = false) {
    const base = {
      id: d.id,
      type: d.type as DocType,
      slug: d.slug,
      title: d.title,
      excerpt: d.excerpt,
      coverImage: d.coverImage,
      tags: safeParse<string[]>(d.tagsJson, []),
      authorName: d.authorName,
      status: d.status,
      seoTitle: d.seoTitle,
      seoDescription: d.seoDescription,
      ogImage: d.ogImage,
      noindex: d.noindex,
      publishedAt: d.publishedAt,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
    return full ? { ...base, blocks: safeParse<unknown[]>(d.blocksJson, []) } : base;
  }

  private data(dto: SaveContentDto) {
    return {
      type: dto.type,
      slug: this.slugify(dto.slug || dto.title),
      title: dto.title,
      excerpt: dto.excerpt ?? null,
      coverImage: dto.coverImage ?? null,
      blocksJson: JSON.stringify(dto.blocks ?? []),
      tagsJson: JSON.stringify(dto.tags ?? []),
      authorName: dto.authorName ?? null,
      seoTitle: dto.seoTitle ?? null,
      seoDescription: dto.seoDescription ?? null,
      ogImage: dto.ogImage ?? null,
      noindex: dto.noindex ?? false,
    };
  }

  /* ------------------------------- admin ------------------------------- */

  async create(dto: SaveContentDto) {
    try {
      const row = await this.prisma.contentDoc.create({ data: this.data(dto) });
      return this.toDto(row, true);
    } catch (e) {
      throw this.mapError(e, dto);
    }
  }

  async update(id: string, dto: SaveContentDto) {
    await this.mustExist(id);
    try {
      const row = await this.prisma.contentDoc.update({ where: { id }, data: this.data(dto) });
      return this.toDto(row, true);
    } catch (e) {
      throw this.mapError(e, dto);
    }
  }

  async publish(id: string) {
    const existing = await this.mustExist(id);
    const row = await this.prisma.contentDoc.update({
      where: { id },
      data: { status: 'published', publishedAt: existing.publishedAt ?? new Date() },
    });
    return this.toDto(row, true);
  }

  async unpublish(id: string) {
    await this.mustExist(id);
    const row = await this.prisma.contentDoc.update({ where: { id }, data: { status: 'draft' } });
    return this.toDto(row, true);
  }

  async remove(id: string) {
    await this.mustExist(id);
    await this.prisma.contentDoc.delete({ where: { id } });
    return { ok: true };
  }

  async listByType(type: DocType) {
    const rows = await this.prisma.contentDoc.findMany({
      where: { type },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async getById(id: string) {
    const row = await this.prisma.contentDoc.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Content not found');
    return this.toDto(row, true);
  }

  /* ------------------------------ public ------------------------------- */

  /** Published blog posts (newest first), without block bodies (for cards). */
  async listPublishedPosts() {
    const rows = await this.prisma.contentDoc.findMany({
      where: { type: 'post', status: 'published' },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => this.toDto(r));
  }

  /** Published pages (for sitemap + nav), without block bodies. */
  async listPublishedPages() {
    const rows = await this.prisma.contentDoc.findMany({
      where: { type: 'page', status: 'published' },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async getPublished(type: DocType, slug: string) {
    const row = await this.prisma.contentDoc.findUnique({
      where: { type_slug: { type, slug } },
    });
    if (!row || row.status !== 'published') throw new NotFoundException('Not found');
    return this.toDto(row, true);
  }

  /* ------------------------------ helpers ------------------------------ */

  private async mustExist(id: string) {
    const row = await this.prisma.contentDoc.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Content not found');
    return row;
  }

  private mapError(e: unknown, dto: SaveContentDto) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return new ConflictException(`A ${dto.type} with the slug "${this.slugify(dto.slug || dto.title)}" already exists.`);
    }
    return e as Error;
  }
}
