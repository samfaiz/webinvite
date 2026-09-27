"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * Toile ornaments — drawn, not imported.
 *
 * This design's whole character is engraved botanical line work, so it has to
 * be vector: an image would blur on a retina phone, couldn't take the couple's
 * accent colour, and would cost a download per screen. Everything here is a
 * path tinted with `currentColor`, so a sprig in the header and the same sprig
 * on a blue panel need no separate asset.
 */

/** One engraved spray — the motif the border and the dividers are built from. */
function Sprig({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 120 60" className={className} style={style} fill="none" aria-hidden>
      {/* stem */}
      <path d="M4 56 C 34 52, 62 40, 92 10" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      {/* leaves alternating off the stem */}
      {[
        "M22 52 C 20 44, 26 38, 34 40 C 32 48, 28 52, 22 52 Z",
        "M38 46 C 40 38, 48 36, 53 41 C 48 47, 44 48, 38 46 Z",
        "M52 40 C 50 32, 56 26, 64 28 C 62 36, 58 40, 52 40 Z",
        "M66 32 C 68 24, 76 22, 81 27 C 76 33, 72 34, 66 32 Z",
      ].map((d, i) => (
        <path key={i} d={d} stroke="currentColor" strokeWidth="0.9" fill="currentColor" fillOpacity="0.12" />
      ))}
      {/* berries */}
      {[
        [92, 10],
        [86, 18],
        [97, 17],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="3.2" stroke="currentColor" strokeWidth="0.9" fill="currentColor" fillOpacity="0.16" />
      ))}
      {/* a small five-petal flower at the tip */}
      <g transform="translate(104 8)">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse
            key={a}
            cx="0"
            cy="-5"
            rx="2.6"
            ry="4.6"
            transform={`rotate(${a})`}
            stroke="currentColor"
            strokeWidth="0.8"
            fill="currentColor"
            fillOpacity="0.14"
          />
        ))}
        <circle r="1.6" fill="currentColor" fillOpacity="0.5" />
      </g>
    </svg>
  );
}

/**
 * The engraved border that frames the cover: a hairline rule with a spray in
 * each corner, mirrored so the four read as one continuous garland.
 */
export function BotanicalFrame({ inset = 14 }: { inset?: number }) {
  const corner = "absolute w-[42%] max-w-[190px]";
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ color: "var(--t-line)" }}
    >
      <div
        className="absolute rounded-[2px]"
        style={{
          inset,
          border: "1px solid color-mix(in srgb, var(--t-line) 45%, transparent)",
          outline: "1px solid color-mix(in srgb, var(--t-line) 20%, transparent)",
          outlineOffset: 5,
        }}
      />
      <Sprig className={`${corner} left-0 top-0`} style={{ transform: "scaleY(-1)" }} />
      <Sprig className={`${corner} right-0 top-0`} style={{ transform: "scale(-1,-1)" }} />
      <Sprig className={`${corner} bottom-0 left-0`} />
      <Sprig className={`${corner} bottom-0 right-0`} style={{ transform: "scaleX(-1)" }} />
    </div>
  );
}

/** A centred spray used to close a section, the way an engraving signs off. */
export function SprigDivider({ className = "", width = 150 }: { className?: string; width?: number }) {
  return (
    <div
      aria-hidden
      className={`mx-auto flex items-center justify-center ${className}`}
      style={{ width, color: "var(--t-line)" }}
    >
      <Sprig className="w-1/2" style={{ transform: "scaleX(-1)" }} />
      <Sprig className="w-1/2" />
    </div>
  );
}

/**
 * The satin bow. Three paths — two loops and the knot — with the tails drawn
 * separately so they can hang past the card edge.
 */
export function Bow({ size = 120, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 120 96"
      width={size}
      height={(size * 96) / 120}
      className={className}
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="toile-satin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--t-ribbon-hi)" />
          <stop offset="55%" stopColor="var(--t-ribbon)" />
          <stop offset="100%" stopColor="var(--t-ribbon-lo)" />
        </linearGradient>
      </defs>
      {/* tails */}
      <path d="M58 40 C 48 58, 40 72, 26 92 C 36 88, 46 76, 60 50 Z" fill="url(#toile-satin)" />
      <path d="M62 40 C 72 58, 80 72, 94 92 C 84 88, 74 76, 60 50 Z" fill="url(#toile-satin)" />
      {/* loops */}
      <path d="M58 34 C 40 12, 10 16, 12 34 C 14 50, 44 46, 58 38 Z" fill="url(#toile-satin)" />
      <path d="M62 34 C 80 12, 110 16, 108 34 C 106 50, 76 46, 62 38 Z" fill="url(#toile-satin)" />
      {/* knot */}
      <ellipse cx="60" cy="37" rx="8" ry="7" fill="var(--t-ribbon)" />
      <path d="M53 34 C 57 38, 63 38, 67 34" stroke="var(--t-ribbon-lo)" strokeWidth="1.2" />
    </svg>
  );
}

/**
 * The tall arched panel this design keeps returning to — a half-round top on a
 * straight body, filled with the powder blue. Used for the letter, the
 * location and the palette.
 */
export function ArchPanel({
  children,
  className = "",
  tone = "blue",
}: {
  children: ReactNode;
  className?: string;
  tone?: "blue" | "paper";
}) {
  return (
    <div
      className={`relative mx-auto w-full max-w-sm px-7 pb-9 pt-10 text-center ${className}`}
      style={{
        // the arch: a generous radius on the top corners only
        borderRadius: "999px 999px 20px 20px",
        background: tone === "blue" ? "var(--t-panel)" : "var(--t-paper)",
        border: "1px solid color-mix(in srgb, var(--t-line) 35%, transparent)",
      }}
    >
      {children}
    </div>
  );
}
