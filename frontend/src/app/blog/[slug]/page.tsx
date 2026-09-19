import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PublicShell } from "@/cms/PublicShell";
import { BlockRenderer } from "@/cms/BlockRenderer";
import { normalizeBlocks } from "@/cms/blocks";
import { JsonLd } from "@/components/JsonLd";
import { SITE, absoluteUrl, organizationLd } from "@/lib/seo";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export const dynamic = "force-dynamic";

type Post = {
  slug: string;
  title: string;
  excerpt?: string | null;
  coverImage?: string | null;
  authorName?: string | null;
  tags?: string[];
  status: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImage?: string | null;
  noindex?: boolean;
  publishedAt?: string | null;
  updatedAt?: string | null;
  blocks?: unknown[];
};

/**
 * Rough reading time from the post's blocks. Derived rather than stored so it
 * stays true when the post is edited in the admin, and so authors never have
 * to maintain it. 200 wpm is the usual figure for online prose.
 */
function readingTime(blocks: unknown[] | undefined): string {
  const text = JSON.stringify(blocks ?? []).replace(/<[^>]*>/g, " ");
  const words = (text.match(/[A-Za-zÀ-ɏ]+/g) ?? []).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

async function getPost(slug: string): Promise<Post | null> {
  try {
    const r = await fetch(`${API}/blog/${encodeURIComponent(slug)}`, { cache: "no-store" });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post not found", robots: { index: false } };
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt || SITE.description;
  const image = post.ogImage || post.coverImage || undefined;
  const url = absoluteUrl(`/blog/${post.slug}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: post.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "article",
      url,
      title,
      description,
      siteName: SITE.name,
      ...(image ? { images: [{ url: absoluteUrl(image) }] } : {}),
    },
    twitter: { card: "summary_large_image", title, description, ...(image ? { images: [absoluteUrl(image)] } : {}) },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const url = absoluteUrl(`/blog/${post.slug}`);
  const image = post.ogImage || post.coverImage;
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seoDescription || post.excerpt || undefined,
    image: image ? absoluteUrl(image) : undefined,
    datePublished: post.publishedAt || undefined,
    dateModified: post.updatedAt || post.publishedAt || undefined,
    author: { "@type": "Person", name: post.authorName || SITE.name },
    publisher: organizationLd(),
    mainEntityOfPage: url,
  };

  return (
    <PublicShell>
      <JsonLd data={articleLd} />
      <article className="mx-auto max-w-[720px] px-6 pb-20 pt-10">
        <Link
          href="/blog"
          className="text-[13px] font-medium transition-opacity hover:opacity-70"
          style={{ color: "var(--b-primary)" }}
        >
          ← All posts
        </Link>

        {/* Title block. The eyebrow carries the reading time, which is derived
            from the blocks rather than stored, so it stays true as posts are
            edited in the admin. */}
        <header className="mt-6">
          <p
            className="text-[11px] font-semibold uppercase"
            style={{ letterSpacing: "0.18em", color: "var(--b-gold)" }}
          >
            {[post.tags?.[0] ?? "Journal", readingTime(post.blocks)].join(" · ")}
          </p>
          <h1
            className="mt-3 text-[34px] font-semibold leading-[1.12] sm:text-[46px]"
            style={{ fontFamily: "var(--f-display)", color: "var(--b-ink)", textWrap: "pretty" }}
          >
            {post.title}
          </h1>
          {post.excerpt ? (
            <p
              className="mt-4 text-[18px] leading-[1.6]"
              style={{ color: "var(--b-muted)", textWrap: "pretty" }}
            >
              {post.excerpt}
            </p>
          ) : null}

          <div
            className="mt-6 flex items-center gap-3 border-t pt-5"
            style={{ borderColor: "var(--b-border)" }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold"
              style={{ background: "var(--b-sand)", color: "var(--b-primary)" }}
              aria-hidden
            >
              {(post.authorName || "W").trim().charAt(0).toUpperCase()}
            </span>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold" style={{ color: "var(--b-ink)" }}>
                {post.authorName || "Web Invite"}
              </span>
              {post.publishedAt ? (
                <time
                  dateTime={post.publishedAt}
                  className="text-[12px]"
                  style={{ color: "var(--b-muted)" }}
                >
                  {new Date(post.publishedAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </time>
              ) : null}
            </div>
          </div>
        </header>

        {post.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImage}
            alt=""
            className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover"
            style={{ border: "1px solid var(--b-border)" }}
          />
        ) : null}

        {/* Body. The generous rhythm lives here rather than in BlockRenderer so
            the same blocks can be reused at other measures (CMS pages, previews). */}
        <div className="mt-10 flex flex-col gap-6 text-[17px] leading-[1.75]">
          <BlockRenderer blocks={normalizeBlocks(post.blocks)} />
        </div>

        {post.tags && post.tags.length ? (
          <div
            className="mt-12 flex flex-wrap gap-2 border-t pt-6"
            style={{ borderColor: "var(--b-border)" }}
          >
            {post.tags.map((t) => (
              <span
                key={t}
                className="rounded-full px-3 py-1 text-[12px] font-medium"
                style={{ background: "var(--b-tint)", color: "var(--b-body)" }}
              >
                #{t}
              </span>
            ))}
          </div>
        ) : null}

        {/* Close on the thing the post exists to sell. */}
        <aside
          className="mt-12 flex flex-col items-start gap-3 rounded-2xl px-7 py-8"
          style={{ background: "var(--b-ink)" }}
        >
          <p
            className="text-[22px] font-semibold leading-[1.2]"
            style={{ fontFamily: "var(--f-display)", color: "var(--b-tint)" }}
          >
            Ready to send yours?
          </p>
          <p className="text-[14px] leading-[1.6]" style={{ color: "var(--b-border-soft)" }}>
            Pick a design, add your details, share one link. Guests RSVP in a tap.
          </p>
          <Link
            href="/gallery"
            className="mt-1 rounded-full px-6 py-3 text-[14px] font-semibold"
            style={{ background: "var(--b-sand)", color: "var(--b-ink)" }}
          >
            Browse designs
          </Link>
        </aside>
      </article>
    </PublicShell>
  );
}
