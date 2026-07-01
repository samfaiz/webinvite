import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import type { ContentDoc, SeoProposal } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

type MemoryNote = { at: string; note: string; source: string };

const ALLOWED_BLOCK_TYPES = ['heading', 'paragraph', 'image', 'quote', 'button', 'list', 'divider', 'hero'];

function safeParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);

  constructor(
    private prisma: PrismaService,
    private ai: AiService,
    private config: ConfigService,
  ) {}

  status() {
    return { configured: this.ai.isConfigured(), model: this.ai.getModel() };
  }

  /* --------------------------- text extraction --------------------------- */

  private urlFor(doc: Pick<ContentDoc, 'type' | 'slug'>): string {
    const origin = (this.config.get<string>('FRONTEND_ORIGIN') || 'https://webinvite.co').split(',')[0].trim();
    return `${origin}${doc.type === 'post' ? '/blog/' : '/p/'}${doc.slug}`;
  }

  /** Flatten a doc's blocks into plain text for the model. */
  private bodyText(doc: ContentDoc): string {
    const parts: string[] = [doc.title];
    if (doc.excerpt) parts.push(doc.excerpt);
    const blocks = safeParse<Array<Record<string, unknown>>>(doc.blocksJson, []);
    for (const b of blocks) {
      for (const key of ['heading', 'sub', 'text', 'caption', 'label']) {
        if (typeof b[key] === 'string') parts.push(b[key] as string);
      }
      if (Array.isArray(b.items)) parts.push((b.items as unknown[]).map(String).join(', '));
    }
    return parts.filter(Boolean).join('\n');
  }

  /* ------------------------------- memory -------------------------------- */

  async getMemory(contentId: string): Promise<MemoryNote[]> {
    const m = await this.prisma.seoMemory.findUnique({ where: { contentId } });
    return safeParse<MemoryNote[]>(m?.notesJson ?? null, []);
  }

  private async appendMemory(contentId: string, note: string, source: string) {
    const notes = await this.getMemory(contentId);
    notes.push({ at: new Date().toISOString(), note, source });
    const notesJson = JSON.stringify(notes.slice(-30)); // keep last 30
    await this.prisma.seoMemory.upsert({
      where: { contentId },
      create: { contentId, notesJson },
      update: { notesJson },
    });
  }

  /* ----------------------------- generation ------------------------------ */

  private async runSeo(doc: ContentDoc) {
    const memory = (await this.getMemory(doc.id)).map((n) => n.note);
    return this.ai.generateSeo({
      title: doc.title,
      url: this.urlFor(doc),
      body: this.bodyText(doc),
      currentTitle: doc.seoTitle,
      currentDescription: doc.seoDescription,
      memory,
    });
  }

  /** Editor "Suggest with AI" — returns a suggestion without persisting it. */
  async suggest(contentId: string) {
    const doc = await this.mustGetDoc(contentId);
    return this.runSeo(doc);
  }

  /** Create a persisted proposal (queued for admin review). */
  async proposeForContent(contentId: string, source: 'audit' | 'manual') {
    const doc = await this.mustGetDoc(contentId);
    const s = await this.runSeo(doc);
    const row = await this.prisma.seoProposal.create({
      data: {
        contentId,
        source,
        status: 'pending',
        score: s.score,
        seoTitle: s.seoTitle,
        seoDescription: s.seoDescription,
        issuesJson: JSON.stringify(s.issues),
        rationale: s.rationale,
      },
    });
    return this.proposalDto(row, doc);
  }

  /** Audit every published doc that doesn't already have a pending proposal. */
  async runAudit() {
    if (!this.ai.isConfigured()) {
      throw new BadRequestException('AI is not configured. Set ANTHROPIC_API_KEY in the backend environment.');
    }
    const docs = await this.prisma.contentDoc.findMany({ where: { status: 'published' } });
    let proposed = 0;
    let skipped = 0;
    for (const doc of docs) {
      const pending = await this.prisma.seoProposal.count({ where: { contentId: doc.id, status: 'pending' } });
      if (pending > 0) {
        skipped++;
        continue;
      }
      try {
        await this.proposeForContent(doc.id, 'audit');
        proposed++;
      } catch (e) {
        this.logger.error(`Audit failed for ${doc.id}: ${(e as Error).message}`);
      }
    }
    this.logger.log(`SEO audit: ${proposed} proposed, ${skipped} skipped (had pending), ${docs.length} published`);
    return { proposed, skipped, total: docs.length };
  }

  /* ------------------------------ review --------------------------------- */

  async listProposals(status = 'pending') {
    const rows = await this.prisma.seoProposal.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      include: { content: true },
    });
    return rows.map((r) => this.proposalDto(r, r.content));
  }

  async approve(id: string) {
    const p = await this.prisma.seoProposal.findUnique({ where: { id }, include: { content: true } });
    if (!p) throw new NotFoundException('Proposal not found');
    if (p.status !== 'pending') throw new BadRequestException('This proposal was already reviewed.');

    await this.prisma.contentDoc.update({
      where: { id: p.contentId },
      data: {
        ...(p.seoTitle ? { seoTitle: p.seoTitle } : {}),
        ...(p.seoDescription ? { seoDescription: p.seoDescription } : {}),
      },
    });
    await this.appendMemory(
      p.contentId,
      `Applied AI SEO — title: "${p.seoTitle ?? ''}" | description: "${p.seoDescription ?? ''}" (prior score ${p.score ?? 'n/a'})`,
      p.source,
    );
    const row = await this.prisma.seoProposal.update({
      where: { id },
      data: { status: 'applied', reviewedAt: new Date() },
    });
    return this.proposalDto(row, p.content);
  }

  async reject(id: string) {
    const p = await this.prisma.seoProposal.findUnique({ where: { id }, include: { content: true } });
    if (!p) throw new NotFoundException('Proposal not found');
    const row = await this.prisma.seoProposal.update({
      where: { id },
      data: { status: 'rejected', reviewedAt: new Date() },
    });
    return this.proposalDto(row, p.content);
  }

  /* --------------------------- blog drafting ----------------------------- */

  async generateBlogDraft(topic: string, keywords?: string[]) {
    if (!topic?.trim()) throw new BadRequestException('A topic is required.');
    const draft = await this.ai.generateBlog({ topic: topic.trim(), keywords });
    // attach ids + drop any unknown block types so the editor can use them directly
    const blocks = draft.blocks
      .filter((b) => typeof b.type === 'string' && ALLOWED_BLOCK_TYPES.includes(b.type as string))
      .map((b) => ({ id: randomUUID(), ...b }));
    return { ...draft, blocks };
  }

  /* ------------------------------- cron ---------------------------------- */

  // Every Monday 03:00 — proposes (never applies) so nothing changes without review.
  @Cron('0 3 * * 1')
  async weeklyAudit() {
    if (!this.ai.isConfigured()) return;
    if ((this.config.get<string>('SEO_AUDIT_CRON') || 'on').toLowerCase() === 'off') return;
    try {
      await this.runAudit();
    } catch (e) {
      this.logger.error(`Weekly SEO audit failed: ${(e as Error).message}`);
    }
  }

  /* ------------------------------ helpers -------------------------------- */

  private async mustGetDoc(id: string): Promise<ContentDoc> {
    const doc = await this.prisma.contentDoc.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Content not found');
    return doc;
  }

  private proposalDto(p: SeoProposal, content: Pick<ContentDoc, 'title' | 'type' | 'slug' | 'seoTitle' | 'seoDescription'>) {
    return {
      id: p.id,
      contentId: p.contentId,
      status: p.status,
      source: p.source,
      score: p.score,
      proposed: { seoTitle: p.seoTitle, seoDescription: p.seoDescription },
      current: { seoTitle: content.seoTitle, seoDescription: content.seoDescription },
      issues: safeParse<string[]>(p.issuesJson, []),
      rationale: p.rationale,
      content: { title: content.title, type: content.type, slug: content.slug },
      createdAt: p.createdAt,
      reviewedAt: p.reviewedAt,
    };
  }
}
