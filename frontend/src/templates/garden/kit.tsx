"use client";

import type { CSSProperties, ReactNode } from "react";
import { u } from "./stage";

/**
 * The Garden element kit.
 *
 * The plates are copperplate engravings, so everything written on them is
 * drawn in the same hand: hairline flourishes rather than plain rules, a
 * date set in a cartouche, buttons with an inner engraved line, colour chips
 * in engraved oval frames. All of it is vector in `currentColor`, so one
 * element serves the cream panels (olive ink) and the olive pages (cream ink).
 */

export const SCRIPT = "var(--font-greatvibes)";
export const SERIF = "var(--font-cormorant)";

/* ------------------------------ flourishes ------------------------------ */

/**
 * The scrolled divider the reference puts under every heading: two engraved
 * S-scrolls curling out from a central diamond, each with a leaf and a
 * fine echo line, mirrored.
 */
export function Flourish({
  width = 300,
  color = "currentColor",
  className = "",
}: {
  width?: number;
  color?: string;
  className?: string;
}) {
  const half = (
    <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
      {/* the main scroll, ending in a small spiral */}
      <path d="M110 12 C 96 12, 85 6, 72 9.5 C 62 12.5, 58 20, 49 18 C 41 16, 43 7.5, 50.5 7.5 C 55.5 7.5, 56.5 12.5, 52.5 13.5" strokeWidth="1.15" />
      {/* the finer echo under it */}
      <path d="M110 12.6 C 99 14.5, 90 18.5, 79 16.5 C 74 15.6, 70 16.4, 67 18" strokeWidth="0.6" />
      {/* a leaf on the scroll */}
      <path d="M86 9 C 89.5 4.6, 95.5 4.4, 98.5 7.4 C 94.5 9.8, 90 10.2, 86 9 Z" strokeWidth="0.7" fill={color} fillOpacity="0.18" />
      <path d="M86.5 9 C 90 8, 94 7.6, 98 7.4" strokeWidth="0.45" />
      {/* the trailing hairline, tapering out */}
      <path d="M49 18 C 36 21.5, 22 18, 6 12" strokeWidth="0.55" />
      <circle cx="4.5" cy="11.4" r="1.1" fill={color} stroke="none" />
    </g>
  );
  return (
    <svg
      viewBox="0 0 240 24"
      className={`mx-auto block ${className}`}
      style={{ width: u(width), height: "auto", color }}
      aria-hidden
    >
      {half}
      <g transform="translate(240 0) scale(-1 1)">{half}</g>
      {/* the centre: a diamond with a pip */}
      <path d="M120 5.5 L 126.5 12 L 120 18.5 L 113.5 12 Z" fill="none" stroke={color} strokeWidth="0.9" />
      <path d="M120 9 L 123 12 L 120 15 L 117 12 Z" fill={color} fillOpacity="0.55" stroke="none" />
    </svg>
  );
}

/** The small break between timeline entries: a lozenge on a tapering line. */
export function Pip({ color = "currentColor", width = 120 }: { color?: string; width?: number }) {
  return (
    <svg viewBox="0 0 120 10" style={{ width: u(width), height: "auto" }} className="mx-auto block" aria-hidden>
      <defs>
        <linearGradient id="g-pip" x1="0" x2="1">
          <stop offset="0" stopColor={color} stopOpacity="0" />
          <stop offset=".5" stopColor={color} stopOpacity=".7" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="4.6" width="120" height="0.8" fill="url(#g-pip)" />
      <path d="M60 1 L 64 5 L 60 9 L 56 5 Z" fill="var(--g-cream)" stroke={color} strokeWidth="0.8" />
    </svg>
  );
}

/* -------------------------------- type -------------------------------- */

export function Script({
  children,
  size,
  color = "var(--g-ink)",
  className = "",
  edit,
}: {
  children: ReactNode;
  size: number;
  color?: string;
  className?: string;
  edit?: string;
}) {
  return (
    <p data-edit={edit} className={className} style={{ fontFamily: SCRIPT, fontSize: u(size), lineHeight: 1.12, color }}>
      {children}
    </p>
  );
}

