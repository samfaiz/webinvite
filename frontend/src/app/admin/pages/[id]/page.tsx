"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, type CmsDoc, type CmsFaq, type CmsInput, type PageOptimisation } from "@/lib/api";
import { normalizeBlocks, type Block, type HeroImageCrop } from "@/cms/blocks";

/**
 * `/admin/pages/[id]` — Filament-style rich editor for a single "page" doc.
 * Three sections:
 *   • Page  – identifiers (title, slug, publish flag, sort order)
 *   • Hero  – the top banner (eyebrow / heading / subheading / image / CTAs)
 *   • SEO, social & AI – meta, OG, keywords, canonical, FAQs, AI actions
 *
 * The hero data lives inside blocks[0] as a hero block; on save we keep any
 * other blocks (paragraphs, headings, lists…) untouched so nothing you added
 * in the block editor is lost.
 */

type HeroState = {
  sub: string;
  heading: string;
  subHeading: string;
  image: string;
  imageCrop: HeroImageCrop;
  ctaLabel: string;
  ctaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
};

const EMPTY_HERO: HeroState = {
  sub: "",
  heading: "",
  subHeading: "",
  image: "",
  imageCrop: "center",
  ctaLabel: "",
  ctaHref: "",
  secondaryCtaLabel: "",
  secondaryCtaHref: "",
};

function heroFromBlocks(blocks: Block[]): { hero: HeroState; heroId: string | null; other: Block[] } {
  const idx = blocks.findIndex((b) => b.type === "hero");
  if (idx === -1) return { hero: EMPTY_HERO, heroId: null, other: blocks };
  const h = blocks[idx] as Extract<Block, { type: "hero" }>;
  return {
    hero: {
      sub: h.sub ?? "",
      heading: h.heading ?? "",
      subHeading: h.subHeading ?? "",
      image: h.image ?? "",
      imageCrop: h.imageCrop ?? "center",
      ctaLabel: h.ctaLabel ?? "",
      ctaHref: h.ctaHref ?? "",
      secondaryCtaLabel: h.secondaryCtaLabel ?? "",
      secondaryCtaHref: h.secondaryCtaHref ?? "",
    },
    heroId: h.id,
    other: blocks.filter((_, i) => i !== idx),
  };
}

function blocksWithHero(hero: HeroState, heroId: string | null, other: Block[]): Block[] {
  const id = heroId || `hero-${Date.now().toString(36)}`;
  const heroBlock: Block = {
    id,
    type: "hero",
    heading: hero.heading,
    sub: hero.sub || undefined,
    subHeading: hero.subHeading || undefined,
    image: hero.image || undefined,
    imageCrop: hero.imageCrop || undefined,
    ctaLabel: hero.ctaLabel || undefined,
    ctaHref: hero.ctaHref || undefined,
    secondaryCtaLabel: hero.secondaryCtaLabel || undefined,
    secondaryCtaHref: hero.secondaryCtaHref || undefined,
  };
  return [heroBlock, ...other];
}

