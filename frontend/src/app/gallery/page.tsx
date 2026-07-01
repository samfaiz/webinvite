"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { presets } from "@/templates/registry";
import { getTheme } from "@/themes";
import { getMotif } from "@/motifs";
import { api } from "@/lib/api";

const COMMUNITIES = [
  { id: "all", label: "All" },
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

export default function GalleryPage() {
  const [community, setCommunity] = useState("all");
  const [designs, setDesigns] = useState<any[] | null>(null);

  useEffect(() => {
    api.listDesigns().then(setDesigns).catch(() => setDesigns([]));
  }, []);

  const usingDesigns = !!designs && designs.length > 0;

  const all: Item[] = usingDesigns
    ? designs!.map((d) => ({
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
      }))
    : presets.map((p) => {
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

  const shown = all.filter((i) => community === "all" || i.community === community);

  return (
    <div className="min-h-svh bg-[#f4f1ea] px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between text-sm">
          <Link href="/" className="text-slate-500 hover:text-slate-800">← Home</Link>
          <div className="flex gap-4">
            <Link href="/dashboard" className="text-slate-500 hover:text-slate-800">My invitations</Link>
            <Link href="/login" className="text-slate-500 hover:text-slate-800">Log in</Link>
          </div>
        </div>

        <header className="text-center">
          <h1 className="font-display text-3xl uppercase tracking-[0.12em] text-[#2b3a67]">Choose Your Design</h1>
          <p className="font-body mt-2 text-lg italic text-[#7c8aa0]">
            Pick a style for your community — then just fill in your details.
          </p>
        </header>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {COMMUNITIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCommunity(c.id)}
              className="font-display rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.16em] transition-all sm:px-5"
              style={{ background: community === c.id ? "#2b3a67" : "#fff", color: community === c.id ? "#fff" : "#2b3a67", border: "1px solid rgba(43,58,103,0.2)" }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {designs === null ? (
          <p className="mt-10 text-center text-slate-400">Loading designs…</p>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((it) => (
              <div key={it.key} className="group overflow-hidden rounded-2xl bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                <div className="relative h-44 bg-cover bg-center" style={it.previewUrl ? { backgroundImage: `url(${it.previewUrl})` } : { background: `linear-gradient(135deg, ${it.gradFrom}, ${it.gradTo})` }}>
                  {!it.previewUrl ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-script text-4xl" style={{ color: it.primary }}>S &amp; L</span>
                      <span className="font-display mt-1 text-[10px] uppercase tracking-[0.2em]" style={{ color: it.accent }}>{it.icons.join("  ")}</span>
                    </div>
                  ) : null}
                </div>
                <div className="p-4">
                  <p className="font-display text-sm uppercase tracking-[0.12em] text-[#2b3a67]">{it.name}</p>
                  <p className="font-body text-sm text-[#7c8aa0]">{getMotif(it.community).name}</p>
                  <div className="mt-3 flex items-center gap-4">
                    <Link href={it.previewHref} className="font-display text-[11px] uppercase tracking-[0.16em] text-[#b08d57] hover:underline">Preview →</Link>
                    <Link href={it.href} className="font-display text-[11px] uppercase tracking-[0.16em] text-[#2b3a67] hover:underline">Customize →</Link>
                  </div>
                </div>
              </div>
            ))}
            {shown.length === 0 ? (
              <p className="col-span-full text-center text-slate-400">No designs in this category yet.</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
