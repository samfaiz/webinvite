"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { presets } from "@/templates/registry";
import { getTheme } from "@/themes";
import { getMotif } from "@/motifs";
import { api } from "@/lib/api";

const CATEGORIES = [
  { id: "general", label: "General" },
  { id: "kerala-christian", label: "Christian" },
  { id: "hindu", label: "Hindu" },
  { id: "muslim", label: "Muslim" },
  { id: "secular", label: "Secular" },
];

type Item = {
  key: string;
  name: string;
  community: string;
  primary: string;
  accent: string;
  gradFrom: string;
  gradTo: string;
  previewUrl?: string;
  icons: string[];
  href: string;
  previewHref: string;
};

export default function Landing() {
  const [cat, setCat] = useState("general");
  const [designs, setDesigns] = useState<any[] | null>(null);

  useEffect(() => {
    api.listDesigns().then(setDesigns).catch(() => setDesigns([]));
  }, []);

  function items(): Item[] {
    const useDesigns = designs && designs.length > 0;
    if (useDesigns) {
      const pool =
        cat === "general"
          ? designs!.slice(0, 9)
          : designs!.filter((d) => d.community === cat);
      return pool.map((d) => ({
        key: d.id,
        name: d.name,
        community: d.community,
        primary: d.colors.primary,
        accent: d.colors.accent,
        gradFrom: d.colors.gradientFrom,
        gradTo: d.colors.gradientTo,
        previewUrl: d.previewUrl,
        icons: Object.values(getMotif(d.community).icons).slice(0, 4),
        href: `/create?design=${d.id}`,
        previewHref: `/preview/${d.id}`,
      }));
    }
    // fallback: built-in presets
    const pool =
      cat === "general"
        ? ["kerala-christian", "hindu", "muslim", "secular"].flatMap((c) =>
            presets.filter((p) => p.community === c).slice(0, 2),
          )
        : presets.filter((p) => p.community === cat).slice(0, 6);
    return pool.map((p) => {
      const t = getTheme(p.themeId);
      return {
        key: p.id,
        name: p.name,
        community: p.community,
        primary: t.colors.primary,
        accent: t.colors.accent,
        gradFrom: t.colors.gradientFrom,
        gradTo: t.colors.gradientTo,
        icons: Object.values(getMotif(p.motifId).icons).slice(0, 4),
        href: `/create?preset=${p.id}`,
        previewHref: `/preview/${p.id}`,
      };
    });
  }

  const list = items();

  return (
    <div className="min-h-svh bg-[#f4f1ea] text-[#33414f]">
      <nav className="flex items-center justify-between px-6 py-4">
        <span className="font-display text-lg uppercase tracking-[0.2em] text-[#2b3a67]">Eternal</span>
        <div className="flex items-center gap-4 text-sm sm:gap-5">
          <Link href="/gallery" className="text-slate-600 hover:text-slate-900">Designs</Link>
          <Link href="/dashboard" className="hidden text-slate-600 hover:text-slate-900 sm:inline">My invitations</Link>
          <Link href="/login" className="rounded-full bg-[#2b3a67] px-4 py-1.5 text-white hover:bg-[#23315a]">Log in</Link>
        </div>
      </nav>

      <header className="relative overflow-hidden px-6 py-16 text-center sm:py-28" style={{ background: "linear-gradient(180deg,#f6f1e7,#e7eef4 60%,#dbe6ef)" }}>
        <p className="font-display text-[11px] uppercase tracking-[0.4em] text-[#b08d57]">Wedding Invitations</p>
        <h1 className="font-script mx-auto mt-4 max-w-3xl text-5xl leading-tight text-[#2b3a67] sm:text-7xl">Your love story, beautifully invited</h1>
        <p className="font-body mx-auto mt-5 max-w-xl text-base text-slate-600 sm:text-lg">
          Pick a design for your community, fill in your details, and share a stunning
          animated invitation — with live RSVPs in minutes.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/create" className="rounded-full bg-[#2b3a67] px-7 py-3 text-sm font-medium text-white hover:bg-[#23315a]">Create your invitation</Link>
          <a href="#samples" className="rounded-full border border-[#b08d57]/50 px-7 py-3 text-sm font-medium text-[#8a6a3c] hover:bg-white/50">See samples ↓</a>
        </div>
      </header>

      <section id="samples" className="mx-auto max-w-5xl px-6 py-14">
        <div className="text-center">
          <h2 className="font-display text-2xl uppercase tracking-[0.12em] text-[#2b3a67]">See a sample</h2>
          <p className="font-body mt-2 text-base italic text-slate-500 sm:text-lg">Which style would you like to preview?</p>
        </div>

        <div className="mt-7 flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className="font-display rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.16em] transition-all sm:px-5"
              style={{ background: cat === c.id ? "#2b3a67" : "#fff", color: cat === c.id ? "#fff" : "#2b3a67", border: "1px solid rgba(43,58,103,0.2)" }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {designs === null ? (
          <p className="mt-10 text-center text-slate-400">Loading designs…</p>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((it) => (
              <div key={it.key} className="group overflow-hidden rounded-2xl bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                <div className="relative h-48 bg-cover bg-center" style={it.previewUrl ? { backgroundImage: `url(${it.previewUrl})` } : { background: `linear-gradient(135deg, ${it.gradFrom}, ${it.gradTo})` }}>
                  {!it.previewUrl ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-script text-5xl" style={{ color: it.primary }}>S &amp; L</span>
                      <span className="font-display mt-1 text-[10px] uppercase tracking-[0.2em]" style={{ color: it.accent }}>{it.icons.join("  ")}</span>
                    </div>
                  ) : null}
                </div>
                <div className="p-4">
                  <p className="font-display text-sm uppercase tracking-[0.12em] text-[#2b3a67]">{it.name}</p>
                  <p className="font-body text-sm text-slate-500">{getMotif(it.community).name}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <Link href={it.previewHref} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-[#b08d57] hover:bg-slate-50">Preview ↗</Link>
                    <Link href={it.href} className="rounded-lg bg-[#2b3a67] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-white hover:bg-[#23315a]">Use this →</Link>
                  </div>
                </div>
              </div>
            ))}
            {list.length === 0 ? (
              <p className="col-span-full text-center text-slate-400">No designs in this category yet.</p>
            ) : null}
          </div>
        )}

        <p className="mt-10 text-center">
          <Link href="/gallery" className="text-sm text-slate-500 hover:text-slate-800 hover:underline">Browse all designs →</Link>
        </p>
      </section>

      <footer className="border-t border-slate-200 px-6 py-8 text-center text-xs text-slate-400">
        Eternal — create &amp; share beautiful wedding invitations.
      </footer>
    </div>
  );
}
