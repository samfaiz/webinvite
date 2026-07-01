import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

/**
 * Allow crawling of the marketing site; keep the app, admin and API out of the
 * index. Personal invitations (/i/*) stay crawlable so social link-previews can
 * read their Open Graph tags, but each is marked noindex in its own metadata.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/dashboard", "/studio", "/create", "/login", "/api"],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
