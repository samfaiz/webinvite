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
    <div className="min-h-svh bg-[#f7f9fc] text-[#2b3a67]">
      <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#b08d57,#5c7bb0,#5c7bb0,#7a5ba6)" }} />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div
          className="mb-6 flex items-center justify-between text-sm text-[rgba(43,58,103,0.65)]"
          style={{ fontFamily: "var(--f-body)" }}
        >
          <Link href="/" className="hover:text-[#2b3a67]">← Home</Link>
          <div className="flex gap-4">
            <Link href="/dashboard" className="hover:text-[#2b3a67]">My invitations</Link>
            <Link href="/login" className="hover:text-[#2b3a67]">Log in</Link>
          </div>
        </div>

        <header className="text-center">
          <span
            className="text-[11px] font-medium tracking-[0.28em] text-[#5c7bb0]"
            style={{ fontFamily: "var(--f-body)" }}
          >
            DESIGN GALLERY
          </span>
          <h1
            className="mt-3 text-4xl font-medium italic text-[#2b3a67] sm:text-5xl"
            style={{ fontFamily: "var(--f-serif)" }}
          >
            Choose your design
          </h1>
          <p
            className="mt-3 text-[16px] font-light text-[rgba(43,58,103,0.7)]"
            style={{ fontFamily: "var(--f-body)" }}
          >
            Pick a style for your community — then just fill in your details.
          </p>
        </header>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {COMMUNITIES.map((c) => {
            const on = community === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCommunity(c.id)}
                className="rounded-full border px-5 py-2 text-[12px] font-medium tracking-[0.16em] transition-colors"
                style={{
                  background: on ? "#2b3a67" : "#fff",
                  color: on ? "#fff" : "#2b3a67",
                  borderColor: on ? "#2b3a67" : "rgba(43,58,103,0.2)",
                  fontFamily: "var(--f-body)",
                }}
              >
                {c.label.toUpperCase()}
              </button>
            );
          })}
        </div>

        {designs === null ? (
          <p
            className="mt-10 text-center text-[rgba(43,58,103,0.5)]"
            style={{ fontFamily: "var(--f-body)" }}
          >
            Loading designs…
          </p>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((it) => (
              <div
                key={it.key}
                className="group overflow-hidden rounded-2xl border border-[rgba(111,138,184,0.15)] bg-white shadow-[0_10px_30px_rgba(43,58,103,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(43,58,103,0.14)]"
              >
                <div
                  className="relative h-44 bg-cover bg-center"
                  style={
                    it.previewUrl
                      ? { backgroundImage: `url(${it.previewUrl})` }
                      : { background: `linear-gradient(135deg, ${it.gradFrom}, ${it.gradTo})` }
                  }
                >
                  {!it.previewUrl ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span
                        className="text-[42px] font-semibold italic"
                        style={{ color: it.primary, fontFamily: "var(--f-serif)" }}
                      >
                        S &amp; L
                      </span>
                      <span
                        className="mt-1 text-[10px] tracking-[0.2em]"
                        style={{ color: it.accent, fontFamily: "var(--f-body)" }}
                      >
                        {it.icons.join("  ")}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="p-5">
                  <p
                    className="text-[15px] font-medium text-[#2b3a67]"
                    style={{ fontFamily: "var(--f-body)" }}
                  >
                    {it.name}
                  </p>
                  <p
                    className="text-[13px] text-[rgba(43,58,103,0.55)]"
                    style={{ fontFamily: "var(--f-body)" }}
                  >
                    {getMotif(it.community).name}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <Link
                      href={it.previewHref}
                      className="rounded-full border border-[rgba(43,58,103,0.2)] px-3.5 py-1.5 text-[11px] font-medium tracking-[0.14em] text-[#b08d57] transition-colors hover:border-[#b08d57] hover:bg-[#fbecc9]"
                      style={{ fontFamily: "var(--f-body)" }}
                    >
                      PREVIEW
                    </Link>
                    <Link
                      href={it.href}
                      className="rounded-full bg-[#2b3a67] px-3.5 py-1.5 text-[11px] font-medium tracking-[0.14em] text-white transition-colors hover:bg-[#22305a]"
                      style={{ fontFamily: "var(--f-body)" }}
                    >
                      CUSTOMIZE →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            {shown.length === 0 ? (
              <p
                className="col-span-full text-center text-[rgba(43,58,103,0.5)]"
                style={{ fontFamily: "var(--f-body)" }}
              >
                No designs in this category yet.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
