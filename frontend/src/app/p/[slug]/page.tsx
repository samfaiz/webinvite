import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/cms/PublicShell";
import { BlockRenderer } from "@/cms/BlockRenderer";
import { normalizeBlocks } from "@/cms/blocks";
import { SITE, absoluteUrl } from "@/lib/seo";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export const dynamic = "force-dynamic";

type Page = {
  slug: string;
  title: string;
  excerpt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImage?: string | null;
  coverImage?: string | null;
  noindex?: boolean;
  blocks?: unknown[];
};

async function getPage(slug: string): Promise<Page | null> {
  try {
    const r = await fetch(`${API}/pages/${encodeURIComponent(slug)}`, { cache: "no-store" });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return { title: "Page not found", robots: { index: false } };
  const title = page.seoTitle || page.title;
  const description = page.seoDescription || page.excerpt || SITE.description;
  const image = page.ogImage || page.coverImage || undefined;
  const url = absoluteUrl(`/p/${page.slug}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: page.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: SITE.name,
      ...(image ? { images: [{ url: absoluteUrl(image) }] } : {}),
    },
    twitter: { card: "summary_large_image", title, description, ...(image ? { images: [absoluteUrl(image)] } : {}) },
  };
}

export default async function ContentPageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl px-6 py-12">
        <h1
          className="text-4xl font-medium italic leading-tight text-[#2b3a67] sm:text-5xl"
          style={{ fontFamily: "var(--f-serif)" }}
        >
          {page.title}
        </h1>
        <div className="mt-8">
          <BlockRenderer blocks={normalizeBlocks(page.blocks)} />
        </div>
      </article>
    </PublicShell>
  );
}
