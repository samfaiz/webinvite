"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * The pieces of "Heartline": the one hand-drawn line that loops into a heart,
 * the little heart dividers, the week calendar with the day in a heart, the
 * timeline winding down the page, the satin bows hung on a string in the
 * couple's colours, and the wavy edges of the dark reply band.
 *
 * The two still-life photographs, the venue sketches and the bow are
 * generated (see ART); until one is in, a drawn stand-in or nothing takes its
 * place.
 */

const A = (f: string) => `/assets/templates/heartline/${f}`;
export const artPath = A;

export type VenueKind = "house" | "church" | "hall";

/** Generated art; null until the file is in public/assets/templates/heartline. */
export const ART: {
  cover: string | null;
  closing: string | null;
  venues: Record<VenueKind, string | null>;
  bow: string | null;
} = {
  cover: null,
  closing: null,
  venues: { house: null, church: null, hall: null },
  bow: null,
};

export const PAPER = "#f3eee6";
export const INK = "#3b2f2a";
export const SOFT = "#6e625a";
export const HEART = "#7a2e22";
export const DARK = "#3a2b24";
export const ON_DARK = "#efe6da";
export const HAND = "var(--font-caveat)";
export const SCRIPT = "var(--font-greatvibes)";
export const SERIF = "var(--font-ebgaramond)";

/** Design pixels (drawn ~390 wide) → container units. */
export function v(px: number): string {
  return `${((px / 390) * 100).toFixed(3)}cqw`;
}

const noise = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`;

/** Ivory paper with the faintest grain. */
export const paper: CSSProperties = { backgroundColor: PAPER, backgroundImage: noise };

/** Which sketch suits the venue: the couple's choice, else a guess from its name. */
export function venueKind(choice: string | undefined, name: string | undefined): VenueKind {
  if (choice === "church") return "church";
  if (choice === "house" || choice === "tharavad") return "house";
  if (choice === "hall") return "hall";
  const n = name ?? "";
  if (/church|chapel|cathedral|basilica|forane|parish|\bst\.?\s/i.test(n)) return "church";
  if (/hall|centre|center|convention|auditorium|hotel|resort|banquet|club|palace|arena/i.test(n)) return "hall";
  return "house";
}

/* ------------------------------- lines ------------------------------- */

/** The page-wide hand-drawn line that loops into a heart in the middle. */
export function HeartLine({ color = INK, style }: { color?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 390 60" aria-hidden className="block w-full" style={{ height: v(60), ...style }}>
      <path
        d="M0 38 C 48 30, 96 46, 146 40 C 168 37, 184 42, 195 48 C 180 38, 166 24, 175 14 C 182 6, 193 9, 195 19 C 197 9, 208 6, 215 14 C 224 24, 210 38, 195 48 C 206 42, 222 37, 244 40 C 294 46, 342 30, 390 38"
        fill="none"
        stroke={color}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A small rule with a heart in the middle. */
export function Divider({ color = INK, width = 170 }: { color?: string; width?: number }) {
  return (
    <svg viewBox="0 0 170 12" aria-hidden style={{ width: v(width), height: v((width / 170) * 12) }}>
      <path d="M2 6 H76" stroke={color} strokeWidth={0.9} opacity={0.6} />
      <path d="M94 6 H168" stroke={color} strokeWidth={0.9} opacity={0.6} />
      <path d="M85 10 C 79 6, 79 2, 82 2 C 84 2, 85 4, 85 4 C 85 4, 86 2, 88 2 C 91 2, 91 6, 85 10 Z" fill={HEART} />
    </svg>
  );
}

/** A filled heart, for the wedding day on the calendar. */
export function HeartShape({ size, color = HEART, children }: { size: string; color?: string; children?: ReactNode }) {
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 40 36" aria-hidden className="absolute inset-0 h-full w-full">
        <path d="M20 35 C 8 26, 1 19, 1 11 C 1 5, 6 1, 11 1 C 15 1, 18 3, 20 7 C 22 3, 25 1, 29 1 C 34 1, 39 5, 39 11 C 39 19, 32 26, 20 35 Z" fill={color} />
      </svg>
      <span className="relative" style={{ marginTop: "-8%" }}>
        {children}
      </span>
    </span>
  );
}

/* ------------------------------ calendar ------------------------------ */

/** The week of the wedding, Monday to Sunday, with the day in a heart. Returns
 *  the heart's column (0–6) so the timeline can begin beneath it. */
export function weekOf(iso?: string): { month: string; days: { n: number; on: boolean }[]; col: number } | null {
  const d = new Date(iso ?? "");
  if (Number.isNaN(d.getTime())) return null;
  const col = (d.getDay() + 6) % 7; // Monday first
  const days = Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() - col + i);
    return { n: x.getDate(), on: i === col };
  });
  const month = d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  return { month, days, col };
}

/* ------------------------------ timeline ------------------------------ */

const ROW = 104;

/** The line's points: from beneath the calendar's heart, through a dot beside
 *  each stop (alternately left and right), to a small heart at the foot. */
export function timelineGeometry(n: number, startCol: number) {
  const startX = 20 + (startCol + 0.5) * (350 / 7);
  const dots = Array.from({ length: n }, (_, i) => ({ x: i % 2 ? 230 : 160, y: 56 + i * ROW }));
  const end = { x: 195, y: 56 + (n - 1) * ROW + 84 };
  const pts = [{ x: startX, y: 0 }, ...dots, end];
  // Catmull-Rom through the points, as cubic Béziers
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${p2.x} ${p2.y}`;
  }
  return { d, dots, end, height: end.y + 24, row: ROW };
}

