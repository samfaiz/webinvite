"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { presets } from "@/templates/registry";
import { getTheme } from "@/themes";
import type { Theme } from "@/engine/types";

/**
 * Landing page, upper half — handoff screen 1a (maroon/cream).
 *
 * Nav, hero, "Create by" chip filters, the trending gallery with its
 * Use-template / See-end-result overlay, and the explore banner. The chips
 * filter the gallery in place and also carry through to /gallery as query
 * params, so a guest can keep narrowing on the full listing.
 */

type Card = {
  id: string;
  name: string;
  community: string;
  category: string;
  country: string;
  likes: number;
  colors: Theme["colors"];
  fonts: Theme["fonts"];
  /** /create link — presets and saved designs use different params */
  useHref: string;
  previewHref: string;
};

const CATEGORY = [
  "Wedding", "Birthday", "Baby shower", "Engagement",
  "Housewarming", "Anniversary", "Corporate", "Graduation",
];
const RELIGION = ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Interfaith"];
const COUNTRY = ["India", "UAE", "USA", "UK", "Indonesia", "Pakistan"];

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "-");
/** Religion chips map onto the repo's existing community keys. */
const COMMUNITY_OF: Record<string, string> = {
  hindu: "hindu",
  muslim: "muslim",
  christian: "kerala-christian",
  interfaith: "secular",
};

/** Page container — matches the footer's width so every band lines up. */
const CONTAINER = "mx-auto w-full max-w-[1240px]";

const SAMPLE = { eyebrow: "SAVE THE DATE", names: "Aarav & Meera", line: "12.12.2026 · Jaipur" };

/** A row from `GET /designs` (see the backend's DesignsService.toDto). */
type DesignRow = {
  id: string;
  name: string;
  community: string;
  category?: string;
  country?: string;
  likes?: number;
  colors: Theme["colors"];
  fonts: Theme["fonts"];
};

function cardsFromPresets(): Card[] {
  const seen = new Set<string>();
  return presets
    .filter((p) => {
      if (seen.has(p.themeId)) return false;
      seen.add(p.themeId);
      return true;
    })
    .map((p) => {
      const t = getTheme(p.themeId);
      return {
        id: p.id,
        name: p.name,
        community: p.community,
        category: "wedding",
        country: "india",
        likes: 0,
        colors: t.colors,
        fonts: t.fonts,
        useHref: `/create?preset=${p.id}`,
        previewHref: `/preview/${p.id}`,
      };
    });
}

