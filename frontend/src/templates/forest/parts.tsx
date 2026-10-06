"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * The pieces of "Forest Letter": the full month calendar with the day in a
 * heart over a faint year, the dress-code colours as circles of satin, and
 * the live map of the venue. The torn edges between its white and forest
 * pages are Emerald Rose's (Tear), the timeline's drawings Velvet Lily's.
 *
 * The two still-life photographs and the satin are generated (see ART); until
 * one is in, a soft stand-in takes its place.
 */

const A = (f: string) => `/assets/templates/forest/${f}`;
export const artPath = A;

/** Generated art; null until the file is in public/assets/templates/forest. */
export const ART: { cover: string | null; closing: string | null; satin: string | null } = {
  cover: null,
  closing: null,
  satin: null,
};

export const GREEN = "#2f3d2c";
export const WHITE = "#fbfaf7";
export const INK = "#2b2b28";
export const SOFT = "#6b6b66";
export const ON_GREEN = "#f2f1ea";
export const ON_GREEN_SOFT = "rgba(242,241,234,0.78)";
export const SCRIPT = "var(--font-greatvibes)";
export const SERIF = "var(--font-ebgaramond)";

/** Design pixels (drawn ~390 wide) → container units. */
export function v(px: number): string {
  return `${((px / 390) * 100).toFixed(3)}cqw`;
}

/* ------------------------------ calendar ------------------------------ */

const HEART = "M20 35 C 8 26, 1 19, 1 11 C 1 5, 6 1, 11 1 C 15 1, 18 3, 20 7 C 22 3, 25 1, 29 1 C 34 1, 39 5, 39 11 C 39 19, 32 26, 20 35 Z";

/** The whole month of the wedding, Monday first, the day in a white heart,
 *  the year faint and large behind the month's name. */
export function MonthCalendar({ iso }: { iso?: string }) {
  const d = new Date(iso ?? "");
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = d.getMonth();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const count = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array.from({ length: lead }, () => null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const month = d.toLocaleDateString("en-GB", { month: "long" });
  return (
    <div className="relative w-full">
      <div className="relative flex items-center justify-center" style={{ height: v(110) }}>
        <span aria-hidden className="absolute select-none" style={{ fontFamily: SERIF, fontSize: v(112), lineHeight: 1, letterSpacing: "0.04em", color: ON_GREEN, opacity: 0.1 }}>
          {y}
        </span>
        <span className="relative" style={{ fontFamily: SCRIPT, fontSize: v(52), lineHeight: 1, color: ON_GREEN }}>
          {month}
        </span>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(7, 1fr)", rowGap: v(8), marginTop: v(4) }}>
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((w) => (
          <span key={w} className="text-center" style={{ fontFamily: SCRIPT, fontSize: v(20), color: ON_GREEN_SOFT }}>
            {w}
          </span>
        ))}
        {cells.map((n, i) => (
          <span key={i} className="flex items-center justify-center" style={{ height: v(38) }}>
            {n === d.getDate() ? (
              <span className="relative flex items-center justify-center" style={{ width: v(40), height: v(38) }}>
                <svg viewBox="0 0 40 36" aria-hidden className="absolute inset-0 h-full w-full">
                  <path d={HEART} fill={ON_GREEN} />
                </svg>
                <span className="relative" style={{ fontFamily: SERIF, fontWeight: 600, fontSize: v(18), color: GREEN, marginTop: "-10%" }}>
                  {n}
                </span>
              </span>
            ) : n ? (
              <span style={{ fontFamily: SERIF, fontSize: v(19), color: ON_GREEN }}>{n}</span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ swatches ------------------------------ */

/** A circle of satin in the swatch's colour: the white satin multiplied by
 *  the colour, so its folds and sheen stay. */
export function SatinSwatch({ hex, label, size = 82 }: { hex: string; label?: string; size?: number }) {
  return (
    <span className="flex flex-col items-center" style={{ gap: v(6) }}>
      <span
        title={label}
        className="block rounded-full"
        style={{
          width: v(size),
          height: v(size),
          backgroundColor: hex,
          backgroundImage: ART.satin ? `url("${ART.satin}")` : "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.55), transparent 55%)",
          backgroundSize: "cover",
          backgroundBlendMode: ART.satin ? "multiply" : "normal",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.15)",
        }}
      />
    </span>
  );
}

/* -------------------------------- map -------------------------------- */

/** The venue on a live map. It can't be dragged (a finger on it should still
 *  scroll the page); a tap opens directions instead, through `children`. */
export function VenueMap({ query, children }: { query: string; children?: ReactNode }) {
  const style: CSSProperties = { width: "100%", height: v(230), border: 0, filter: "grayscale(0.35) contrast(0.95)", pointerEvents: "none" };
  return (
    <div className="relative w-full overflow-hidden" style={{ borderRadius: v(4) }}>
      <iframe title="Map of the venue" src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`} loading="lazy" style={style} />
      {children ? <div className="absolute inset-0">{children}</div> : null}
    </div>
  );
}
