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
      ogTitle: d.ogTitle,
      ogDescription: d.ogDescription,
      ogImage: d.ogImage,
      canonicalUrl: d.canonicalUrl,
      faqs: safeParse<Array<{ id?: string; question: string; answer: string }>>(d.faqsJson, []),
      sortOrder: d.sortOrder,
      noindex: d.noindex,
      publishedAt: d.publishedAt,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
    return full ? { ...base, blocks: safeParse<unknown[]>(d.blocksJson, []) } : base;
  }

  private data(dto: SaveContentDto) {
    // FAQs: fill in ids for entries the client didn't stamp.
    const faqs = (dto.faqs ?? []).map((f, i) => ({
      id: f.id || `faq-${Date.now().toString(36)}-${i}`,
      question: f.question,
      answer: f.answer,
    }));
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
      ogTitle: dto.ogTitle ?? null,
      ogDescription: dto.ogDescription ?? null,
      ogImage: dto.ogImage ?? null,
      canonicalUrl: dto.canonicalUrl ?? null,
      faqsJson: JSON.stringify(faqs),
      sortOrder: dto.sortOrder ?? 0,
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
      // Pages get an explicit nav order; posts are chronological.
      orderBy: type === 'page' ? [{ sortOrder: 'asc' }, { title: 'asc' }] : { updatedAt: 'desc' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async getById(id: string) {
    const row = await this.prisma.contentDoc.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Content not found');
    return this.toDto(row, true);
  }

  /**
   * Idempotent: ensure the site's default marketing pages exist as CMS docs so
   * the admin table isn't empty on a fresh install and there's a real /p/{slug}
   * URL for each. Only creates pages that don't already exist (matched by slug)
   * — running it again is a no-op. Never overwrites hand-edited content.
   *
   * Returns the count of pages created + a fresh list of all "page" docs.
   */
  async seedDefaultPages() {
    const defaults = DEFAULT_PAGES;
    const existing = await this.prisma.contentDoc.findMany({
      where: { type: 'page', slug: { in: defaults.map((p) => p.slug) } },
      select: { slug: true },
    });
    const have = new Set(existing.map((r) => r.slug));
    const toCreate = defaults.filter((p) => !have.has(p.slug));

    for (const [i, p] of toCreate.entries()) {
      let n = 0;
      const withIds = p.blocks.map((b) => ({ ...b, id: `seed-${p.slug}-${++n}` }));
      await this.prisma.contentDoc.create({
        data: {
          type: 'page',
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt ?? null,
          coverImage: null,
          blocksJson: JSON.stringify(withIds),
          tagsJson: JSON.stringify(p.keywords ?? []),
          authorName: null,
          seoTitle: p.title,
          seoDescription: p.excerpt ?? null,
          ogTitle: null,
          ogDescription: null,
          ogImage: null,
          canonicalUrl: null,
          faqsJson: JSON.stringify(p.faqs ?? []),
          sortOrder: defaults.findIndex((d) => d.slug === p.slug) + 1,
          noindex: false,
          status: 'published',
          publishedAt: new Date(),
        },
      });
    }

    const rows = await this.prisma.contentDoc.findMany({
      where: { type: 'page' },
      orderBy: { updatedAt: 'desc' },
    });
    return {
      created: toCreate.map((p) => p.slug),
      pages: rows.map((r) => this.toDto(r)),
    };
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
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
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

/* --------------------------------------------------------------------------
 * Default marketing pages that ship with a fresh install. Each page has a
 * hero block (surfaces as Hero eyebrow / heading in the admin table) plus a
 * short paragraph so /p/{slug} renders something. Slugs match the URLs the
 * landing page footer links to, so editing them in admin updates the live
 * site immediately.
 * -------------------------------------------------------------------------- */

type SeedBlock =
  | {
      type: 'hero';
      heading: string;
      sub?: string;
      subHeading?: string;
      image?: string;
      imageCrop?: 'center' | 'top' | 'bottom' | 'left' | 'right';
      ctaLabel?: string;
      ctaHref?: string;
      secondaryCtaLabel?: string;
      secondaryCtaHref?: string;
    }
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string; level: 2 | 3 }
  | { type: 'list'; ordered?: boolean; items: string[] };

type SeedFaq = { id?: string; question: string; answer: string };

type SeedPage = {
  slug: string;
  title: string;
  excerpt?: string;
  blocks: SeedBlock[];
  keywords?: string[];
  faqs?: SeedFaq[];
};

const DEFAULT_PAGES: SeedPage[] = [
  {
    slug: 'home',
    title: 'Home',
    excerpt: 'Animated invitation pages, in full colour — with live RSVPs.',
    keywords: ['wedding invitation', 'online invitation', 'RSVP', 'engagement invite', 'anniversary invite'],
    blocks: [
      {
        type: 'hero',
        sub: 'WEDDINGS · ENGAGEMENTS · ANNIVERSARIES',
        heading: 'Your celebration, in full colour',
        subHeading: 'Animated invitation pages as vivid as the day itself — your story, your music, your schedule. Share one link, gather every RSVP.',
        imageCrop: 'center',
        ctaLabel: 'Create your invitation',
        ctaHref: '/create',
        secondaryCtaLabel: 'Browse designs',
        secondaryCtaHref: '/gallery',
      },
    ],
    faqs: [
      { question: 'Is Web Invite free to start?', answer: 'Yes — you can build and preview an invitation for free. You only pay when you’re ready to publish and share.' },
      { question: 'Do guests need an account to RSVP?', answer: 'No. Guests just open the link you send them and tap Yes or No. Their response lands on your dashboard instantly.' },
    ],
  },
  {
    slug: 'about',
    title: 'About',
    excerpt: 'Why we build Web Invite.',
    blocks: [
      { type: 'hero', sub: 'OUR STORY', heading: 'Design for the best day of your life' },
      {
        type: 'paragraph',
        text: 'Web Invite exists because a wedding invitation deserves more than a paper card no one keeps. We build living, animated invitation pages that carry your story, your music and your details — and quietly track every RSVP so you can enjoy the day.',
      },
      { type: 'heading', level: 2, text: 'What we care about' },
      {
        type: 'list',
        items: [
          'Beauty first — every design is hand-crafted, not template-shopped.',
          'Guests come first — pages open fast, read easily, feel personal.',
          'You come first — pricing is honest, exports are yours, no lock-in.',
        ],
      },
    ],
  },
  {
    slug: 'pricing',
    title: 'Pricing',
    excerpt: "Free to start. Pay only when you're ready to share.",
    blocks: [
      { type: 'hero', sub: 'PLANS', heading: "Free to start. Pay when you're ready to share." },
      { type: 'paragraph', text: 'Every invitation is free to build. When you like it, publish for a one-time fee — no subscriptions, no per-guest costs.' },
      { type: 'heading', level: 2, text: 'What you get on every plan' },
      {
        type: 'list',
        items: [
          'Full customisation — colours, fonts, photos, music, schedule, maps.',
          'Live RSVP dashboard with meal choices and guest messages.',
          'Unlimited guests, unlimited views.',
          'Excel export of every reply.',
        ],
      },
    ],
  },
  {
    slug: 'contact',
    title: 'Contact',
    excerpt: 'We usually reply within a day.',
    blocks: [
      { type: 'hero', sub: 'GET IN TOUCH', heading: "We're here to help" },
      { type: 'paragraph', text: 'Questions, custom design requests or press enquiries — send them our way. We usually reply within a business day.' },
      { type: 'paragraph', text: 'Email: hello@web-invite.co · Instagram: @webinvite' },
    ],
  },
  {
    slug: 'faq',
    title: 'FAQ',
    excerpt: 'Answers to common questions.',
    blocks: [
      { type: 'hero', sub: 'COMMON QUESTIONS', heading: 'Answers, straight from the team' },
      { type: 'heading', level: 2, text: 'How do RSVPs work?' },
      { type: 'paragraph', text: 'Guests reply on your invitation page in one tap — attendance, plus-ones, meal choices and short notes. Everything lands live on your dashboard, and reminders go out automatically.' },
      { type: 'heading', level: 2, text: 'Can I use my own music?' },
      { type: 'paragraph', text: 'Yes — pick from our curated library or upload your own track. Guests can mute at any time.' },
      { type: 'heading', level: 2, text: 'Do you support other languages?' },
      { type: 'paragraph', text: 'Every field is free-text, so any language works. Right-to-left languages render cleanly.' },
    ],
  },
  {
    slug: 'help',
    title: 'Help centre',
    excerpt: 'Guides for creating, sharing and editing your invitation.',
    blocks: [
      { type: 'hero', sub: 'HELP CENTRE', heading: 'Guides & how-tos' },
      { type: 'paragraph', text: 'Step-by-step guides for every part of your invitation — from picking a design to reading your RSVP dashboard.' },
    ],
  },
  {
    slug: 'privacy',
    title: 'Privacy',
    excerpt: 'How we handle your data.',
    blocks: [
      { type: 'hero', sub: 'LEGAL', heading: 'Privacy Policy' },
      { type: 'paragraph', text: 'We only collect what we need to run your invitation and RSVPs. We never sell your data, and we never share your guest list with anyone.' },
      { type: 'heading', level: 2, text: 'What we store' },
      {
        type: 'list',
        items: [
          'Your account email and name.',
          'The content of the invitations you create.',
          'RSVP responses from guests, until you delete them or export the invitation.',
        ],
      },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms',
    excerpt: 'The ground rules for using Web Invite.',
    blocks: [
      { type: 'hero', sub: 'LEGAL', heading: 'Terms of Service' },
      { type: 'paragraph', text: 'By using Web Invite you agree to these terms. In short: you own your content, we host it, and we ask you to be kind to your guests.' },
    ],
  },
];