export function LandingTop() {
  const [category, setCategory] = useState("wedding");
  const [religion, setReligion] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [all, setAll] = useState<Card[] | null>(null);

  useEffect(() => {
    let live = true;
    api
      .listDesigns()
      .then((rows) => {
        if (!live) return;
        const mapped: Card[] = rows.map((d: DesignRow) => ({
          id: d.id,
          name: d.name,
          community: d.community,
          category: d.category ?? "wedding",
          country: d.country ?? "india",
          likes: d.likes ?? 0,
          colors: d.colors,
          fonts: d.fonts,
          useHref: `/create?design=${d.id}`,
          previewHref: `/preview/${d.id}`,
        }));
        setAll(mapped.length ? mapped : cardsFromPresets());
      })
      .catch(() => live && setAll(cardsFromPresets()));
    return () => {
      live = false;
    };
  }, []);

  const shown = useMemo(() => {
    const list = all ?? [];
    return list
      .filter((c) => (category ? c.category === category : true))
      .filter((c) => (religion ? c.community === (COMMUNITY_OF[religion] ?? religion) : true))
      .filter((c) => (country ? c.country === country : true))
      .slice(0, 4);
  }, [all, category, religion, country]);

  /** Chips carry through to the full listing. */
  const galleryHref = useMemo(() => {
    const q = new URLSearchParams();
    if (category) q.set("category", category);
    if (religion) q.set("religion", religion);
    if (country) q.set("country", country);
    const s = q.toString();
    return `/gallery${s ? `?${s}` : ""}`;
  }, [category, religion, country]);

  const toggle = useCallback(
    (cur: string | null, next: string, set: (v: string | null) => void) =>
      set(cur === next ? null : next),
    [],
  );

  const heading = `${CATEGORY.find((c) => slug(c) === category) ?? "Wedding"} · trending this week`;

  return (
    <div style={{ background: "var(--b-bg)", fontFamily: "var(--f-brand)" }}>
      {/* ---------------------------------------------------------- Nav */}
      <nav
        className="py-[18px]"
        style={{ borderBottom: "1px solid rgba(43,27,18,.08)" }}
      >
        {/* The rule spans the viewport; the content stays in the page container.
            The gutter lives on the inner element, not the nav, so the logo lines
            up with the hero rather than sitting a gutter-width further out. */}
        <div className={`${CONTAINER} flex items-center justify-between px-6 sm:px-12`}>
        <Link href="/" className="flex items-baseline gap-[2px]">
          <span
            className="text-[22px] font-bold"
            style={{ fontFamily: "var(--f-display)", color: "var(--b-ink)" }}
          >
            webinvite
          </span>
          <span className="text-[22px] font-bold" style={{ fontFamily: "var(--f-display)", color: "var(--b-gold)" }}>
            .
          </span>
        </Link>

        {/* The mockup is a 1280px reference with no mobile nav. At phone width
            the logo, links and CTA collide, so the links drop away — nothing is
            stranded, because the hero links to both /gallery and /explore. */}
        <div
          className="hidden items-center gap-5 text-[14px] font-medium sm:flex sm:gap-7"
          style={{ color: "var(--b-body)" }}
        >
          <Link href="/gallery" className="hover:opacity-70">Templates</Link>
          <Link href="/explore" className="hover:opacity-70">Explore</Link>
          <a href="#how" className="hidden hover:opacity-70 md:inline">How it works</a>
          <a href="#pricing" className="hidden hover:opacity-70 md:inline">Pricing</a>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-[14px] font-semibold sm:inline" style={{ color: "var(--b-primary)" }}>
            Sign in
          </Link>
          <Link
            href="/create"
            className="whitespace-nowrap rounded-full px-4 py-[10px] text-[13px] font-semibold sm:px-5 sm:text-[14px]"
            style={{ background: "var(--b-primary)", color: "var(--b-bg)" }}
          >
            Create invite
          </Link>
        </div>
        </div>
      </nav>

      <div className={CONTAINER}>

      {/* --------------------------------------------------------- Hero */}
      <section className="grid items-center gap-10 px-6 pb-12 pt-10 sm:px-12 lg:grid-cols-[1fr_460px] lg:pt-14">
        <div className="flex flex-col gap-5">
          <span
            className="text-[12px] font-semibold uppercase"
            style={{ letterSpacing: "0.14em", color: "var(--b-gold)" }}
          >
            Digital invitations · Live RSVP
          </span>
          <h1
            className="m-0 text-[40px] font-semibold leading-[1.08] sm:text-[56px]"
            style={{ fontFamily: "var(--f-display)", color: "var(--b-ink)", textWrap: "pretty" }}
          >
            Invitations that feel like the occasion
          </h1>
          <p
            className="m-0 max-w-[44ch] text-[17px] leading-[1.6]"
            style={{ color: "#5c4a3c" }}
          >
            Pick a design, add your details, share one link. Guests RSVP in a tap — you watch
            the guest list fill in live.
          </p>
          <div className="flex flex-wrap items-center gap-[14px]">
            <Link
              href="/gallery"
              className="rounded-full px-7 py-[15px] text-[16px] font-semibold"
              style={{
                background: "var(--b-primary)",
                color: "var(--b-bg)",
                boxShadow: "0 6px 18px rgba(122,46,42,.25)",
              }}
            >
              Start free — pick a design
            </Link>
            <Link
              href="/explore"
              className="rounded-full px-6 py-[14px] text-[15px] font-semibold"
              style={{ color: "var(--b-primary)", border: "1.5px solid rgba(122,46,42,.35)" }}
            >
              ▶ Explore designs
            </Link>
          </div>
          <span className="text-[13px]" style={{ color: "var(--b-muted)" }}>
            2,40,000+ invites sent · No app needed for guests
          </span>
        </div>

        {/* two fanned invite cards + the live-RSVP stat */}
        <div className="relative hidden h-[420px] lg:block">
          <div
            className="absolute left-0 top-9 flex h-[352px] w-[250px] flex-col items-center justify-center gap-[10px] rounded-[14px] px-5 text-center"
            style={{
              background: "var(--b-ink)",
              transform: "rotate(-5deg)",
              boxShadow: "0 18px 40px rgba(43,27,18,.28)",
            }}
          >
            <span className="text-[11px]" style={{ letterSpacing: "0.22em", color: "var(--b-gold)" }}>
              YOU ARE INVITED
            </span>
            <span
              className="text-[34px] font-semibold leading-[1.1]"
              style={{ fontFamily: "var(--f-display)", color: "var(--b-tint)" }}
            >
              Zara turns One
            </span>
            <span className="h-px w-11" style={{ background: "var(--b-gold)" }} />
            <span className="text-[13px]" style={{ color: "#d8c6ac" }}>
              Sat, 14 Nov · 4 PM
            </span>
          </div>

          <div
            className="absolute right-2 top-0 flex h-[380px] w-[264px] flex-col items-center justify-center gap-[10px] rounded-[14px] px-5 text-center"
            style={{
              background: "var(--b-primary)",
              transform: "rotate(4deg)",
              boxShadow: "0 22px 48px rgba(122,46,42,.35)",
            }}
          >
            <span className="text-[11px]" style={{ letterSpacing: "0.24em", color: "var(--b-gold-soft)" }}>
              TOGETHER WITH THEIR FAMILIES
            </span>
            <span
              className="text-[40px] font-semibold leading-[1.12]"
              style={{ fontFamily: "var(--f-display)", color: "var(--b-surface)" }}
            >
              Aarav
              <br />&<br />
              Meera
            </span>
            <span className="h-px w-11" style={{ background: "var(--b-gold-soft)" }} />
            <span className="text-[13px]" style={{ color: "var(--b-sand)" }}>
              12 December 2026 · Jaipur
            </span>
            <span
              className="mt-[6px] rounded-full px-[18px] py-2 text-[12px] font-semibold"
              style={{ background: "var(--b-sand)", color: "var(--b-primary)" }}
            >
              RSVP
            </span>
          </div>

          <div
            className="absolute bottom-0 right-[150px] flex flex-col gap-[6px] rounded-xl bg-white px-[18px] py-[14px]"
            style={{ boxShadow: "0 10px 28px rgba(43,27,18,.18)", animation: "wi-toast .6s ease both .4s" }}
          >
            <span className="text-[12px] font-semibold" style={{ color: "var(--b-ink)" }}>
              Live RSVP
            </span>
            <span className="text-[20px] font-bold" style={{ color: "var(--b-green)" }}>
              128 attending
            </span>
            <span className="text-[11px]" style={{ color: "var(--b-muted)" }}>
              14 maybe · 6 declined
            </span>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- Create by */}
      <section className="flex flex-col gap-[22px] px-6 pb-11 pt-2 sm:px-12">
        <h2
          className="m-0 text-[30px] font-semibold"
          style={{ fontFamily: "var(--f-display)", color: "var(--b-ink)" }}
        >
          Create by
        </h2>

        <ChipRow
          label="Category"
          options={CATEGORY}
          isOn={(o) => slug(o) === category}
          onPick={(o) => setCategory(slug(o))}
        />
        <ChipRow
          label="Religion"
          options={RELIGION}
          isOn={(o) => slug(o) === religion}
          onPick={(o) => toggle(religion, slug(o), setReligion)}
        />
        <ChipRow
          label="Country"
          options={[...COUNTRY, "+ 40 more"]}
          isOn={(o) => slug(o) === country}
          onPick={(o) => (o === "+ 40 more" ? undefined : toggle(country, slug(o), setCountry))}
        />
      </section>

      {/* ------------------------------------------------------ Gallery */}
      <section className="flex flex-col gap-[18px] px-6 pb-13 sm:px-12" style={{ paddingBottom: 52 }}>
        <div className="flex items-baseline justify-between gap-4">
          <h2
            className="m-0 text-[24px] font-semibold sm:text-[30px]"
            style={{ fontFamily: "var(--f-display)", color: "var(--b-ink)" }}
          >
            {heading}
          </h2>
          <Link
            href={galleryHref}
            className="shrink-0 text-[14px] font-semibold"
            style={{ color: "var(--b-primary)" }}
          >
            See all {all?.length ?? 0} →
          </Link>
        </div>

        {all === null ? (
          <p className="text-[14px]" style={{ color: "var(--b-muted)" }}>Loading designs…</p>
        ) : shown.length === 0 ? (
          <p className="text-[14px]" style={{ color: "var(--b-muted)" }}>
            No designs match those filters yet — try clearing one.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {shown.map((c) => (
              <GalleryCard key={c.id} card={c} />
            ))}
          </div>
        )}
      </section>

      {/* ----------------------------------------------- Explore banner */}
      <section
        className="mx-6 mb-14 grid items-center gap-6 rounded-[18px] px-7 py-10 sm:mx-12 sm:px-12 lg:grid-cols-[1fr_300px]"
        style={{ background: "var(--b-ink)" }}
      >
        <div className="flex flex-col gap-3">
          <span
            className="text-[11px] font-semibold"
            style={{ letterSpacing: "0.16em", color: "var(--b-gold)" }}
          >
            EXPLORE MODE
          </span>
          <h2
            className="m-0 text-[28px] font-semibold leading-[1.15] sm:text-[34px]"
            style={{ fontFamily: "var(--f-display)", color: "var(--b-tint)", textWrap: "pretty" }}
          >
            Scroll designs like a feed. Swipe until one feels right.
          </h2>
          <p className="m-0 max-w-[46ch] text-[15px] leading-[1.55]" style={{ color: "var(--b-border-soft)" }}>
            Full-screen live previews of every design — like, save, or tap Use template the
            moment you fall for one.
          </p>
          <Link
            href="/explore"
            className="mt-[6px] self-start rounded-full px-[26px] py-[13px] text-[15px] font-semibold"
            style={{ background: "var(--b-sand)", color: "var(--b-ink)" }}
          >
            Open explore
          </Link>
        </div>
        <div
          className="hidden h-[220px] items-center justify-center rounded-[14px] lg:flex"
          style={{
            background: "repeating-linear-gradient(45deg,#3d2a1a 0 10px,#332214 10px 20px)",
            color: "var(--b-muted)",
          }}
        >
          <span className="text-[11px]">phone preview</span>
        </div>
      </section>
      </div>
    </div>
  );
}

