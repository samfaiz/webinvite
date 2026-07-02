import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { IntegrationsService } from '../secrets/integrations.service';

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
  private cachedKey: string | null = null;

  constructor(private integrations: IntegrationsService) {}

  async isConfigured(): Promise<boolean> {
    return !!(await this.integrations.getAiKey());
  }

  async getModel(): Promise<string> {
    return this.integrations.getAiModel();
  }

  /** Build (or reuse) the client for the currently-configured key. Rebuilds
   *  automatically when the admin changes the key — no restart needed. */
  private async getClient(): Promise<Anthropic | null> {
    const key = await this.integrations.getAiKey();
    if (!key) {
      this.client = null;
      this.cachedKey = null;
      return null;
    }
    if (key !== this.cachedKey) {
      this.client = new Anthropic({ apiKey: key });
      this.cachedKey = key;
    }
    return this.client;
  }

  private async complete(system: string, user: string, maxTokens: number): Promise<string> {
    const client = await this.getClient();
    if (!client) {
      throw new ServiceUnavailableException(
        'AI is not configured. Add an Anthropic API key in Admin → Integrations (or set ANTHROPIC_API_KEY).',
      );
    }
    const res = await client.messages.create({
      model: await this.integrations.getAiModel(),
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    });
    return res.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim();
  }

  /**
   * Public marketing-site chat assistant used by the landing-page widget.
   * Keeps the assistant on-topic (invitations, pricing, RSVPs) and limits
   * turn count / message length so a stray key doesn't rack up costs.
   */
  async chat(messages: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<string> {
    const client = await this.getClient();
    if (!client) {
      throw new ServiceUnavailableException(
        'AI is not configured. Add an Anthropic API key in Admin → Integrations (or set ANTHROPIC_API_KEY).',
      );
    }
    const system =
      'You are the friendly assistant for "Web Invite", a website where couples create animated wedding, engagement and anniversary invitation pages with built-in RSVP tracking. ' +
      'How it works: pick one of 180+ designs, customize everything (names, story, photos, music, schedule, colors, fonts, maps, dress code), share one link via WhatsApp or email, and watch RSVPs (attendance, plus-ones, meal choices, messages) arrive live on a dashboard with automatic reminders. ' +
      'Free to start; pay only when ready to share. ' +
      'Answer briefly and warmly (2–4 sentences), in the language the user writes in. ' +
      'If asked something unrelated, gently steer back to invitations.';

    // Trim to the last 10 turns and cap each message at ~2k chars.
    const trimmed = messages
      .slice(-10)
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

    if (trimmed.length === 0 || trimmed[trimmed.length - 1].role !== 'user') {
      throw new ServiceUnavailableException('Send a user message to start the chat.');
    }

    const res = await client.messages.create({
      model: await this.integrations.getAiModel(),
      max_tokens: 400,
      system,
      messages: trimmed,
    });
    return res.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim();
  }

  /** Cheap liveness check for the "Test" button in Admin → Integrations. */
  async ping(): Promise<{ ok: boolean; error?: string }> {
    const client = await this.getClient();
    if (!client) return { ok: false, error: 'No API key configured' };
    try {
      await client.messages.create({
        model: await this.integrations.getAiModel(),
        max_tokens: 8,
        messages: [{ role: 'user', content: 'Reply with OK.' }],
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
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

  /**
   * One-shot page optimisation — regenerates meta title, meta description,
   * OG title/description, keyword list and an FAQ block for answer-engine
   * optimisation (ChatGPT/Perplexity). Returns a coherent bundle in a single
   * Claude call so the fields harmonise instead of drifting apart.
   */
  async optimizePage(input: {
    title: string;
    url: string;
    body: string;
    currentTitle?: string | null;
    currentDescription?: string | null;
    memory?: string[];
  }): Promise<{
    seoTitle: string;
    seoDescription: string;
    ogTitle: string;
    ogDescription: string;
    keywords: string[];
    faqs: Array<{ question: string; answer: string }>;
  }> {
    const system =
      'You are the SEO + AEO (answer-engine optimisation) strategist for "Web Invite", a wedding-invitation website builder. ' +
      'Optimise a page for Google (SEO) AND for LLM answer engines like ChatGPT and Perplexity (AEO). ' +
      'Reply with ONLY a single minified JSON object and no markdown.';
    const memoryBlock = input.memory?.length
      ? `Prior decisions to respect for this page:\n- ${input.memory.join('\n- ')}\n\n`
      : '';
    const user =
      `Optimise this page end-to-end.\n\n` +
      `URL: ${input.url}\n` +
      `Current meta title: ${input.currentTitle || '(none)'}\n` +
      `Current meta description: ${input.currentDescription || '(none)'}\n` +
      `Page title: ${input.title}\n` +
      `Page content (truncated):\n${input.body.slice(0, 4000)}\n\n` +
      memoryBlock +
      `Return JSON with EXACTLY these keys:\n` +
      `{"seoTitle": string (<= 60 chars, benefit-forward, primary keyword up front),\n` +
      ` "seoDescription": string (140-160 chars, benefit + soft CTA),\n` +
      ` "ogTitle": string (<= 60 chars, catchier than SEO title, natural for social),\n` +
      ` "ogDescription": string (140-160 chars, conversational),\n` +
      ` "keywords": string[] (5-10 tight keyword phrases, no duplicates, no stop-words),\n` +
      ` "faqs": Array<{"question": string, "answer": string}> (5-8 pairs; questions are natural-language, answers are 1-2 sentences an LLM can quote directly)}`;
    const j = this.parseJson<{
      seoTitle?: string;
      seoDescription?: string;
      ogTitle?: string;
      ogDescription?: string;
      keywords?: unknown[];
      faqs?: Array<{ question?: string; answer?: string }>;
    }>(await this.complete(system, user, 2000));
    return {
      seoTitle: String(j.seoTitle || '').slice(0, 70),
      seoDescription: String(j.seoDescription || '').slice(0, 200),
      ogTitle: String(j.ogTitle || '').slice(0, 70),
      ogDescription: String(j.ogDescription || '').slice(0, 200),
      keywords: Array.isArray(j.keywords) ? j.keywords.map(String).slice(0, 12) : [],
      faqs: Array.isArray(j.faqs)
        ? j.faqs
            .filter((f) => f && typeof f.question === 'string' && typeof f.answer === 'string')
            .map((f) => ({ question: String(f.question).slice(0, 300), answer: String(f.answer).slice(0, 1200) }))
            .slice(0, 10)
        : [],
    };
  }

  /**
   * Narrower call — regenerate ONLY the FAQ block. Cheaper than optimizePage
   * when the admin just wants fresh Q&A for a page they've already tuned.
   */
  async generateFaqs(input: { title: string; body: string; count?: number }): Promise<Array<{ question: string; answer: string }>> {
    const count = Math.max(3, Math.min(10, input.count ?? 6));
    const system =
      'You write FAQ pairs for AEO (answer-engine optimisation) so LLMs can cite them directly. ' +
      'Reply with ONLY a single minified JSON object and no markdown.';
    const user =
      `Write ${count} FAQ pairs for this page.\n\n` +
      `Page title: ${input.title}\n` +
      `Page content (truncated):\n${input.body.slice(0, 3500)}\n\n` +
      `Return JSON: {"faqs": Array<{"question": string, "answer": string}>}\n` +
      `Questions should sound like real user searches (start with What/How/Can/Do/Is/Where). ` +
      `Answers are 1-2 sentences, factual, no fluff.`;
    const j = this.parseJson<{ faqs?: Array<{ question?: string; answer?: string }> }>(
      await this.complete(system, user, 1200),
    );
    return Array.isArray(j.faqs)
      ? j.faqs
          .filter((f) => f && typeof f.question === 'string' && typeof f.answer === 'string')
          .map((f) => ({ question: String(f.question).slice(0, 300), answer: String(f.answer).slice(0, 1200) }))
          .slice(0, 10)
      : [];
  }

  /**
   * Improve the SEO/AEO/GEO audit rubric itself. Called from the "Improve
   * editor text with AI" button and from the auto-improve cron. Returns a
   * revised rubric AND a rewritten "learning memory" note that will be
   * archived alongside it, so improvements compound over runs.
   */
  async improveSeoAlgorithm(input: {
    current: string;
    memory: string;
    /** Optional: recent audit scores so the model can reason about outcomes. */
    scoresSample?: number[];
  }): Promise<{ algorithm: string; learningMemory: string; rationale: string }> {
    const client = await this.getClient();
    if (!client) {
      throw new ServiceUnavailableException(
        'AI is not configured. Add an Anthropic API key in Site Settings → SEO & analytics.',
      );
    }
    const scoreLine = input.scoresSample?.length
      ? `Recent per-page audit scores using the current rubric: ${input.scoresSample.slice(0, 20).join(', ')}. ` +
        `Consider whether the rubric distinguishes strong pages from weak ones.\n\n`
      : '';
    const system =
      'You are a senior search-strategy researcher. You maintain a scoring rubric that grades pages across SEO (classic), ' +
      'AEO (answer-engine optimisation) and GEO (generative-engine optimisation). ' +
      'Your job is to improve the rubric so it produces sharper, more actionable audits — never to make it fluffier or longer for its own sake. ' +
      'You also maintain a "learning memory" log summarising what has been learned across runs. ' +
      'Reply with ONLY a single minified JSON object and no markdown fences.';
    const user =
      `You are refining a scoring rubric across three runs. The current rubric text is delimited by <ALGO>…</ALGO>. ` +
      `The prior learning memory is delimited by <MEMORY>…</MEMORY>. ` +
      scoreLine +
      `\n\n<ALGO>\n${input.current.slice(0, 40_000)}\n</ALGO>\n\n<MEMORY>\n${input.memory.slice(0, 20_000)}\n</MEMORY>\n\n` +
      `Return JSON with exactly:\n` +
      `{"algorithm": string (the revised rubric — full text, ready to save; preserve section headers and the STEP structure; keep it dense, imperative, and specific; bump the version number in the first line by one),\n` +
      ` "learningMemory": string (rewrite the memory: add a new "RUN N" section summarising what changed and why; keep durable principles from prior runs; drop obsolete ones; end with 2-4 hypotheses to test next cycle),\n` +
      ` "rationale": string (2-4 sentences explaining the change to a human maintainer)}`;
    const res = await client.messages.create({
      model: await this.integrations.getAiModel(),
      max_tokens: 8000,
      system,
      messages: [{ role: 'user', content: user }],
    });
    const raw = res.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim();
    const j = this.parseJson<{ algorithm?: string; learningMemory?: string; rationale?: string }>(raw);
    return {
      algorithm: String(j.algorithm || input.current).slice(0, 200_000),
      learningMemory: String(j.learningMemory || input.memory).slice(0, 200_000),
      rationale: String(j.rationale || '').slice(0, 2000),
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
