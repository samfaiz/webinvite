"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, type SiteSettings } from "@/lib/api";

/**
 * `/admin/site-settings` — Company → Site Settings. There is a single row
 * (the site's identity), so the list is a one-row table with an Edit link;
 * "+ New site setting" is disabled (creating a second one would be wrong).
 */
export default function AdminSiteSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [row, setRow] = useState<SiteSettings | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) return void router.push("/login");
    if (user.role !== "admin") return void router.push("/dashboard");
    api
      .getSiteSettings()
      .then(setRow)
      .catch((e) => setErr((e as Error).message));
  }, [loading, user, router]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div
        className="flex h-[70vh] items-center justify-center text-[rgba(43,58,103,0.5)]"
        style={{ fontFamily: "var(--f-body)" }}
      >
        Loading…
      </div>
    );
  }

  const empty = !row || !row.branding.brandName;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10 sm:py-10" style={{ fontFamily: "var(--f-body)" }}>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-[12px] text-[rgba(43,58,103,0.55)]">
            <Link href="/admin" className="hover:text-[#2b3a67]">Admin</Link>
            <span className="text-[rgba(43,58,103,0.3)]">›</span>
            <span className="text-[rgba(43,58,103,0.75)]">Site Settings</span>
            <span className="text-[rgba(43,58,103,0.3)]">›</span>
            <span className="text-[rgba(43,58,103,0.55)]">List</span>
          </nav>
          <h1
            className="mt-1 text-4xl font-medium italic text-[#2b3a67] sm:text-[42px]"
            style={{ fontFamily: "var(--f-serif)" }}
          >
            Site Settings
          </h1>
        </div>
        <Link
          href="/admin/site-settings/edit"
          className="rounded-full bg-[#2b3a67] px-5 py-2.5 text-[13px] font-medium text-white shadow-[0_10px_24px_rgba(43,58,103,0.3)] transition-colors hover:bg-[#22305a]"
        >
          {empty ? "+ Set up site" : "Edit site settings"}
        </Link>
      </div>

      {err ? <div className="mt-4 rounded-lg border border-[rgba(43,58,103,0.4)] bg-[#e3eaf5] px-4 py-2 text-sm text-[#7a2418]">{err}</div> : null}

      {/* Table */}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-[rgba(111,138,184,0.15)] bg-white shadow-[0_10px_30px_rgba(43,58,103,0.05)]">
        <table className="w-full text-left text-[13.5px]">
          <thead className="bg-[#eef2f8] text-[11px] font-medium uppercase tracking-[0.14em] text-[rgba(43,58,103,0.55)]">
            <tr>
              <th className="px-5 py-3">ID</th>
              <th className="px-5 py-3">Brand name</th>
              <th className="px-5 py-3">Tagline</th>
              <th className="px-5 py-3">Hero headline</th>
              <th className="px-5 py-3">Logo</th>
              <th className="px-5 py-3">Favicon</th>
              <th className="px-5 py-3">Updated</th>
              <th className="px-5 py-3 text-right">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {row ? (
              <tr className="border-t border-[rgba(43,58,103,0.06)] transition-colors hover:bg-[#eef2f8]/60">
                <td className="px-5 py-3 align-middle">
                  <span className="rounded-md border border-[rgba(43,58,103,0.15)] bg-[#eef2f8] px-2 py-0.5 font-mono text-[11.5px] text-[rgba(43,58,103,0.75)]">
                    {row.id}
                  </span>
                </td>
                <td className="px-5 py-3 align-middle font-medium text-[#2b3a67]">
                  {row.branding.brandName || <span className="text-[rgba(43,58,103,0.4)]">— not set —</span>}
                </td>
                <td className="max-w-[220px] truncate px-5 py-3 align-middle text-[rgba(43,58,103,0.75)]" title={row.hero.tagline}>
                  {row.hero.tagline || <span className="text-[rgba(43,58,103,0.35)]">—</span>}
                </td>
                <td className="max-w-[240px] truncate px-5 py-3 align-middle text-[#2b3a67]" title={row.hero.heroHeadline}>
                  {row.hero.heroHeadline || <span className="text-[rgba(43,58,103,0.35)]">—</span>}
                </td>
                <td className="px-5 py-3 align-middle">
                  {row.branding.logo ? (
                    <span className="inline-flex h-8 w-12 items-center justify-center overflow-hidden rounded-md border border-[rgba(43,58,103,0.1)] bg-[#eef2f8]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={row.branding.logo} alt="" className="h-full w-full object-contain" />
                    </span>
                  ) : (
                    <span className="text-[rgba(43,58,103,0.35)]">—</span>
                  )}
                </td>
                <td className="px-5 py-3 align-middle">
                  {row.branding.favicon ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-md border border-[rgba(43,58,103,0.1)] bg-[#eef2f8]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={row.branding.favicon} alt="" className="h-full w-full object-contain" />
                    </span>
                  ) : (
                    <span className="text-[rgba(43,58,103,0.35)]">—</span>
                  )}
                </td>
                <td className="px-5 py-3 align-middle text-[rgba(43,58,103,0.65)]">
                  {row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : "—"}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right">
                  <Link
                    href="/admin/site-settings/edit"
                    className="inline-flex items-center gap-1 text-[12.5px] text-[#2b3a67] hover:underline"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9M4 20h4l10-10-4-4L4 16z" />
                    </svg>
                    Edit
                  </Link>
                </td>
              </tr>
            ) : (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-[rgba(43,58,103,0.45)]">
                  Loading site settings…
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {row ? (
          <div className="flex items-center justify-between border-t border-[rgba(43,58,103,0.08)] bg-[#eef2f8]/50 px-5 py-3 text-[12.5px] text-[rgba(43,58,103,0.7)]">
            <span>Showing 1 result</span>
            <span className="text-[rgba(43,58,103,0.5)]">Only one site-settings record exists.</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