function ChipRow({
  label,
  options,
  isOn,
  onPick,
}: {
  label: string;
  options: string[];
  isOn: (o: string) => boolean;
  onPick: (o: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
      <span
        className="shrink-0 pt-2 text-[11px] font-semibold uppercase sm:w-[72px]"
        style={{ letterSpacing: "0.12em", color: "var(--b-muted)" }}
      >
        {label}
      </span>
      <div className="flex flex-wrap gap-[10px]">
        {options.map((o) => {
          const on = isOn(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onPick(o)}
              aria-pressed={on}
              className="rounded-full px-[18px] py-[9px] text-[13px] transition-colors"
              style={
                on
                  ? { background: "var(--b-primary)", color: "var(--b-bg)", fontWeight: 600 }
                  : {
                      background: "#fff",
                      color: "var(--b-body)",
                      fontWeight: 500,
                      border: "1px solid rgba(43,27,18,.12)",
                    }
              }
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Gallery tile: the design's own theme, with the overlay on hover / focus. */
function GalleryCard({ card }: { card: Card }) {
  const c = card.colors;
  return (
    <div className="flex flex-col gap-[10px]">
      <div
        className="group relative h-[260px] overflow-hidden rounded-xl sm:h-[340px]"
        style={{ background: c.primary, border: `1px solid ${c.accent}66` }}
      >
        <div className="flex h-full flex-col items-center justify-center gap-[10px] p-5 text-center">
          <span className="text-[9px]" style={{ letterSpacing: "0.24em", color: c.accent }}>
            {SAMPLE.eyebrow}
          </span>
          <span
            className="text-[22px] font-semibold leading-[1.15] sm:text-[27px]"
            style={{ fontFamily: card.fonts.display, color: "var(--b-surface)" }}
          >
            {SAMPLE.names}
          </span>
          <span className="h-px w-9" style={{ background: c.accent }} />
          <span className="text-[11px]" style={{ color: "var(--b-sand)" }}>
            {SAMPLE.line}
          </span>
        </div>

        {/* overlay — the key interaction from the handoff */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-[10px] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
          style={{ background: "rgba(23,12,8,.55)", backdropFilter: "blur(2px)" }}
        >
          <Link
            href={card.useHref}
            className="rounded-full px-6 py-[11px] text-[14px] font-semibold"
            style={{ background: "var(--b-sand)", color: "var(--b-ink)" }}
          >
            Use template
          </Link>
          <Link
            href={card.previewHref}
            className="rounded-full px-[22px] py-[10px] text-[13px] font-semibold"
            style={{ color: "var(--b-surface)", border: "1.5px solid rgba(251,243,228,.6)" }}
          >
            See end result ↗
          </Link>
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-[13px] font-semibold" style={{ color: "var(--b-ink)" }}>
          {card.name}
        </span>
        <span className="shrink-0 text-[12px]" style={{ color: "var(--b-muted)" }}>
          ♥ {card.likes >= 1000 ? `${(card.likes / 1000).toFixed(1)}k` : card.likes}
        </span>
      </div>
    </div>
  );
}
