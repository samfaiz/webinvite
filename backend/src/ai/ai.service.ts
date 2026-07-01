import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type SeoSuggestion = {
  seoTitle: string;
  seoDescription: string;
  score: number;
  issues: string[];
  rationale: string;
};

export type BlogDraft = {
  title: string;
  excerpt: string;
  tags: string[];
  blocks: Array<Record<string, unknown>>;
};

/**
 * Thin wrapper around the Anthropic Messages API. If ANTHROPIC_API_KEY isn't
 * set the service is "not configured" and every generate call throws a clear
 * 503 — so the rest of the app (queue, UI, cron) works without a key.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: Anthropic | null = null;
  private readonly model: string;

  constructor(private config: ConfigService) {
    const key = this.config.get<string>('ANTHROPIC_API_KEY');
    this.model = this.config.get<string>('ANTHROPIC_MODEL') || 'claude-sonnet-4-6';
    if (key) {
      this.client = new Anthropic({ apiKey: key });
      this.logger.log(`AI enabled (model: ${this.model})`);
    } else {
      this.logger.warn('AI disabled — set ANTHROPIC_API_KEY to enable SEO/content generation');
    }
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  getModel(): string {
    return this.model;
  }

  private async complete(system: string, user: string, maxTokens: number): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI is not configured. Set ANTHROPIC_API_KEY in the backend environment to enable this.',
      );
    }
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    });
    return res.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim();
  }

  /** Extract the first JSON object from a text blob (models sometimes wrap it). */
  private parseJson<T>(text: string): T {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('The AI response was not valid JSON.');
    return JSON.parse(match[0]) as T;
  }

  /** Optimise on-page SEO for a single page/post. */
  async generateSeo(input: {
    title: string;
    url: string;
    body: string;
    currentTitle?: string | null;
    currentDescription?: string | null;
    memory?: string[];
    traffic?: { views: number; days: number; note: string };
  }): Promise<SeoSuggestion> {
    const system =
      'You are an expert SEO specialist for "Web Invite", a wedding-invitation website builder. ' +
      'You optimise on-page SEO (meta title & description) to maximise clicks from Google while staying accurate. ' +
      'Reply with ONLY a single minified JSON object and no markdown.';
    const memoryBlock = input.memory?.length
      ? `Past SEO notes for this page (respect prior decisions):\n- ${input.memory.join('\n- ')}\n\n`
      : '';
    const trafficBlock = input.traffic
      ? `Recent traffic: ${input.traffic.note}. If traffic is low, be more compelling and keyword-focused to win clicks.\n\n`
      : '';
    const user =
      `Optimise the SEO for this page.\n\n` +
      `URL: ${input.url}\n` +
      `Current meta title: ${input.currentTitle || '(none)'}\n` +
      `Current meta description: ${input.currentDescription || '(none)'}\n` +
      `Page title: ${input.title}\n` +
      `Page content (truncated):\n${input.body.slice(0, 4000)}\n\n` +
      trafficBlock +
      memoryBlock +
      `Return JSON with exactly these keys: ` +
      `{"seoTitle": string (<= 60 characters, compelling, primary keyword near the front), ` +
      `"seoDescription": string (140-160 characters, benefit-driven, ends with a soft call to action), ` +
      `"score": number (0-100 rating the CURRENT meta quality), ` +
      `"issues": string[] (specific problems with the current SEO, empty if none), ` +
      `"rationale": string (1-2 sentences explaining why the new title/description are better)}`;
    const j = this.parseJson<Partial<SeoSuggestion>>(await this.complete(system, user, 900));
    return {
      seoTitle: String(j.seoTitle || '').slice(0, 70),
      seoDescription: String(j.seoDescription || '').slice(0, 200),
      score: Math.max(0, Math.min(100, Math.round(Number(j.score) || 0))),
      issues: Array.isArray(j.issues) ? j.issues.map(String).slice(0, 8) : [],
      rationale: String(j.rationale || ''),
    };
  }

  /** Draft a full blog post from a topic. Blocks come back without ids. */
  async generateBlog(input: { topic: string; keywords?: string[] }): Promise<BlogDraft> {
    const system =
      'You are a content writer and SEO specialist for "Web Invite", a wedding-invitation website builder. ' +
      'Write helpful, engaging, original, accurate blog posts for engaged couples. ' +
      'Reply with ONLY a single minified JSON object and no markdown.';
    const user =
      `Write an SEO-friendly blog post about: "${input.topic}".` +
      (input.keywords?.length ? ` Target keywords: ${input.keywords.join(', ')}.` : '') +
      `\n\nReturn JSON: {"title": string, "excerpt": string (<= 160 chars), "tags": string[] (3-6), "blocks": Block[]}\n` +
      `Each Block is one of:\n` +
      `{"type":"heading","text":string,"level":2}\n` +
      `{"type":"paragraph","text":string}   (may use **bold**, *italic*, [text](https://url))\n` +
      `{"type":"quote","text":string,"cite":string}\n` +
      `{"type":"list","ordered":false,"items":string[]}\n` +
      `Produce 8-12 blocks: an intro paragraph, several H2 sections each with paragraphs, at least one list, and a closing paragraph. ` +
      `Do NOT include an "id" field. Keep it wedding-relevant and genuinely useful.`;
    const j = this.parseJson<Partial<BlogDraft>>(await this.complete(system, user, 3500));
    return {
      title: String(j.title || input.topic),
      excerpt: String(j.excerpt || '').slice(0, 200),
      tags: Array.isArray(j.tags) ? j.tags.map(String).slice(0, 6) : [],
      blocks: Array.isArray(j.blocks) ? (j.blocks as Array<Record<string, unknown>>) : [],
    };
  }
}
