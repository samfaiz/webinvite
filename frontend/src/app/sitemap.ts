import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

/**
 * Public, indexable marketing routes. Personal invitation pages (/i/[slug]) and
 * the app (studio, dashboard, admin) are intentionally excluded — they're
 * noindex. Blog/CMS pages will be appended here dynamically in a later phase.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/gallery", priority: 0.8, changeFrequency: "weekly" },
  ];
  return routes.map((r) => ({
    url: `${SITE.url}${r.path}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
