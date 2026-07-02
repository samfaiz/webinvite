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
      <article className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/blog" className="text-sm text-[rgba(90,35,56,0.6)] hover:text-[#d95f48]" style={{ fontFamily: "var(--f-body)" }}>← All posts</Link>
        <h1
          className="mt-4 text-4xl font-medium italic leading-tight text-[#5a2338] sm:text-5xl"
          style={{ fontFamily: "var(--f-serif)" }}
        >
          {post.title}
        </h1>
        <p
          className="mt-3 text-[11px] uppercase tracking-wide text-[rgba(90,35,56,0.5)]"
          style={{ fontFamily: "var(--f-body)" }}
        >
          {[post.authorName, post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : null].filter(Boolean).join(" · ")}
        </p>
        {post.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverImage} alt="" className="mt-6 w-full rounded-2xl border border-[rgba(90,35,56,0.1)] object-cover" />
        ) : null}
        <div className="mt-8">
          <BlockRenderer blocks={normalizeBlocks(post.blocks)} />
        </div>
        {post.tags && post.tags.length ? (
          <div className="mt-10 flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <span key={t} className="rounded-full bg-white px-3 py-1 text-xs text-slate-500 ring-1 ring-slate-200">#{t}</span>
            ))}
          </div>
        ) : null}
      </article>
    </PublicShell>
  );
}