export function Caps({
  children,
  size,
  color = "var(--g-ink)",
  track = 0.2,
  className = "",
  edit,
}: {
  children: ReactNode;
  size: number;
  color?: string;
  track?: number;
  className?: string;
  edit?: string;
}) {
  return (
    <p
      data-edit={edit}
      className={`uppercase ${className}`}
      style={{ fontFamily: SERIF, fontSize: u(size), letterSpacing: `${track}em`, lineHeight: 1.45, color, fontWeight: 500 }}
    >
      {children}
    </p>
  );
}

export function Body({
  children,
  size = 36,
  color = "var(--g-soft)",
  italic = false,
  className = "",
  edit,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  italic?: boolean;
  className?: string;
  edit?: string;
}) {
  return (
    <p
      data-edit={edit}
      className={className}
      style={{ fontFamily: SERIF, fontSize: u(size), lineHeight: 1.5, color, fontStyle: italic ? "italic" : undefined }}
    >
      {children}
    </p>
  );
}

/** A section title: script, with the engraved scroll beneath it. */
export function Heading({
  children,
  size = 84,
  color = "var(--g-ink)",
  flourish = 290,
  edit,
  className = "",
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  flourish?: number | false;
  edit?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <Script size={size} color={color} edit={edit}>
        {children}
      </Script>
      {flourish ? <Flourish width={flourish} color={color} className="mt-[1.5%] opacity-80" /> : null}
    </div>
  );
}

/* ------------------------------- the date ------------------------------- */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * `09 | JANUARY | 2027`, set as an engraved cartouche: the month in tracked
 * caps between two numerals, divided by hairlines, with a line above and below
 * that fades out at both ends.
 */
export function DateCartouche({
  iso,
  fallback,
  color = "var(--g-ink)",
  size = 34,
}: {
  iso?: string;
  fallback?: string;
  color?: string;
  size?: number;
}) {
  const d = new Date(iso ?? "");
  if (Number.isNaN(d.getTime())) {
    return fallback ? <Caps size={size * 0.85} color={color}>{fallback}</Caps> : null;
  }
  const rule: CSSProperties = {
    height: 1,
    background: `linear-gradient(90deg, transparent, ${color} 30%, ${color} 70%, transparent)`,
    opacity: 0.5,
  };
  const bar = <span aria-hidden className="self-stretch" style={{ width: 1, background: color, opacity: 0.45 }} />;
  return (
    <div className="inline-flex flex-col" style={{ color }}>
      <span aria-hidden style={rule} />
      <span className="flex items-center justify-center" style={{ gap: u(size * 0.7), padding: `${u(size * 0.32)} ${u(size * 0.5)}` }}>
        <span style={{ fontFamily: SERIF, fontSize: u(size * 1.15), lineHeight: 1 }}>{String(d.getDate()).padStart(2, "0")}</span>
        {bar}
        <span className="uppercase" style={{ fontFamily: SERIF, fontSize: u(size * 0.82), letterSpacing: "0.32em", lineHeight: 1, fontWeight: 500 }}>
          {MONTHS[d.getMonth()]}
        </span>
        {bar}
        <span style={{ fontFamily: SERIF, fontSize: u(size * 1.15), lineHeight: 1 }}>{d.getFullYear()}</span>
      </span>
      <span aria-hidden style={rule} />
    </div>
  );
}

/* ------------------------------- buttons ------------------------------- */

/**
 * The reference's pill button, with the engraved inner line that makes it
 * read as stationery rather than an app control.
 */
