"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SITE } from "@/lib/seo";
import { api, type PublicSiteSettings } from "@/lib/api";
import { socialIcon, socialLabel } from "@/lib/social-icons";

/** Public site chrome (header + footer) for CMS pages and the blog. Reads
 *  brand name, footer message, copyright and social links from Site Settings
 *  so admins can change them without touching code. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PublicSiteSettings | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .publicSiteSettings()
      .then((s) => alive && setSettings(s))
      .catch(() => alive && setSettings(null));
    return () => {
      alive = false;
    };
  }, []);

  const year = new Date().getFullYear();
  const brand = settings?.branding.brandName?.trim() || SITE.name;
  const logo = settings?.branding.logo;
  const footerMessage = settings?.social.footerMessage?.trim() || "";
  const copyright = settings?.social.copyrightText?.trim() || `© ${year} ${brand}`;
  const links = (settings?.social.links || []).filter((l) => l.url);

  return (
    <div className="brand-page flex min-h-screen flex-col">
      <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,var(--b-gold),var(--b-primary),var(--b-primary),var(--b-gold-deep))" }} />
      <header>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-baseline gap-2">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={brand} className="h-7 w-auto" />
            ) : (
              <>
                <span className="text-[22px] font-semibold italic text-[var(--b-ink)]" style={{ fontFamily: "var(--f-serif)" }}>
                  {brand}
                </span>
                <span className="h-[5px] w-[5px] rotate-45 bg-[var(--b-gold)]" />
              </>
            )}
          </Link>
          <nav
            className="flex items-center gap-5 text-sm text-[rgba(43,27,18,0.75)]"
            style={{ fontFamily: "var(--f-body)" }}
          >
            <Link href="/gallery" className="hover:text-[var(--b-ink)]">Designs</Link>
            <Link href="/blog" className="hover:text-[var(--b-ink)]">Blog</Link>
            <Link href="/contact" className="hover:text-[var(--b-ink)]">Contact</Link>
            <Link
              href="/create"
              className="rounded-full px-5 py-2 text-sm font-medium transition hover:brightness-95"
              style={{ background: "var(--b-primary)", color: "var(--b-bg)" }}
            >
              Create yours
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-[rgba(43,27,18,0.1)] bg-[var(--b-tint)]" style={{ fontFamily: "var(--f-body)" }}>
        <div className="mx-auto max-w-5xl px-6 py-8">
          {footerMessage ? (
            <p className="mb-6 max-w-2xl text-[14.5px] leading-[1.65] text-[rgba(43,27,18,0.7)]">
              {footerMessage}
            </p>
          ) : null}
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <span className="text-sm text-[rgba(43,27,18,0.55)]">{copyright}</span>
            <div className="flex flex-wrap items-center gap-2">
              {links.length > 0 ? (
                links.map((l) => (
                  <a
                    key={l.platform + l.url}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={socialLabel(l.platform)}
                    title={socialLabel(l.platform)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(43,27,18,0.15)] bg-white text-[rgba(43,27,18,0.7)] transition-colors hover:border-[var(--b-primary)] hover:text-[var(--b-ink)]"
                  >
                    {socialIcon(l.platform, "h-4 w-4")}
                  </a>
                ))
              ) : (
                <>
                  <Link href="/gallery" className="text-sm text-[rgba(43,27,18,0.55)] hover:text-[var(--b-gold)]">Designs</Link>
                  <Link href="/blog" className="text-sm text-[rgba(43,27,18,0.55)] hover:text-[var(--b-gold)]">Blog</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
