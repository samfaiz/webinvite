"use client";

import { useState } from "react";
import type { Theme } from "@/engine/types";

/** One invite page inside a feed card. Tapping the card cycles through them. */
type Page = "hero" | "schedule" | "venue" | "rsvp";
const PAGES: Page[] = ["hero", "schedule", "venue", "rsvp"];

export type ExploreDesign = {
  id: string;
  name: string;
  community: string;
  category?: string;
  country?: string;
  likes?: number;
  saves?: number;
  colors: Theme["colors"];
  fonts: Theme["fonts"];
  backgrounds?: Record<string, string | undefined>;
};

/** Sample couple shown on every card — matches the repo's demo content. */
const SAMPLE = {
  names: ["Aarav", "Meera"],
  eyebrow: "TOGETHER WITH THEIR FAMILIES",
  date: "Saturday, 12 December 2026",
  venue: "The City Palace · Jaipur",
  schedule: [
    { time: "4:00 PM", label: "Baraat" },
    { time: "6:30 PM", label: "Ceremony" },
    { time: "8:00 PM", label: "Dinner & Dancing" },
  ],
};

const fmtCount = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

/**
 * A single design in the explore feed: a full-bleed card rendering the real
 * theme (colours and fonts from the design itself, not a screenshot), with the
 * action rail overlaid and a tap target that flips through the invite's pages.
 */
export function ExploreCard({
  design,
  liked,
  saved,
  onReact,
  onShare,
}: {
  design: ExploreDesign;
  liked: boolean;
  saved: boolean;
  onReact: (kind: "like" | "save") => void;
  onShare: () => void;
}) {
  const [page, setPage] = useState(0);
  const c = design.colors;
  const bgImage = design.backgrounds?.hero ?? design.backgrounds?.all;

  // The card is always a dark, rich surface (as designed), so it is built from
  // the theme's `primary` rather than its gradient stops — those are tuned for
  // light page backgrounds and wash out here. Likewise the secondary copy is an
  // accent-derived ivory, not `muted`, which is a dark tone meant for light bg.
  // Turn-1 brand: the design fills the screen edge to edge as a rich gradient
  // built from the theme's own primary, with cream/gold type over it.
  const surface = `radial-gradient(120% 80% at 50% 0%,
      color-mix(in srgb, ${c.primary} 82%, white) 0%,
      ${c.primary} 55%,
      color-mix(in srgb, ${c.primary} 70%, black) 100%)`;
  const cream = "var(--b-surface)";
  const ink = "var(--b-sand)";

  const flip = () => setPage((p) => (p + 1) % PAGES.length);

  return (
    <div
      onClick={flip}
      className="relative flex flex-1 flex-col items-center justify-center overflow-hidden pl-7 pr-16 text-center"
      style={{
        // inset from the chrome so the card reads as a card, with a hairline in
        // the design's own accent so the rounded edge stays visible whatever
        // the theme's colours are
        margin: "6px 14px",
        borderRadius: 18,
        border: `1px solid ${c.accent}59`,
        background: surface,
        fontFamily: "var(--f-brand)",
      }}
    >
      {bgImage ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
      ) : null}

      <div className="relative flex flex-col items-center gap-4">
        {PAGES[page] === "hero" ? (
          <>
            <span
              className="text-[11px] font-normal"
              style={{ letterSpacing: "0.28em", color: "var(--b-gold-soft)" }}
            >
              {SAMPLE.eyebrow}
            </span>
            <span
              className="text-[52px] font-semibold leading-[1.1]"
              style={{ fontFamily: design.fonts.display, color: cream }}
            >
              {SAMPLE.names[0]}
              <br />&<br />
              {SAMPLE.names[1]}
            </span>
            <span className="h-px w-[52px]" style={{ background: "var(--b-gold-soft)" }} />
            <span className="text-[15px] leading-[1.6]" style={{ color: ink }}>
              {SAMPLE.date}
              <br />
              {SAMPLE.venue}
            </span>
          </>
        ) : null}

        {PAGES[page] === "schedule" ? (
          <>
            <span className="text-[11px]" style={{ letterSpacing: "0.28em", color: "var(--b-gold-soft)" }}>
              THE DAY
            </span>
            <div className="mt-2 flex flex-col gap-4">
              {SAMPLE.schedule.map((s) => (
                <div key={s.label} className="flex flex-col gap-1">
                  <span
                    className="text-[26px] leading-none"
                    style={{ fontFamily: design.fonts.display, color: cream }}
                  >
                    {s.label}
                  </span>
                  <span className="text-[13px]" style={{ color: ink }}>
                    {s.time}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {PAGES[page] === "venue" ? (
          <>
            <span className="text-[11px]" style={{ letterSpacing: "0.28em", color: "var(--b-gold-soft)" }}>
              WHERE
            </span>
            <span
              className="text-[34px] leading-[1.15]"
              style={{ fontFamily: design.fonts.display, color: cream }}
            >
              The City
              <br />
              Palace
            </span>
            <span className="h-px w-[52px]" style={{ background: "var(--b-gold-soft)" }} />
            <span className="text-[14px] leading-[1.6]" style={{ color: ink }}>
              Jaipur, Rajasthan
              <br />
              Parking on Jaleb Chowk
            </span>
          </>
        ) : null}

        {PAGES[page] === "rsvp" ? (
          <>
            <span className="text-[11px]" style={{ letterSpacing: "0.28em", color: "var(--b-gold-soft)" }}>
              RSVP
            </span>
            <span
              className="text-[30px] leading-[1.15]"
              style={{ fontFamily: design.fonts.display, color: cream }}
            >
              Will you be
              <br />
              joining us?
            </span>
            <span
              className="mt-1 rounded-full px-6 py-3 text-[13px] font-semibold"
              style={{ background: "var(--b-gold-soft)", color: "var(--b-ink)" }}
            >
              Yes, I&apos;ll be there
            </span>
            <span className="text-[12px]" style={{ color: ink }}>
              Kindly reply by 1 November
            </span>
          </>
        ) : null}

        <span
          className="mt-2 text-[11px] font-semibold"
          style={{ letterSpacing: "0.14em", color: "#c9967d" }}
        >
          TAP TO FLIP PAGES · {page + 1} / {PAGES.length}
        </span>
      </div>

      {/* action rail — stopPropagation so tapping a button doesn't also flip */}
      <div
        className="absolute bottom-4 right-[10px] flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <RailButton
          label={fmtCount(design.likes ?? 0)}
          active={liked}
          activeColor="#ff6b81"
          onClick={() => onReact("like")}
          ariaLabel={liked ? "Unlike this design" : "Like this design"}
        >
          ♥
        </RailButton>
        <RailButton
          label="Save"
          active={saved}
          activeColor="#f3d9a8"
          onClick={() => onReact("save")}
          ariaLabel={saved ? "Remove from saved" : "Save this design"}
        >
          ⌁
        </RailButton>
        <RailButton label="Share" onClick={onShare} ariaLabel="Share this design">
          ↗
        </RailButton>
      </div>
    </div>
  );
}

function RailButton({
  children,
  label,
  active = false,
  activeColor = "#fdf8f1",
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  activeColor?: string;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className="flex flex-col items-center gap-1 transition-transform active:scale-90"
    >
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full text-[20px]"
        style={{ background: "rgba(0,0,0,.35)", color: active ? activeColor : "#fdf8f1" }}
      >
        {children}
      </span>
      <span className="text-[11px] font-semibold text-[#fdf8f1]">{label}</span>
    </button>
  );
}
