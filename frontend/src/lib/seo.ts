import type { Metadata } from "next";

/**
 * Central SEO configuration and helpers for Web Invite.
 * Every page derives its <head> metadata and structured data from here so the
 * whole site is consistent — and so the (upcoming) AI SEO layer has one place
 * to read/write per-page overrides.
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

/* ----------------------------- JSON-LD builders ----------------------------- */

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    sameAs: [] as string[],
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    inLanguage: "en",
  };
}

export function softwareApplicationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE.name,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    url: SITE.url,
    description: SITE.description,
  };
}