export function Pill({
  children,
  onClick,
  href,
  tone = "olive",
  size = 26,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  tone?: "olive" | "cream";
  size?: number;
}) {
  const style = pillStyle(tone, size);
  if (href) {
    return (
      <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" style={style}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} style={style}>
      {children}
    </button>
  );
}

/** The pill's look on its own, for links that bring their own element. */
export function pillStyle(tone: "olive" | "cream" = "olive", size = 26): CSSProperties {
  const olive = tone === "olive";
  const fill = olive ? "var(--g-ink)" : "var(--g-cream)";
  const ink = olive ? "var(--g-cream)" : "var(--g-ink)";
  return {
    display: "inline-block",
    fontFamily: SERIF,
    fontSize: u(size),
    fontWeight: 600,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    padding: `${u(size * 0.75)} ${u(size * 2)}`,
    borderRadius: 999,
    background: fill,
    color: ink,
    // the engraved inner line: a hairline of the ink colour, inset
    boxShadow: `inset 0 0 0 ${u(4)} ${fill}, inset 0 0 0 ${u(5.5)} color-mix(in srgb, ${ink} 55%, transparent), 0 ${u(6)} ${u(18)} rgba(30,32,18,0.18)`,
  };
}

/* --------------------------- dress-code chips --------------------------- */

/** A colour in an engraved oval frame — a double ring, the label in caps. */
export function OvalSwatch({ hex, label, ink = "var(--g-paper)" }: { hex: string; label?: string; ink?: string }) {
  return (
    <div className="flex flex-col items-center" style={{ width: u(108) }}>
      <span
        className="block w-full"
        style={{
          aspectRatio: "3 / 4",
          borderRadius: "50%",
          background: hex,
          border: `${u(1.5)} solid color-mix(in srgb, ${ink} 70%, transparent)`,
          outline: `${u(1)} solid color-mix(in srgb, ${ink} 35%, transparent)`,
          outlineOffset: u(5),
        }}
      />
      {label ? (
        <span
          className="uppercase"
          style={{ fontFamily: SERIF, fontSize: u(21), letterSpacing: "0.16em", color: ink, marginTop: u(14), textAlign: "center", lineHeight: 1.25 }}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}

/* ------------------------------- timeline ------------------------------- */

/** One stop of the day: its engraving, the hour between fading rules, the
 *  name in tracked caps, a line of description in italic. */
export function TimelineStop({
  icon,
  time,
  name,
  note,
  iconSize,
  compact = false,
}: {
  icon: string;
  time: string;
  name: string;
  note?: string;
  iconSize: number;
  compact?: boolean;
}) {
  const rule: CSSProperties = {
    width: u(54),
    height: 1,
    background: "linear-gradient(90deg, transparent, var(--g-ink))",
    opacity: 0.45,
  };
  return (
    <div className="flex flex-col items-center text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={icon} alt="" style={{ height: u(iconSize) }} />
      <div className="flex items-center" style={{ gap: u(14), marginTop: u(compact ? 8 : 12) }}>
        <span aria-hidden style={rule} />
        <span style={{ fontFamily: SERIF, fontSize: u(compact ? 36 : 46), lineHeight: 1, color: "var(--g-ink)", fontWeight: 500 }}>{time}</span>
        <span aria-hidden style={{ ...rule, transform: "scaleX(-1)" }} />
      </div>
      <Caps size={compact ? 25 : 30} track={0.22} className="mt-[1%]">
        {name}
      </Caps>
      {note && !compact ? (
        <Body size={30} italic className="leading-tight">
          {note}
        </Body>
      ) : null}
    </div>
  );
}

/* ------------------------------ the seal ------------------------------- */

/** Initials pressed into the wax: lighter than the wax, with a shadow along
 *  the top edge so they read as debossed, not printed. */
export function SealMonogram({ initials }: { initials: string }) {
  return (
    <span
      className="flex h-full w-full items-center justify-center"
      style={{
        fontFamily: "var(--font-cinzel)",
        fontSize: u(28),
        letterSpacing: "0.04em",
        color: "rgba(240, 233, 214, 0.78)",
        textShadow: "0 -1px 0 rgba(30,24,14,0.55), 0 1px 0 rgba(255,250,235,0.25)",
      }}
    >
      {initials}
    </span>
  );
}
