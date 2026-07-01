import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function fetchList(path: string): Promise<Array<{ slug: string; updatedAt?: string; publishedAt?: string }>> {
  try {
    const r = await fetch(`${API}${path}`, { cache: "no-store" });
    return r.ok ? await r.json() : [];
  } catch {
    return [];
  }
}

/**
 * Indexable marketing routes + all published blog posts and CMS pages. Personal
 * invitations and the app/admin remain excluded (they're noindex).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, pages] = await Promise.all([fetchList("/blog"), fetchList("/pages")]);

  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/gallery`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE.url}/blog`, changeFrequency: "daily", priority: 0.7 },
  ];

  for (const p of posts) {
    entries.push({
      url: `${SITE.url}/blog/${p.slug}`,
      lastModified: p.updatedAt || p.publishedAt,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }
  for (const p of pages) {
    entries.push({
      url: `${SITE.url}/p/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }
  return entries;
}