export default function PageEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [doc, setDoc] = useState<CmsDoc | null>(null);
  const [otherBlocks, setOtherBlocks] = useState<Block[]>([]);
  const [heroId, setHeroId] = useState<string | null>(null);
  const [hero, setHero] = useState<HeroState>(EMPTY_HERO);

  // top-level fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [published, setPublished] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);

  // SEO
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [noindex, setNoindex] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordDraft, setKeywordDraft] = useState("");
  const [faqs, setFaqs] = useState<CmsFaq[]>([]);
  const [seoOpen, setSeoOpen] = useState(true);

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState<null | "all" | "seoTitle" | "seoDescription" | "keywords" | "ogTitle" | "ogDescription" | "faqs">(null);
  const [aiInfo, setAiInfo] = useState<string | null>(null);

  const originalRef = useRef<CmsDoc | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) return void router.push("/login");
    if (user.role !== "admin") return void router.push("/dashboard");
    api
      .adminGetContent(id)
      .then((d) => {
        setDoc(d);
        originalRef.current = d;
        setTitle(d.title || "");
        setSlug(d.slug || "");
        setPublished(d.status === "published");
        setSortOrder(d.sortOrder ?? 0);
        setSeoTitle(d.seoTitle || "");
        setSeoDescription(d.seoDescription || "");
        setOgTitle(d.ogTitle || "");
        setOgDescription(d.ogDescription || "");
        setOgImage(d.ogImage || "");
        setCanonicalUrl(d.canonicalUrl || "");
        setNoindex(!!d.noindex);
        setKeywords(d.tags || []);
        setFaqs(d.faqs || []);
        const { hero: h, heroId: hid, other } = heroFromBlocks(normalizeBlocks(d.blocks));
        setHero(h);
        setHeroId(hid);
        setOtherBlocks(other);
      })
      .catch((e) => setError((e as Error).message));
  }, [loading, user, router, id]);

  const patchHero = (patch: Partial<HeroState>) => setHero((h) => ({ ...h, ...patch }));

  const save = useCallback(async () => {
    if (!doc) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const body: CmsInput = {
        type: "page",
        slug: slug.trim(),
        title: title.trim() || "Untitled",
        blocks: blocksWithHero(hero, heroId, otherBlocks),
        tags: keywords,
        seoTitle: seoTitle || undefined,
        seoDescription: seoDescription || undefined,
        ogTitle: ogTitle || undefined,
        ogDescription: ogDescription || undefined,
        ogImage: ogImage || undefined,
        canonicalUrl: canonicalUrl || undefined,
        faqs,
        sortOrder,
        noindex,
      };
      const updated = await api.updateContent(doc.id, body);
      // publish state is separate
      if (published && updated.status !== "published") {
        await api.publishContent(doc.id);
      } else if (!published && updated.status === "published") {
        await api.unpublishContent(doc.id);
      }
      setDoc({ ...updated, status: published ? "published" : "draft" });
      setSuccess("Saved. Changes are live on /p/" + updated.slug + ".");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [doc, slug, title, hero, heroId, otherBlocks, keywords, seoTitle, seoDescription, ogTitle, ogDescription, ogImage, canonicalUrl, faqs, sortOrder, noindex, published]);

  const remove = useCallback(async () => {
    if (!doc) return;
    if (!confirm(`Delete "${doc.title}"? This can't be undone.`)) return;
    try {
      await api.deleteContent(doc.id);
      router.push("/admin/pages");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [doc, router]);

  /* ---------------- AI ---------------- */

  const optimiseAll = async () => {
    if (!doc || aiBusy) return;
    setAiBusy("all");
    setAiInfo(null);
    setError(null);
    try {
      const r: PageOptimisation = await api.seoOptimiseAll(doc.id);
      setSeoTitle(r.seoTitle);
      setSeoDescription(r.seoDescription);
      setOgTitle(r.ogTitle);
      setOgDescription(r.ogDescription);
      setKeywords(r.keywords);
      setFaqs(
        r.faqs.map((f, i) => ({ id: `ai-${Date.now().toString(36)}-${i}`, question: f.question, answer: f.answer })),
      );
      setAiInfo("Applied AI suggestions to Meta, Social, Keywords and FAQs. Review, then Save to persist.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAiBusy(null);
    }
  };

  /**
   * Per-field AI: runs the same holistic optimisation but only applies the
   * requested field, so each label's tiny "AI" chip regenerates its own value
   * in isolation. Coherent (all fields still generated together by Claude) but
   * non-destructive (nothing else in the form gets clobbered).
   */
  const optimiseField = async (field: "seoTitle" | "seoDescription" | "keywords" | "ogTitle" | "ogDescription") => {
    if (!doc || aiBusy) return;
    setAiBusy(field);
    setError(null);
    try {
      const r = await api.seoOptimiseAll(doc.id);
      switch (field) {
        case "seoTitle":
          setSeoTitle(r.seoTitle);
          setAiInfo("Regenerated the meta title.");
          break;
        case "seoDescription":
          setSeoDescription(r.seoDescription);
          setAiInfo("Regenerated the meta description.");
          break;
        case "keywords":
          setKeywords(r.keywords);
          setAiInfo(`Regenerated keywords (${r.keywords.length}).`);
          break;
        case "ogTitle":
          setOgTitle(r.ogTitle);
          setAiInfo("Regenerated the social (OG) title.");
          break;
        case "ogDescription":
          setOgDescription(r.ogDescription);
          setAiInfo("Regenerated the social (OG) description.");
          break;
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAiBusy(null);
    }
  };

  const generateFaqs = async () => {
    if (!doc || aiBusy) return;
    setAiBusy("faqs");
    setError(null);
    try {
      const r = await api.seoGenerateFaqs(doc.id, 6);
      setFaqs(r.map((f, i) => ({ id: `ai-${Date.now().toString(36)}-${i}`, question: f.question, answer: f.answer })));
      setAiInfo(`Regenerated ${r.length} FAQs.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAiBusy(null);
    }
  };

  const publicHref = doc ? `/p/${doc.slug}` : "#";

  if (loading || !doc) {
    return (
      <div
        className="flex h-[70vh] items-center justify-center text-[rgba(90,35,56,0.5)]"
        style={{ fontFamily: "var(--f-body)" }}
      >
        {loading ? "Loading…" : error || "Loading page…"}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-10 sm:py-10" style={{ fontFamily: "var(--f-body)" }}>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-[12px] text-[rgba(90,35,56,0.55)]">
            <Link href="/admin" className="hover:text-[#d95f48]">Admin</Link>
            <span className="text-[rgba(90,35,56,0.3)]">›</span>
            <Link href="/admin/pages" className="hover:text-[#d95f48]">Pages</Link>
            <span className="text-[rgba(90,35,56,0.3)]">›</span>
            <span className="text-[rgba(90,35,56,0.75)]">{doc.title || "Untitled"}</span>
            <span className="text-[rgba(90,35,56,0.3)]">›</span>
            <span className="text-[rgba(90,35,56,0.55)]">Edit</span>
          </nav>
          <h1
            className="mt-1 text-4xl font-medium italic text-[#5a2338] sm:text-[42px]"
            style={{ fontFamily: "var(--f-serif)" }}
          >
            Edit {doc.title || "page"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={publicHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#c9497c] px-4 py-2.5 text-[13px] font-medium text-white shadow-[0_8px_22px_rgba(201,73,124,0.3)] transition-colors hover:bg-[#a53a66]"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9M4 20h4l10-10-4-4L4 16z" />
            </svg>
            Edit visually
          </a>
          <button
            onClick={remove}
            className="rounded-full bg-[#d92f2f] px-4 py-2.5 text-[13px] font-medium text-white shadow-[0_8px_22px_rgba(217,47,47,0.3)] transition-colors hover:bg-[#b52020]"
          >
            Delete
          </button>
        </div>
      </div>

      {error ? <div className="mt-4 rounded-lg border border-[rgba(217,95,72,0.4)] bg-[#fbe0d8] px-4 py-2 text-sm text-[#7a2418]">{error}</div> : null}
      {success ? <div className="mt-4 rounded-lg border border-[rgba(92,138,94,0.3)] bg-[#eaf6ea] px-4 py-2 text-sm text-[#2f6b50]">{success}</div> : null}
      {aiInfo ? <div className="mt-4 rounded-lg border border-[rgba(122,91,166,0.3)] bg-[#efe8f7] px-4 py-2 text-sm text-[#5a3d8a]">{aiInfo}</div> : null}

      {/* Two-column: Page + Hero */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Page card */}
        <Card title="Page">
          <Field label="Title" required>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="Page title" />
          </Field>
          <Field
            label="Key"
            required
            hint="Stable identifier the frontend routes against (home, about, ...). Avoid changing it on an existing page."
          >
            <input
              value={slug}
              onChange={(e) =>
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]+/g, "-")
                    .replace(/^-+|-+$/g, ""),
                )
              }
              className={inputCls + " font-mono"}
              placeholder="page-slug"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Is published">
              <Toggle on={published} onChange={setPublished} />
            </Field>
            <Field label="Sort">
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                className={inputCls}
              />
            </Field>
          </div>
        </Card>

        {/* Hero card */}
        <Card title="Hero" description="The top banner of the page.">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Eyebrow / kicker">
              <input value={hero.sub} onChange={(e) => patchHero({ sub: e.target.value })} className={inputCls} placeholder="OUR STORY" />
            </Field>
            <Field label="Hero heading">
              <input value={hero.heading} onChange={(e) => patchHero({ heading: e.target.value })} className={inputCls} placeholder="Big italic line" />
            </Field>
          </div>
          <Field label="Hero subheading">
            <textarea
              value={hero.subHeading}
              onChange={(e) => patchHero({ subHeading: e.target.value })}
              className={inputCls + " min-h-[80px] resize-y"}
              placeholder="1–2 sentences shown below the heading."
            />
          </Field>
          <Field label="Hero image">
            <ImageDrop
              value={hero.image}
              onChange={(url) => patchHero({ image: url })}
              onError={setError}
            />
          </Field>
          <Field label="Hero image crop">
            <select value={hero.imageCrop} onChange={(e) => patchHero({ imageCrop: e.target.value as HeroImageCrop })} className={inputCls}>
              <option value="center">Center</option>
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Primary button label">
              <input value={hero.ctaLabel} onChange={(e) => patchHero({ ctaLabel: e.target.value })} className={inputCls} placeholder="Get started" />
            </Field>
            <Field label="Primary button URL">
              <input value={hero.ctaHref} onChange={(e) => patchHero({ ctaHref: e.target.value })} className={inputCls} placeholder="/create" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Secondary button label">
              <input value={hero.secondaryCtaLabel} onChange={(e) => patchHero({ secondaryCtaLabel: e.target.value })} className={inputCls} placeholder="Browse designs" />
            </Field>
            <Field label="Secondary button URL">
              <input value={hero.secondaryCtaHref} onChange={(e) => patchHero({ secondaryCtaHref: e.target.value })} className={inputCls} placeholder="/gallery" />
            </Field>
          </div>
        </Card>
      </div>

      {/* SEO, social & AI */}
      <div className="mt-6">
        <Collapsible
          open={seoOpen}
          onToggle={() => setSeoOpen((v) => !v)}
          title={
            <span className="inline-flex items-center gap-2">
              <SparkleIcon />
              SEO, social &amp; AI
            </span>
          }
          description="Search, social and AI-answer-engine metadata. Use the AI buttons to generate it all from this page's content."
        >
          <div className="flex flex-wrap gap-2">
            <button
              onClick={optimiseAll}
              disabled={aiBusy !== null}
              className="inline-flex items-center gap-2 rounded-full bg-[#7a5ba6] px-4 py-2 text-[13px] font-medium text-white shadow-[0_8px_20px_rgba(122,91,166,0.25)] transition-colors hover:bg-[#5f4685] disabled:opacity-60"
            >
              <SparkleIcon />
              {aiBusy === "all" ? "Optimising…" : "Optimise all with AI"}
            </button>
          </div>

          <div className="mt-6 grid gap-4">
            <Field
              label="Meta title"
              hint={`${seoTitle.length} characters · aim for ≤ 60.`}
              action={<AiChip onClick={() => optimiseField("seoTitle")} busy={aiBusy === "seoTitle"} disabled={aiBusy !== null && aiBusy !== "seoTitle"} />}
            >
              <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className={inputCls} placeholder="Shown in Google results" />
            </Field>
            <Field
              label="Meta description"
              hint={`${seoDescription.length} characters · aim for ≤ 155.`}
              action={<AiChip onClick={() => optimiseField("seoDescription")} busy={aiBusy === "seoDescription"} disabled={aiBusy !== null && aiBusy !== "seoDescription"} />}
            >
              <textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                className={inputCls + " min-h-[70px] resize-y"}
                placeholder="Shown in Google results snippet"
              />
            </Field>

            <Field
              label="Keywords"
              hint="Press Enter or comma to add. Used by AI + hints crawlers."
              action={<AiChip onClick={() => optimiseField("keywords")} busy={aiBusy === "keywords"} disabled={aiBusy !== null && aiBusy !== "keywords"} />}
            >
              <KeywordChips value={keywords} onChange={setKeywords} draft={keywordDraft} onDraft={setKeywordDraft} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Social (OG) title"
                action={<AiChip onClick={() => optimiseField("ogTitle")} busy={aiBusy === "ogTitle"} disabled={aiBusy !== null && aiBusy !== "ogTitle"} />}
              >
                <input value={ogTitle} onChange={(e) => setOgTitle(e.target.value)} className={inputCls} placeholder="Falls back to meta title" />
              </Field>
              <Field label="Canonical URL" hint="Leave blank to use the page's own URL.">
                <input value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} className={inputCls} placeholder="https://…" />
              </Field>
            </div>

            <Field
              label="Social (OG) description"
              action={<AiChip onClick={() => optimiseField("ogDescription")} busy={aiBusy === "ogDescription"} disabled={aiBusy !== null && aiBusy !== "ogDescription"} />}
            >
              <textarea
                value={ogDescription}
                onChange={(e) => setOgDescription(e.target.value)}
                className={inputCls + " min-h-[70px] resize-y"}
                placeholder="Falls back to meta description"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Social share image" hint="1200×630 recommended">
                <ImageDrop value={ogImage} onChange={setOgImage} onError={setError} />
              </Field>
              <Field label="Hide from search engines (noindex)">
                <Toggle on={noindex} onChange={setNoindex} />
              </Field>
            </div>

            {/* FAQs */}
            <div className="mt-2 rounded-xl border border-[rgba(90,35,56,0.1)] bg-[#fdf4ec] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[13px] font-medium text-[#5a2338]">FAQs — answer-engine optimisation (AEO)</p>
                  <p className="text-[12px] text-[rgba(90,35,56,0.6)]">
                    Rendered as an FAQ on the page and as FAQPage structured data for AI answer engines.
                  </p>
                </div>
                <button
                  onClick={generateFaqs}
                  disabled={aiBusy !== null}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(122,91,166,0.4)] px-3 py-1.5 text-[12px] font-medium text-[#7a5ba6] transition-colors hover:bg-[#efe8f7] disabled:opacity-60"
                >
                  <SparkleIcon />
                  {aiBusy === "faqs" ? "Generating…" : "Generate with AI"}
                </button>
              </div>
              <div className="space-y-2">
                {faqs.map((f, i) => (
                  <FaqRow
                    key={f.id || i}
                    faq={f}
                    onChange={(patch) => setFaqs((prev) => prev.map((x, j) => (j === i ? { ...x, ...patch } : x)))}
                    onRemove={() => setFaqs((prev) => prev.filter((_, j) => j !== i))}
                  />
                ))}
                {faqs.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[rgba(90,35,56,0.2)] px-4 py-6 text-center text-[13px] text-[rgba(90,35,56,0.55)]">
                    No FAQs yet. Add one or click <em>Generate with AI</em>.
                  </p>
                ) : null}
                <button
                  onClick={() =>
                    setFaqs((prev) => [
                      ...prev,
                      { id: `faq-${Date.now().toString(36)}`, question: "", answer: "" },
                    ])
                  }
                  className="w-full rounded-lg border border-dashed border-[rgba(90,35,56,0.25)] py-2 text-[13px] text-[rgba(90,35,56,0.65)] transition-colors hover:border-[#c9497c] hover:bg-white hover:text-[#c9497c]"
                >
                  + Add FAQ
                </button>
              </div>
            </div>
          </div>
        </Collapsible>
      </div>

      {/* Save bar */}
      <div className="sticky bottom-4 mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgba(201,73,124,0.2)] bg-white/95 px-5 py-3 shadow-[0_12px_30px_rgba(122,44,44,0.12)] backdrop-blur">
        <span className="text-[13px] text-[rgba(90,35,56,0.65)]">
          {doc.updatedAt ? `Last saved ${new Date(doc.updatedAt).toLocaleString()}` : "Ready to save"}
        </span>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/pages"
            className="rounded-full border border-[rgba(90,35,56,0.2)] px-4 py-2 text-[13px] font-medium text-[#5a2338] hover:border-[#d95f48] hover:text-[#d95f48]"
          >
            Back
          </Link>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-[#d95f48] px-6 py-2.5 text-[13px] font-medium text-white shadow-[0_10px_24px_rgba(217,95,72,0.3)] transition-colors hover:bg-[#c14e38] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- shared bits ---------------- */

const inputCls =
  "w-full rounded-lg border border-[rgba(90,35,56,0.2)] bg-white px-3 py-2 text-[14px] text-[#5a2338] outline-none focus:border-[#c9497c]";

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[rgba(201,73,124,0.15)] bg-white p-6 shadow-[0_10px_30px_rgba(122,44,44,0.05)]">
      <h2
        className="text-[18px] font-medium italic text-[#5a2338]"
        style={{ fontFamily: "var(--f-serif)" }}
      >
        {title}
      </h2>
      {description ? <p className="mt-0.5 text-[12.5px] text-[rgba(90,35,56,0.6)]">{description}</p> : null}
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function Collapsible({
  open,
  onToggle,
  title,
  description,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  title: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[rgba(201,73,124,0.15)] bg-white shadow-[0_10px_30px_rgba(122,44,44,0.05)]">
      <button
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 p-6 text-left"
      >
        <div>
          <h2
            className="text-[18px] font-medium italic text-[#5a2338]"
            style={{ fontFamily: "var(--f-serif)" }}
          >
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-[12.5px] text-[rgba(90,35,56,0.6)]">{description}</p> : null}
        </div>
        <svg
          className={"mt-2 h-4 w-4 text-[rgba(90,35,56,0.5)] transition-transform " + (open ? "rotate-180" : "")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open ? <div className="border-t border-[rgba(90,35,56,0.08)] p-6">{children}</div> : null}
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  action,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  /** Optional inline action rendered on the right side of the label row (e.g. an AI button). */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between gap-2 text-[12.5px] font-medium text-[rgba(90,35,56,0.75)]">
        <span className="flex items-center gap-1">
          {label}
          {required ? <span className="text-[#d95f48]">*</span> : null}
        </span>
        {action}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11.5px] text-[rgba(90,35,56,0.55)]">{hint}</span> : null}
    </label>
  );
}

/**
 * Small "✨ AI" chip that lives inside a Field label. Purple to match the
 * sparkle brand colour and stand out as a distinct action from Save.
 */
function AiChip({
  onClick,
  busy,
  disabled,
  label = "AI",
}: {
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium text-[#7a5ba6] transition-colors hover:bg-[#efe8f7] disabled:opacity-50"
      title={`Regenerate ${label} with AI`}
    >
      {busy ? (
        <span className="inline-block h-3 w-3 animate-spin rounded-full border border-[#7a5ba6] border-t-transparent" />
      ) : (
        <SparkleIcon />
      )}
      {label}
    </button>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors " +
        (on ? "bg-[#d95f48]" : "bg-[rgba(90,35,56,0.2)]")
      }
    >
      <span
        className={
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform " +
          (on ? "translate-x-[22px]" : "translate-x-0.5")
        }
      />
    </button>
  );
}

function KeywordChips({
  value,
  onChange,
  draft,
  onDraft,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  draft: string;
  onDraft: (v: string) => void;
}) {
  const commit = () => {
    const parts = draft.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const next = Array.from(new Set([...value, ...parts]));
    onChange(next);
    onDraft("");
  };
  return (
    <div className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-lg border border-[rgba(90,35,56,0.2)] bg-white px-2 py-1.5">
      {value.map((k, i) => (
        <span
          key={k + i}
          className="inline-flex items-center gap-1 rounded-full bg-[#f9dce9] px-2.5 py-1 text-[11.5px] text-[#a53a66]"
        >
          {k}
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="hover:text-[#5a2338]"
            aria-label={`Remove ${k}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => onDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={value.length ? "" : "Add a keyword"}
        className="flex-1 border-none bg-transparent px-1 py-1 text-[13px] text-[#5a2338] outline-none placeholder:text-[rgba(90,35,56,0.4)]"
      />
    </div>
  );
}

function FaqRow({
  faq,
  onChange,
  onRemove,
}: {
  faq: CmsFaq;
  onChange: (patch: Partial<CmsFaq>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(!faq.question || !faq.answer);
  return (
    <div className="rounded-lg border border-[rgba(90,35,56,0.12)] bg-white">
      <div className="flex items-start gap-2 px-3 py-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-[rgba(90,35,56,0.5)] hover:bg-[#fdf4ec] hover:text-[#c9497c]"
          aria-label={open ? "Collapse" : "Expand"}
        >
          <svg
            className={"h-3.5 w-3.5 transition-transform " + (open ? "" : "-rotate-90")}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <input
          value={faq.question}
          onChange={(e) => onChange({ question: e.target.value })}
          placeholder="Question…"
          className="flex-1 border-none bg-transparent py-1 text-[13.5px] font-medium text-[#5a2338] outline-none placeholder:text-[rgba(90,35,56,0.4)]"
        />
        <button
          onClick={onRemove}
          aria-label="Delete FAQ"
          className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-[rgba(217,47,47,0.7)] hover:bg-[#fbe0d8] hover:text-[#d92f2f]"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
          </svg>
        </button>
      </div>
      {open ? (
        <div className="border-t border-[rgba(90,35,56,0.08)] px-3 py-2">
          <textarea
            value={faq.answer}
            onChange={(e) => onChange({ answer: e.target.value })}
            placeholder="Short factual answer (1–2 sentences)…"
            className="w-full resize-y border-none bg-transparent text-[13px] text-[rgba(90,35,56,0.85)] outline-none placeholder:text-[rgba(90,35,56,0.4)]"
            rows={2}
          />
        </div>
      ) : null}
    </div>
  );
}

function ImageDrop({
  value,
  onChange,
  onError,
}: {
  value: string;
  onChange: (url: string) => void;
  onError: (msg: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await api.uploadImage(file);
      onChange(url);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-stretch gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) upload(f);
        }}
        onClick={() => inputRef.current?.click()}
        className="flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-dashed border-[rgba(90,35,56,0.25)] bg-[#fdf4ec] px-4 py-3 text-center text-[13px] text-[rgba(90,35,56,0.65)] transition-colors hover:border-[#d95f48] hover:bg-[#fbe0d8]/50 hover:text-[#5a2338]"
      >
        {uploading
          ? "Uploading…"
          : value
            ? "Replace — drag & drop or click"
            : "Drag & Drop your files or Browse"}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
      </div>
      {value ? (
        <div className="flex items-center gap-1">
          <span className="inline-flex h-12 w-16 items-center justify-center overflow-hidden rounded-lg border border-[rgba(90,35,56,0.1)] bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="h-full w-full object-cover" />
          </span>
          <button
            onClick={() => onChange("")}
            aria-label="Remove image"
            className="flex h-6 w-6 items-center justify-center rounded text-[rgba(217,47,47,0.7)] hover:bg-[#fbe0d8] hover:text-[#d92f2f]"
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
      <path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z" />
    </svg>
  );
}