/* -------------------------------- bows -------------------------------- */

/** A drawn bow, until the satin one is in. */
function BowStandIn({ hex }: { hex: string }) {
  return (
    <svg viewBox="0 0 60 56" className="block w-full" aria-hidden>
      <path d="M30 18 C 18 4, 2 6, 4 18 C 6 28, 22 26, 30 20 Z" fill={hex} stroke={INK} strokeWidth={0.8} />
      <path d="M30 18 C 42 4, 58 6, 56 18 C 54 28, 38 26, 30 20 Z" fill={hex} stroke={INK} strokeWidth={0.8} />
      <path d="M28 21 L18 52 L24 48 L30 52 L31 22 Z" fill={hex} stroke={INK} strokeWidth={0.8} />
      <path d="M32 21 L42 52 L36 48 L30 52 Z" fill={hex} stroke={INK} strokeWidth={0.8} />
      <circle cx="30" cy="19" r="4" fill={hex} stroke={INK} strokeWidth={0.8} />
    </svg>
  );
}

/** A satin bow coloured to the swatch: the bow's own shape and shading laid
 *  over the colour (multiply), so white satin becomes any colour. */
function Bow({ hex }: { hex: string }) {
  if (!ART.bow) return <BowStandIn hex={hex} />;
  const mask = `url("${ART.bow}")`;
  return (
    <div className="relative">
      <div aria-hidden className="absolute inset-0" style={{ background: hex, maskImage: mask, WebkitMaskImage: mask, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ART.bow} alt="" aria-hidden className="relative block w-full" style={{ mixBlendMode: "multiply" }} />
    </div>
  );
}

/** The couple's colours as bows hung along a gently sagging string. */
export function BowString({ colors }: { colors: { hex: string; label?: string }[] }) {
  const n = Math.min(colors.length, 6);
  const sag = (x: number) => 10 + 16 * Math.sin((Math.PI * x) / 390);
  const xs = Array.from({ length: n }, (_, i) => 40 + (i * 310) / Math.max(1, n - 1));
  return (
    <div className="relative w-full" style={{ height: v(96) }}>
      <svg viewBox="0 0 390 40" aria-hidden className="absolute inset-x-0 top-0 block w-full" style={{ height: v(40) }}>
        <path d="M0 8 Q 195 44, 390 8" fill="none" stroke={INK} strokeWidth={1} opacity={0.7} />
      </svg>
      {colors.slice(0, n).map((c, i) => (
        <div
          key={`${c.hex}-${i}`}
          title={c.label}
          className="absolute"
          // across the string's own width (it may sit inside a padded page)
          style={{ left: `${((xs[i] - 27) / 390) * 100}%`, top: v(sag(xs[i]) - 6), width: `${(54 / 390) * 100}%`, transform: `rotate(${i % 2 ? 4 : -4}deg)` }}
        >
          <Bow hex={c.hex} />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------- waves -------------------------------- */

/** The dark band's soft wavy edge: a strip of the paper itself (grain and
 *  all) cut to a wave, laid over its top or (flipped) its bottom. */
const waveMask = (() => {
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 390 40' preserveAspectRatio='none'><path d='M0 0 H390 V16 C 330 34, 262 4, 196 18 C 130 32, 62 6, 0 20 Z'/></svg>";
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
})();

export function Wave({ edge }: { edge: "top" | "bottom" }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0"
      style={
        {
          height: v(40),
          [edge]: -1,
          ...paper,
          maskImage: waveMask,
          WebkitMaskImage: waveMask,
          maskSize: "100% 100%",
          WebkitMaskSize: "100% 100%",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          transform: edge === "bottom" ? "scaleY(-1)" : undefined,
        } as CSSProperties
      }
    />
  );
}
