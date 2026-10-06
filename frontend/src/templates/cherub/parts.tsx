"use client";

import type { CSSProperties, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * The pieces of "Cherub Garden" that aren't type: the cream cartouche cards
 * with their scooped corners and double outline, the program card's engraved
 * corners, the cherubs and doves that drift beside the cards, and the soft
 * taupe buttons.
 *
 * The two garden paintings, the cherubs, the dove and the rose garland are
 * generated (see ART). Until a piece is in, a soft stand-in or nothing takes
 * its place.
 */

const A = (f: string) => `/assets/templates/cherub/${f}`;
export const artPath = A;

/** Generated art; null until the file is in public/assets/templates/cherub. */
export const ART: {
  garden: string | null;
  path: string | null;
  cupidRight: string | null;
  cupidLeft: string | null;
  cherubs: string | null;
  dove: string | null;
  garland: string | null;
} = {
  garden: null,
  path: null,
  cupidRight: null,
  cupidLeft: null,
  cherubs: null,
  dove: null,
  garland: null,
};

export const CARD = "#fdf8f3";
export const LINE = "#bfa18f"; // the cards' outline, a dusty taupe
export const INK = "#4f362b"; // warm brown type on cream
export const INK_SOFT = "#7a5e50";
export const BEIGE = "#c9ae9d"; // the love-story and reply pages
export const ON_BEIGE = "#fffaf5";
export const CAPS = "var(--font-cinzel)";
export const SERIF = "var(--font-cormorant)";
export const ITALIC = "var(--font-cormorant-italic), var(--font-cormorant)";
export const SCRIPT = "var(--font-greatvibes)";

/** Design pixels (drawn ~390 wide) → container units. */
export function v(px: number): string {
  return `${((px / 390) * 100).toFixed(3)}cqw`;
}

/* ------------------------------ the cards ------------------------------ */

/** The cartouche drawn once, 120 square, and sliced nine ways (border-image)
 *  so its scooped corners keep their shape at any height. */
const cartouche = (() => {
  const W = 120;
  const shape = (d: number, R: number) => {
    const a = d;
    const b = W - d;
    return `M${a + R} ${a} L${b - R} ${a} A${R} ${R} 0 0 0 ${b} ${a + R} L${b} ${b - R} A${R} ${R} 0 0 0 ${b - R} ${b} L${a + R} ${b} A${R} ${R} 0 0 0 ${a} ${b - R} L${a} ${a + R} A${R} ${R} 0 0 0 ${a + R} ${a} Z`;
  };
  // (a width and height, so the slice numbers below are in its own units)
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${W}' viewBox='0 0 ${W} ${W}'><path d='${shape(1, 20)}' fill='${CARD}' stroke='${LINE}' stroke-width='1.4'/><path d='${shape(7, 18)}' fill='none' stroke='${LINE}' stroke-width='0.9'/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
})();

/** A cream card with scooped corners and a fine double outline, as the
 *  reference frames its invitation and its reply. */
export function Cartouche({ children, style, className = "" }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <div
      className={`relative ${className}`}
      style={{
        borderStyle: "solid",
        borderColor: "transparent",
        borderWidth: v(30),
        borderImage: `${cartouche} 36 fill / ${v(30)} stretch`,
        filter: "drop-shadow(0 8px 18px rgba(92,60,40,0.22))",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** One engraved corner flourish, drawn for the top-left and turned. */
function Corner({ turn, style }: { turn: number; style: CSSProperties }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className="pointer-events-none absolute" style={{ width: v(30), height: v(30), transform: `rotate(${turn}deg)`, ...style }}>
      <path d="M3 37 L3 3 L37 3" fill="none" stroke={LINE} strokeWidth={1.1} />
      <path d="M3 16 C10 16 16 10 16 3" fill="none" stroke={LINE} strokeWidth={0.9} />
      <path d="M9 9 C6 5 2 7 4 11 C6 13 9 12 9 9" fill="none" stroke={LINE} strokeWidth={0.8} />
      <circle cx="10" cy="10" r="1.4" fill={LINE} />
    </svg>
  );
}

/** The program's plain cream card with a fine line and engraved corners. */
export function ProgramCard({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const o = v(8);
  return (
    <div className="relative" style={{ background: CARD, padding: `${v(30)} ${v(26)}`, boxShadow: "0 10px 26px rgba(92,60,40,0.2)", ...style }}>
      <div aria-hidden className="pointer-events-none absolute" style={{ inset: v(8), border: `1px solid ${LINE}`, opacity: 0.6 }} />
      <Corner turn={0} style={{ left: o, top: o }} />
      <Corner turn={90} style={{ right: o, top: o }} />
      <Corner turn={180} style={{ right: o, bottom: o }} />
      <Corner turn={270} style={{ left: o, bottom: o }} />
      {children}
    </div>
  );
}

/* --------------------------- drifting figures --------------------------- */

/** A cherub or a dove beside a card, drifting gently up and down. */
export function Floaty({ src, width, flip = false, delay = 0, style }: { src: string | null; width: number; flip?: boolean; delay?: number; style: CSSProperties }) {
  const reduce = useReducedMotion();
  if (!src) return null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute z-[3]"
      style={{ width: v(width), ...style }}
      animate={reduce ? undefined : { y: [0, -8, 0], rotate: [0, flip ? 2 : -2, 0] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="block w-full" style={{ transform: flip ? "scaleX(-1)" : undefined }} />
    </motion.div>
  );
}

/* ------------------------------- buttons ------------------------------- */

/** The reference's soft taupe pill, large enough for any thumb. */
export const pill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  minHeight: 54,
  padding: `0 ${v(26)}`,
  borderRadius: 999,
  background: "linear-gradient(180deg, #e6d3c6, #d2b7a6)",
  color: INK,
  fontFamily: ITALIC,
  fontStyle: "italic",
  fontWeight: 600,
  fontSize: "max(19px, 4.9cqw)",
  boxShadow: "0 5px 12px rgba(92,60,40,0.28), inset 0 1px 0 rgba(255,255,255,0.6)",
};
