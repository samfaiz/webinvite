"use client";

import { useId } from "react";
import type { CSSProperties } from "react";

/**
 * The pieces of "Emerald Rose" that aren't type: the torn, brushed edges
 * between sections, the rows and cascades of white and emerald roses, the
 * colour dots.
 *
 * The roses and the two photographs are generated art (see ART). Until a
 * piece is in, a drawn stand-in takes its place at the same size.
 */

const A = (f: string) => `/assets/templates/emerald/${f}`;

/** Generated art; null until the file is in public/assets/templates/emerald. */
export const ART: {
  band: string | null;
  cascade: string | null;
  dressBg: string | null;
  coverNoPhoto: string | null;
} = {
  band: null,
  cascade: null,
  dressBg: null,
  coverNoPhoto: null,
};
export const artPath = A;

export const DARK = "#0e1817";
export const STONE = "#cbc6ba";
export const INK = "#26241e"; // type on stone
export const SAGE = "#7d8a78"; // the times, the soft green-grey of the reference
export const MIST = "#d9d5cb"; // type on dark green
export const DISPLAY = "var(--font-bodoni)";
export const SANS = "var(--font-jost)";

/** Design pixels (the reference is drawn ~390 wide) → container units. */
export function v(px: number): string {
  return `${((px / 390) * 100).toFixed(3)}cqw`;
}

/* ------------------------------ torn edges ------------------------------ */

/** A small seeded generator, so each edge is ragged in its own way but the
 *  same on every visit (and on the server and in the browser). */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function raggedPath(seed: number, depth: number, step: number): string {
  const r = rng(seed);
  // a slow, uneven wave for the tear itself …
  const knots = Array.from({ length: 22 }, () => r());
  const wave = (x: number) => {
    const t = (x / 1000) * (knots.length - 1);
    const i = Math.min(Math.floor(t), knots.length - 2);
    const f = t - i;
    const e = f * f * (3 - 2 * f); // smooth between knots
    return knots[i] + (knots[i + 1] - knots[i]) * e;
  };
  let d = `M0 0 L0 ${(18 + wave(0) * depth * 0.6).toFixed(1)}`;
  for (let x = step; x <= 1000; x += step * (0.6 + r() * 0.8)) {
    // … frayed finely along its length, with the odd longer fibre
    const fray = (r() - 0.5) * depth * 0.18;
    const fibre = r() < 0.12 ? depth * (0.12 + r() * 0.22) : 0;
    const y = 18 + wave(x) * depth * 0.6 + fray + fibre;
    d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d} L1000 ${(18 + wave(1000) * depth * 0.6).toFixed(1)} L1000 0 Z`;
}

/**
 * A torn, dry-brushed edge laid over the top or bottom of a section in the
 * colour of its neighbour, so the two seem torn apart rather than ruled. Two
 * passes: a solid ragged edge, and a fainter, deeper one for the brush's
 * dragged fibres.
 */
export function Tear({ color, edge, seed, height = 34 }: { color: string; edge: "top" | "bottom"; seed: number; height?: number }) {
  const flip = edge === "bottom";
  return (
    <svg
      viewBox="0 0 1000 100"
      preserveAspectRatio="none"
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-[2] block w-full"
      style={{ height: v(height), [edge]: -1, transform: flip ? "scaleY(-1)" : undefined } as CSSProperties}
    >
      <path d={raggedPath(seed + 7, 70, 9)} fill={color} opacity={0.45} />
      <path d={raggedPath(seed, 46, 6)} fill={color} />
    </svg>
  );
}

/* -------------------------------- roses -------------------------------- */

/** A stand-in rose until the generated art is in: layered petals, white or
 *  emerald. */
function StandInRose({ size, white, style }: { size: string; white: boolean; style?: CSSProperties }) {
  const id = useId().replace(/:/g, "");
  const [a, b] = white ? ["#ffffff", "#d9d4c4"] : ["#2a7a5e", "#0b3326"];
  return (
    <svg viewBox="-50 -50 100 100" style={{ width: size, height: size, ...style }} aria-hidden>
      <defs>
        <radialGradient id={`r${id}`} cx="0" cy="0" r="50" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={b} />
          <stop offset="1" stopColor={a} />
        </radialGradient>
      </defs>
      {[46, 36, 26, 16, 8].map((rad, i) => (
        <circle key={rad} r={rad} fill={`url(#r${id})`} stroke={white ? "#cfc8b4" : "#082a1f"} strokeWidth={1.2} opacity={1 - i * 0.06} />
      ))}
    </svg>
  );
}

/** The row of roses between sections, laid across the join of two grounds. */
export function RoseBand({ top, bottom }: { top: CSSProperties; bottom: CSSProperties }) {
  const half: CSSProperties = { height: "calc(50% + 1px)" };
  const grounds = (
    <>
      <div aria-hidden className="absolute inset-x-0" style={{ ...half, top: -1, ...top }} />
      <div aria-hidden className="absolute inset-x-0" style={{ ...half, bottom: -1, ...bottom }} />
    </>
  );
  if (ART.band) {
    return (
      <div className="relative" style={{ margin: "-1px 0" }}>
        {grounds}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ART.band} alt="" aria-hidden className="relative block w-full" />
      </div>
    );
  }
  const row: [number, boolean, number][] = [
    [96, true, 4],
    [120, false, -6],
    [90, true, 8],
    [124, false, -2],
    [98, true, 6],
  ];
  return (
    <div className="relative overflow-hidden" style={{ height: v(124), margin: "-1px 0" }}>
      {grounds}
      <div className="absolute inset-y-0 flex items-center" style={{ left: "-8%", right: "-8%", justifyContent: "space-between" }}>
        {row.map(([s, w, y], i) => (
          <StandInRose key={i} size={v(s)} white={w} style={{ marginTop: v(y), marginLeft: i ? v(-22) : 0 }} />
        ))}
      </div>
    </div>
  );
}

/** A tall trailing cascade of roses at a section's edge, half off the page. */
export function RoseCascade({ side, top, height }: { side: "left" | "right"; top: string; height: string }) {
  const style: CSSProperties = {
    position: "absolute",
    top,
    [side]: 0,
    height,
    transform: `translateX(${side === "left" ? "-38%" : "38%"})`,
    pointerEvents: "none",
  };
  if (ART.cascade) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={ART.cascade} alt="" aria-hidden style={{ ...style, width: "auto", transform: `${style.transform} ${side === "right" ? "scaleX(-1)" : ""}` }} />
    );
  }
  return (
    <div aria-hidden className="flex flex-col items-center justify-around" style={{ ...style, width: v(90) }}>
      {[true, false, true, false, true].map((w, i) => (
        <StandInRose key={i} size={v(i % 2 ? 78 : 64)} white={w} />
      ))}
    </div>
  );
}

/* ----------------------------- colour dots ----------------------------- */

/** The palette as overlapping dots, each with a fine ring so a dark one still
 *  reads on the dark photograph. */
export function Dots({ colors }: { colors: { hex: string; label?: string }[] }) {
  return (
    <div className="flex justify-center">
      {colors.map((c, i) => (
        <span
          key={`${c.hex}-${i}`}
          title={c.label}
          className="block rounded-full"
          style={{
            width: v(58),
            height: v(58),
            marginLeft: i ? v(-10) : 0,
            background: c.hex,
            boxShadow: "0 0 0 1px rgba(217,213,203,0.45), 0 3px 10px rgba(0,0,0,0.35)",
            zIndex: colors.length - i,
          }}
        />
      ))}
    </div>
  );
}
