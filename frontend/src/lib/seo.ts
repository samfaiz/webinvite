import type { Metadata } from "next";
import type { PublicSiteSettings } from "./api";

/**
 * Central SEO configuration and helpers for Web Invite.
 * Every page derives its <head> metadata and structured data from here so the
 * whole site is consistent — and so the AI SEO layer + Site Settings admin
 * have one place to read/write defaults.
 */
export const SITE = {
  name: "Web Invite",
  /** Canonical origin, no trailing slash. Override per-environment with NEXT_PUBLIC_SITE_URL. */
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://webinvite.co").replace(/\/+$/, ""),
  description:
    "Create a beautiful, animated wedding-invitation website in minutes. Elegant templates for Christian, Hindu, Muslim and secular weddings — with RSVP, schedule, your story and more.",
  locale: "en_US",
  keywords: [
    "wedding invitation website",
    "digital wedding invitation",
    "online wedding invite",
    "e-invitation",
    "wedding RSVP website",
    "wedding website builder",
    "Christian wedding invitation",
    "Hindu wedding invitation",
    "Muslim wedding invitation",
  ],
} as const;

/** Resolve a path to an absolute URL on the canonical origin. */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

type PageMetaInput = {
  title?: string;
  description?: string;
  /** canonical path, e.g. "/gallery" */
  path?: string;
  /** absolute URL or site-relative path to a social image */
  image?: string;
  noindex?: boolean;
  keywords?: string[];
};

/**
 * Build a page's Metadata from a few fields. Titles flow through the root
 * template ("%s · Web Invite"); omit `title` on the home page to use the default.
 */
export function pageMetadata({ title, description, path = "/", image, noindex, keywords }: PageMetaInput): Metadata {
  const url = absoluteUrl(path);
  const desc = description || SITE.description;
  const images = image ? [{ url: absoluteUrl(image) }] : undefined;
  return {
    title,
    description: desc,
    keywords: keywords?.length ? keywords : undefined,
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "website",
      siteName: SITE.name,
      url,
      title: title || SITE.name,
      description: desc,
      locale: SITE.locale,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: title || SITE.name,
      description: desc,
      ...(image ? { images: [absoluteUrl(image)] } : {}),
    },
  };
}

/**
 * Resolve the brand name to display in <title>, JSON-LD and share cards.
 * Site Settings → Branding wins when populated; otherwise the built-in
 * "Web Invite" from `SITE.name` is used.
 */
export function resolveBrandName(s: PublicSiteSettings | null): string {
  return s?.branding.brandName?.trim() || SITE.name;
}

/* ----------------------------- JSON-LD builders ----------------------------- */

/**
 * Organization structured data. When Site Settings are populated, the schema
 * type, founded year, logo, address and social links all flow through so
 * search + AI engines have the whole identity in one JSON-LD block.
 */
export function organizationLd(s?: PublicSiteSettings | null) {
  const brandName = resolveBrandName(s ?? null);
  const description = s?.hero.valueProposition?.trim() || SITE.description;
  const type = s?.seo.orgSchemaType?.trim() || "Organization";
  const logo = s?.branding.logo ? absoluteUrl(s.branding.logo) : undefined;
  const founded = s?.seo.orgFoundedYear?.trim();
  const address = s?.contact.address?.trim();
  const email = s?.contact.contactEmail?.trim();
  const phone = s?.contact.phone?.trim();

  const sameAs = (s?.social.links ?? [])
    .map((l) => l.url?.trim())
    .filter((u): u is string => !!u && /^https?:\/\//.test(u));

  return {
    "@context": "https://schema.org",
    "@type": type,
    name: brandName,
    url: SITE.url,
    description,
    ...(logo ? { logo } : {}),
    ...(founded ? { foundingDate: founded } : {}),
    ...(address ? { address: { "@type": "PostalAddress", streetAddress: address } } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { telephone: phone } : {}),
    sameAs,
  };
}

export function websiteLd(s?: PublicSiteSettings | null) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: resolveBrandName(s ?? null),
    url: SITE.url,
    inLanguage: "en",
  };
}

export function softwareApplicationLd(s?: PublicSiteSettings | null) {
  const description = s?.seo.metaDescription?.trim() || SITE.description;
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: resolveBrandName(s ?? null),
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    url: SITE.url,
    description,
  };
}

/**
 * Root-layout metadata derived from Site Settings, with sensible fallbacks
 * onto the `SITE.*` constants. Kept as a plain builder so pages can override
 * per-route (title / description / og image) via their own `generateMetadata`
 * — Next merges child metadata onto parent metadata automatically.
 */
export function rootMetadataFromSettings(s: PublicSiteSettings | null): Metadata {
  const brand = resolveBrandName(s);
  const tagline = s?.hero.tagline?.trim();
  const defaultTitle =
    s?.seo.metaTitle?.trim() ||
    (tagline ? `${brand} — ${tagline}` : `${brand} — Beautiful Wedding Invitation Websites`);
  const description = s?.seo.metaDescription?.trim() || SITE.description;
  const keywords = s?.seo.keywords?.length ? s.seo.keywords : [...SITE.keywords];
  const ogImage = s?.seo.ogImage?.trim() ? absoluteUrl(s.seo.ogImage.trim()) : undefined;
  const favicon = s?.branding.favicon?.trim();

  return {
    metadataBase: new URL(SITE.url),
    title: {
      default: defaultTitle,
      template: `%s · ${brand}`,
    },
    description,
    applicationName: brand,
    keywords,
    authors: [{ name: brand, url: SITE.url }],
    creator: brand,
    publisher: brand,
    alternates: { canonical: SITE.url },
    ...(favicon ? { icons: { icon: favicon, shortcut: favicon, apple: favicon } } : {}),
    openGraph: {
      type: "website",
      siteName: brand,
      url: SITE.url,
      title: defaultTitle,
      description,
      locale: SITE.locale,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    category: "technology",
  };
}
