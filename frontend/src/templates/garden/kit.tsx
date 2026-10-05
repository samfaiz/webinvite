"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePreview } from "@/components/PreviewContext";
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
  const { compact, editing } = usePreview();
  const still = compact || editing;
  // the scrolls are drawn on as if by pen when they come into view
  const draw = (delay: number, duration = 1.5) =>
    still
      ? {}
      : {
          initial: { pathLength: 0, opacity: 0 },
          whileInView: { pathLength: 1, opacity: 1 },
          viewport: { once: true, amount: 0.8 },
          transition: { duration, ease: "easeInOut" as const, delay },
        };
  const pop = (delay: number) =>
    still
      ? {}
      : {
          initial: { opacity: 0, scale: 0.4 },
          whileInView: { opacity: 1, scale: 1 },
          viewport: { once: true, amount: 0.8 },
          transition: { duration: 0.5, delay },
        };
  const half = (
    <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
      {/* the main scroll, ending in a small spiral */}
      <motion.path
        d="M110 12 C 96 12, 85 6, 72 9.5 C 62 12.5, 58 20, 49 18 C 41 16, 43 7.5, 50.5 7.5 C 55.5 7.5, 56.5 12.5, 52.5 13.5"
        strokeWidth="1.15"
        {...draw(0.2)}
      />
      {/* the finer echo under it */}
      <motion.path d="M110 12.6 C 99 14.5, 90 18.5, 79 16.5 C 74 15.6, 70 16.4, 67 18" strokeWidth="0.6" {...draw(0.4, 1.1)} />
      {/* a leaf on the scroll */}
      <motion.path
        d="M86 9 C 89.5 4.6, 95.5 4.4, 98.5 7.4 C 94.5 9.8, 90 10.2, 86 9 Z"
        strokeWidth="0.7"
        fill={color}
        fillOpacity="0.18"
        {...draw(0.7, 0.8)}
      />
      <motion.path d="M86.5 9 C 90 8, 94 7.6, 98 7.4" strokeWidth="0.45" {...draw(0.9, 0.6)} />
      {/* the trailing hairline, tapering out */}
      <motion.path d="M49 18 C 36 21.5, 22 18, 6 12" strokeWidth="0.55" {...draw(1.1, 0.9)} />
      <motion.circle cx="4.5" cy="11.4" r="1.1" fill={color} stroke="none" {...pop(1.8)} />
    </g>
  );
  return (
    <svg
      viewBox="0 0 240 24"
      className={`mx-auto block ${className}`}
      style={{ width: u(width), height: "auto", color, overflow: "visible" }}
      aria-hidden
    >
      {half}
      <g transform="translate(240 0) scale(-1 1)">{half}</g>
      {/* the centre: a diamond with a pip */}
      <motion.path d="M120 5.5 L 126.5 12 L 120 18.5 L 113.5 12 Z" fill="none" stroke={color} strokeWidth="0.9" {...pop(0)} />
      <motion.path d="M120 9 L 123 12 L 120 15 L 117 12 Z" fill={color} fillOpacity="0.55" stroke="none" {...pop(0.15)} />
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


/* ------------------------------- motion ------------------------------- */

/**
 * Content rises into place as its page scrolls into view, once. The Studio
 * and thumbnails get it in place with no motion.
 */
export function Rise({
  children,
  delay = 0,
  className = "",
  style,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const { compact, editing } = usePreview();
  const still = compact || editing;
  return (
    <motion.div
      className={className}
      style={style}
      initial={still ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.9, ease: [0.25, 0.6, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------ big buttons ------------------------------ */

const ICONS = {
  pin: <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />,
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  phone: <path d="M6.6 3.5h2.6l1.5 4-2 1.3a11 11 0 0 0 5.5 5.5l1.3-2 4 1.5v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z" />,
  chat: <path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4 3.5v-3.5a1.5 1.5 0 0 1-1.5-1.5v-8.5Z" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  send: <path d="M4 11.5 20 4l-7.5 16-2.5-6.5L4 11.5Z" />,
  hand: (
    <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V11m0-1a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1-6 6h-.6a6 6 0 0 1-4.6-2.2L4.5 15.6a1.6 1.6 0 0 1 2.4-2.1L9 15.5V11" />
  ),
};

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      {ICONS[name]}
    </svg>
  );
}

/**
 * The buttons a guest actually needs (directions, calendar, call, reply),
 * sized for any hand and any eyesight: a 52px target, plain words in sentence
 * case rather than tracked capitals, and an icon that says the same thing.
 * Real pixels, not plate units, so they never shrink on a small phone.
 */
export function actionStyle(tone: "olive" | "cream" = "olive", wide = false): CSSProperties {
  const olive = tone === "olive";
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 52,
    width: wide ? "100%" : undefined,
    padding: "0 26px",
    borderRadius: 999,
    fontFamily: SERIF,
    fontSize: 19,
    fontWeight: 600,
    letterSpacing: "0.01em",
    lineHeight: 1.1,
    background: olive ? "var(--g-ink)" : "var(--g-cream)",
    color: olive ? "var(--g-cream)" : "var(--g-ink)",
    boxShadow: olive
      ? "inset 0 0 0 3px var(--g-ink), inset 0 0 0 4px rgba(241,234,218,0.5), 0 6px 18px rgba(30,32,18,0.22)"
      : "inset 0 0 0 3px var(--g-cream), inset 0 0 0 4px rgba(79,83,55,0.45), 0 6px 18px rgba(0,0,0,0.25)",
  };
}

export function ActionButton({
  icon,
  children,
  onClick,
  href,
  tone = "olive",
  wide = false,
  type = "button",
  disabled,
}: {
  icon?: IconName;
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  tone?: "olive" | "cream";
  wide?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const inner = (
    <>
      {icon ? <Icon name={icon} /> : null}
      <span>{children}</span>
    </>
  );
  if (href) {
    return (
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel="noopener noreferrer"
        style={actionStyle(tone, wide)}
      >
        {inner}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={actionStyle(tone, wide)} className="disabled:opacity-60">
      {inner}
    </button>
  );
}

/* ------------------------------- photos ------------------------------- */

/** The lace oval on the welcome plate, showing each of the couple's photos in
 *  turn with a slow crossfade. */
export function PhotoOval({ photos, onOpen }: { photos: string[]; onOpen?: (index: number) => void }) {
  const { compact, editing } = usePreview();
  const [i, setI] = useState(0);
  const cycling = photos.length > 1 && !compact && !editing;
  useEffect(() => {
    if (!cycling) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % photos.length), 3800);
    return () => window.clearInterval(id);
  }, [cycling, photos.length]);
  if (!photos.length) return null;
  return (
    <div
      className={`relative h-full w-full overflow-hidden ${onOpen ? "cursor-pointer" : ""}`}
      style={{ borderRadius: "50%" }}
      role={onOpen ? "button" : undefined}
      aria-label={onOpen ? "See all the photos" : undefined}
      onClick={onOpen ? () => onOpen(i) : undefined}
    >
      <AnimatePresence initial={false}>
        <motion.img
          key={photos[i]}
          src={photos[i]}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
        />
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------ countdown ------------------------------ */

function useTicking(target?: string) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!target) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);
  if (!target || now === null) return null;
  const ms = new Date(target).getTime() - now;
  if (Number.isNaN(ms) || ms <= 0) return null;
  return {
    days: Math.floor(ms / 864e5),
    hours: Math.floor((ms % 864e5) / 36e5),
    minutes: Math.floor((ms % 36e5) / 6e4),
    seconds: Math.floor((ms % 6e4) / 1e3),
  };
}

/** Days, hours, minutes and seconds to the day, in four engraved tiles; the
 *  seconds keep it visibly alive. */
export function CountdownTiles({
  target,
  ink = "var(--g-paper)",
  size = 64,
  solid,
}: {
  target?: string;
  ink?: string;
  size?: number;
  /** filled tiles in `ink` with the numbers in this colour, instead of outlines */
  solid?: string;
}) {
  const left = useTicking(target);
  if (!left) return null;
  const tiles: [number, string][] = [
    [left.days, "Days"],
    [left.hours, "Hours"],
    [left.minutes, "Minutes"],
    [left.seconds, "Seconds"],
  ];
  return (
    <div className="flex justify-center" style={{ gap: u(16), color: solid ?? ink }}>
      {tiles.map(([n, label]) => (
        <div
          key={label}
          className="flex flex-col items-center"
          style={{
            minWidth: u(size * 2.15),
            padding: `${u(size * 0.32)} ${u(8)} ${u(size * 0.26)}`,
            border: `1px solid color-mix(in srgb, ${ink} 45%, transparent)`,
            borderRadius: u(18),
            background: solid ? ink : `color-mix(in srgb, ${ink} 6%, transparent)`,
            boxShadow: solid ? `inset 0 0 0 ${u(5)} ${ink}, inset 0 0 0 ${u(6.5)} color-mix(in srgb, ${solid} 45%, transparent)` : undefined,
          }}
        >
          {/* each change rolls the new number in from above */}
          <span
            className="relative block overflow-hidden"
            style={{ height: `calc(${u(size)} * 1.08)`, width: "100%", textAlign: "center" }}
          >
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={n}
                className="block"
                style={{ fontFamily: SERIF, fontSize: u(size), lineHeight: 1.08, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}
                initial={{ y: "-100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                {String(n).padStart(2, "0")}
              </motion.span>
            </AnimatePresence>
          </span>
          <span style={{ fontFamily: SERIF, fontSize: `max(11px, ${u(size * 0.4)})`, fontWeight: 600, letterSpacing: "0.04em", marginTop: u(8), opacity: 0.9 }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}


/* ------------------------------ more motion ------------------------------ */

/**
 * Script written on as if by pen, left to right, when it comes into view.
 * The wrapper is what is watched: an element clipped to nothing never counts
 * as on screen, so the clip lives on the inner layer and takes its cue from it.
 */
export function PenReveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const { compact, editing } = usePreview();
  if (compact || editing) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} initial="hidden" whileInView="shown" viewport={{ once: true, amount: 0.6 }}>
      <motion.div
        variants={{
          hidden: { clipPath: "inset(-40% 112% -40% -12%)" },
          shown: { clipPath: "inset(-40% -30% -40% -12%)", transition: { duration: 1.6, ease: [0.45, 0, 0.25, 1], delay } },
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/**
 * The couple's photos full screen: big arrows, a large close button, a count,
 * and swiping — whichever a guest happens to try.
 */
export function PhotoViewer({ photos, start, onClose }: { photos: string[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const from = useRef<number | null>(null);
  const go = (d: number) => setI((n) => (n + d + photos.length) % photos.length);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((n) => (n + 1) % photos.length);
      if (e.key === "ArrowLeft") setI((n) => (n - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, photos.length]);
  const round: CSSProperties = {
    width: 56,
    height: 56,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(248,243,230,0.14)",
    border: "1px solid rgba(248,243,230,0.5)",
    color: "#f8f3e6",
  };
  return (
    <motion.div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center"
      style={{ background: "rgba(20,18,10,0.95)", touchAction: "pan-y" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(e) => {
        from.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (from.current !== null && Math.abs(e.clientX - from.current) > 50) go(e.clientX < from.current ? 1 : -1);
        from.current = null;
      }}
    >
      <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4" style={round}>
        <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
      <AnimatePresence mode="wait">
        <motion.img
          key={photos[i]}
          src={photos[i]}
          alt=""
          draggable={false}
          className="select-none rounded-xl object-contain"
          style={{ maxHeight: "72svh", maxWidth: "92vw" }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.35 }}
        />
      </AnimatePresence>
      {photos.length > 1 ? (
        <div className="mt-6 flex items-center" style={{ gap: 22, color: "#f8f3e6" }}>
          <button type="button" onClick={() => go(-1)} aria-label="Previous photo" style={round}>
            <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <span style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, minWidth: 70, textAlign: "center" }}>
            {i + 1} of {photos.length}
          </span>
          <button type="button" onClick={() => go(1)} aria-label="Next photo" style={round}>
            <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      ) : null}
    </motion.div>
  );
}

