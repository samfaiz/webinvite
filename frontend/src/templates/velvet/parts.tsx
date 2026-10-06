"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * The pieces of "Velvet Lily" that aren't type: the burgundy velvet and the
 * cream paper, the torn edge between them, the faint love letter under the
 * paper, the engraved frames and dividers, the wax seal, the polaroids and
 * the timeline's oval medallions.
 *
 * The line art, the seal and the photographs are generated (see ART). Until
 * a piece is in, a drawn stand-in or nothing takes its place, at its size.
 */

const A = (f: string) => `/assets/templates/velvet/${f}`;
export const artPath = A;

export type IconKey = "envelope" | "rings" | "arch" | "glasses" | "dinner" | "car";

/** Generated art; null until the file is in public/assets/templates/velvet. */
export const ART: {
  lilyCorner: string | null;
  lilyStem: string | null;
  palace: string | null;
  scroll: string | null;
  seal: string | null;
  hall: string | null;
  polaroids: [string | null, string | null];
  bouquet: string | null;
  icons: Record<IconKey, string | null>;
} = {
  lilyCorner: A("lily-corner.webp"),
  lilyStem: A("lily-stem.webp"),
  palace: A("palace.webp"),
  scroll: A("scroll.webp"),
  seal: A("seal.webp"),
  hall: A("hall.webp"),
  polaroids: [A("polaroid-1.webp"), A("polaroid-2.webp")],
  bouquet: A("bouquet.webp"),
  icons: {
    envelope: A("icon-envelope.webp"),
    rings: A("icon-rings.webp"),
    arch: A("icon-arch.webp"),
    glasses: A("icon-glasses.webp"),
    dinner: A("icon-dinner.webp"),
    car: A("icon-car.webp"),
  },
};

export const WINE = "#3a0d16"; // the velvet, at its edges
export const PAPER = "#ede3d5"; // the paper, at its edges
export const INK = "#5a1a24"; // burgundy ink on paper
export const INK_SOFT = "#7d5d58";
export const CREAM = "#f1e6dc"; // type on velvet
export const OVAL = "#efe3d6";
export const CAPS = "var(--font-cinzel)";
export const SERIF = "var(--font-cormorant)";
export const SCRIPT = "var(--font-parisienne)";
export const HAND = "var(--font-greatvibes)";

/** Design pixels (drawn ~390 wide) → container units. */
export function v(px: number): string {
  return `${((px / 390) * 100).toFixed(3)}cqw`;
}

/* ------------------------------ surfaces ------------------------------ */

const noise = (alpha: number) =>
  `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${alpha} 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`;

/** Burgundy velvet: a soft sheen in the middle of each section that falls
 *  away to the same colour at its edges, so sections meet without a seam. */
export const velvet: CSSProperties = {
  backgroundColor: WINE,
  backgroundImage: [
    noise(0.28),
    "radial-gradient(70% 45% at 28% 35%, rgba(128,30,48,0.42), transparent 70%)",
    "radial-gradient(60% 40% at 78% 70%, rgba(104,24,40,0.36), transparent 70%)",
  ].join(", "),
};

/** Cream paper, faintly grained, one even colour so its torn rim (drawn
 *  flat) and the pages below meet it without a seam. */
export const paper: CSSProperties = {
  backgroundColor: PAPER,
  backgroundImage: noise(0.07),
};

/** A love letter in faded ink on the velvet, half hidden by the paper. */
export function Letter({ style }: { style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute select-none overflow-hidden"
      style={{ fontFamily: HAND, fontSize: v(19), lineHeight: 1.55, color: "rgba(241,222,214,0.09)", transform: "rotate(-5deg)", ...style }}
    >
      My dearest, from the very first day I knew my heart had found its home. Every morning with you is a promise kept and every evening a quiet joy. I
      choose you today, and every day after, with all that I am. Forever yours, with love. My dearest, from the very first day I knew my heart had found
      its home. Every morning with you is a promise kept.
    </div>
  );
}

/* ------------------------------ torn edge ------------------------------ */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** The paper's torn left edge, x in 0–100 of the strip, down 0–1000. It
 *  wanders near the right of the strip, then sweeps out to the left at the
 *  foot, where the paper runs the full width. */
function tornPath(seed: number, inset: number): string {
  const r = rng(seed);
  const knots = Array.from({ length: 14 }, () => r());
  const wave = (y: number) => {
    const t = (y / 1000) * (knots.length - 1);
    const i = Math.min(Math.floor(t), knots.length - 2);
    const f = t - i;
    const e = f * f * (3 - 2 * f);
    return knots[i] + (knots[i + 1] - knots[i]) * e;
  };
  const sweep = (y: number) => {
    const f = Math.min(Math.max((y - 840) / 160, 0), 1);
    return f * f * (3 - 2 * f);
  };
  const xAt = (y: number) => (58 + wave(y) * 26) * (1 - sweep(y)) - 12 * sweep(y);
  let d = `M100 0 L${(xAt(0) - inset).toFixed(1)} 0`;
  for (let y = 4; y <= 1000; y += 3 + r() * 5) {
    const fray = (r() - 0.5) * 7 + (r() < 0.08 ? -r() * 9 : 0);
    d += ` L${(xAt(y) + fray - inset).toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d} L-20 1000 L100 1000 Z`;
}

/** The torn shape as a mask, so the strip wears the paper's own grain. */
function tornMask(seed: number, inset: number): CSSProperties {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 1000' preserveAspectRatio='none'><path d='${tornPath(seed, inset)}'/></svg>`;
  const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  return { maskImage: url, WebkitMaskImage: url, maskSize: "100% 100%", WebkitMaskSize: "100% 100%", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat" };
}

/**
 * The paper laid over the velvet with its left edge torn: a pale fibrous
 * rim under the paper's own edge, and a soft shadow on the velvet.
 */
export function TornPaper({ strip, seed = 5 }: { strip: number; seed?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0" style={{ filter: "drop-shadow(-3px 2px 7px rgba(10,0,3,0.55))" }}>
      <div className="absolute left-0 top-0 h-full" style={{ width: v(strip), background: "#f8f2e8", ...tornMask(seed, 3) }} />
      <div className="absolute left-0 top-0 h-full" style={{ width: v(strip), ...paper, ...tornMask(seed, 0) }} />
      <div className="absolute inset-y-0 right-0" style={{ left: `calc(${v(strip)} - 1px)`, ...paper }} />
    </div>
  );
}

/* ----------------------------- ornaments ----------------------------- */

/** A small engraved rule: two tapering lines and a diamond between. */
export function Divider({ color = INK, width = 120 }: { color?: string; width?: number }) {
  return (
    <svg viewBox="0 0 120 12" style={{ width: v(width), height: v(width / 10) }} aria-hidden>
      <path d="M2 6 Q30 3 54 6 Q30 9 2 6Z" fill={color} opacity={0.75} />
      <path d="M118 6 Q90 3 66 6 Q90 9 118 6Z" fill={color} opacity={0.75} />
      <path d="M60 1.5 L64.5 6 L60 10.5 L55.5 6Z" fill="none" stroke={color} strokeWidth={1} />
      <circle cx="60" cy="6" r="1.4" fill={color} />
    </svg>
  );
}

/** One engraved corner flourish, drawn for the top-left and turned for the
 *  others. */
function Corner({ color, size, turn, style }: { color: string; size: string; turn: number; style: CSSProperties }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className="absolute" style={{ width: size, height: size, transform: `rotate(${turn}deg)`, ...style }}>
      <path d="M2 38 L2 2 L38 2" fill="none" stroke={color} strokeWidth={1.2} />
      <path d="M7 34 L7 7 L34 7" fill="none" stroke={color} strokeWidth={0.7} opacity={0.8} />
      <path d="M7 18 C13 18 18 13 18 7" fill="none" stroke={color} strokeWidth={0.9} />
      <path d="M12 12 C9 8 4 9 5 13 C6 16 10 15 10 12" fill="none" stroke={color} strokeWidth={0.8} />
      <circle cx="13" cy="13" r="1.6" fill={color} />
    </svg>
  );
}

/** A picture or a card in a fine double frame with engraved corners; `round`
 *  makes it a soft-cornered card with a fine inner line instead. */
export function OrnateFrame({
  children,
  color = INK,
  corner = 26,
  pad = 7,
  round = false,
  style,
  className = "",
}: {
  children: ReactNode;
  color?: string;
  corner?: number;
  pad?: number;
  round?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  const c = v(corner);
  const o = v(-3);
  if (round) {
    return (
      <div className={`relative ${className}`} style={{ padding: v(pad), borderRadius: v(26), boxShadow: "0 10px 30px rgba(10,0,3,0.45)", ...style }}>
        <div aria-hidden className="pointer-events-none absolute" style={{ inset: v(7), borderRadius: v(20), border: `1px solid ${color}`, opacity: 0.4 }} />
        {children}
      </div>
    );
  }
  return (
    <div className={`relative ${className}`} style={{ padding: v(pad), ...style }}>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ border: `1px solid ${color}`, opacity: 0.55 }} />
      <Corner color={color} size={c} turn={0} style={{ left: o, top: o }} />
      <Corner color={color} size={c} turn={90} style={{ right: o, top: o }} />
      <Corner color={color} size={c} turn={180} style={{ right: o, bottom: o }} />
      <Corner color={color} size={c} turn={270} style={{ left: o, bottom: o }} />
      {children}
    </div>
  );
}

/** A generated picture, or a soft stand-in of the same shape until it's in. */
export function Picture({ src, ratio, tone = "warm", style, className = "" }: { src: string | null; ratio: string; tone?: "warm" | "wine" | "mono"; style?: CSSProperties; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" aria-hidden className={`block w-full object-cover ${className}`} style={{ aspectRatio: ratio, ...style }} />;
  }
  const bg = {
    warm: "radial-gradient(circle at 50% 30%, #f6e2b8, #b98a55 45%, #4a2a1c)",
    wine: "radial-gradient(circle at 45% 45%, #c98b8f, #6e1d2c 50%, #2a070e)",
    mono: "radial-gradient(circle at 45% 40%, #e8e8e8, #8a8a8a 55%, #2e2e2e)",
  }[tone];
  return <div aria-hidden className={`w-full ${className}`} style={{ aspectRatio: ratio, background: bg, ...style }} />;
}

/** A black-and-white snapshot in a white polaroid border, tucked at an angle. */
export function Polaroid({ src, turn, style }: { src: string | null; turn: number; style: CSSProperties }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        width: v(92),
        padding: `${v(6)} ${v(6)} ${v(20)}`,
        background: "#fbf9f5",
        boxShadow: "0 6px 16px rgba(20,4,8,0.45)",
        transform: `rotate(${turn}deg)`,
        ...style,
      }}
    >
      <Picture src={src} ratio="1 / 1" tone="mono" style={{ filter: "grayscale(1)" }} />
    </div>
  );
}

/** A line drawing in ink; on the velvet it's lifted to a faint glow. */
export function LineArt({ src, style, onVelvet = false }: { src: string | null; style?: CSSProperties; onVelvet?: boolean }) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden
      className="pointer-events-none absolute select-none"
      style={{ ...(onVelvet ? { filter: "brightness(0) invert(0.85) sepia(0.4)", opacity: 0.1 } : {}), ...style }}
    />
  );
}

/** The burgundy wax seal, pressed where two pages meet. */
export function Seal({ style }: { style?: CSSProperties }) {
  const box: CSSProperties = { width: v(64), height: v(64), ...style };
  if (ART.seal) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={ART.seal} alt="" aria-hidden className="pointer-events-none absolute" style={box} />;
  }
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute rounded-full"
      style={{
        ...box,
        background: "radial-gradient(circle at 38% 32%, #9a3344, #6b1a28 55%, #4a0f1b)",
        boxShadow: "0 3px 8px rgba(30,5,10,0.5), inset 0 0 0 4px rgba(74,15,27,0.6), inset 0 0 0 6px rgba(160,60,75,0.35)",
      }}
    />
  );
}

/* ------------------------------ timeline ------------------------------ */

/**
 * Which drawing suits an event, by the words in its name, Kerala ceremonies
 * included in their usual spellings. The church, nikah or muhurtham wins
 * over a meal ("Holy Mass and lunch"), a meal over a plain "wedding"
 * ("Wedding reception").
 */
export function iconFor(name: string | undefined, i: number): IconKey {
  const n = (name ?? "").toLowerCase();
  if (/greet|welcome|arriv|invit/.test(n)) return "envelope";
  if (/ring|engage|betroth|manasamm?a(th|d)h?am|nis?c?h?ayam|nichayam|othu ?kalyanam|mothiram/.test(n)) return "rings";
  if (/church|mass\b|holy|matrimony|kurbana|qurbana|nikk?ah|muhur|thali|thaali|minnu|mantrakodi|temple/.test(n)) return "arch";
  if (/dinner|lunch|feast|banquet|recep|meal|sadh?ya|valima|walima|break/.test(n)) return "dinner";
  if (/toast|dance|party|cocktail|sangeet|music|haldi|mehn?di|mehendi|henna|m[ay]i?lan(ch|j)i|chan[td]h?am|madhuram|celebrat|get ?together/.test(n)) return "glasses";
  if (/ceremon|wedding|vow|blessing|marriage|kalyanam|vivah|mangalya/.test(n)) return "arch";
  if (/\bend\b|farewell|send|depart|good ?bye|vid(a|aa)i|griha|close/.test(n)) return "car";
  const order: IconKey[] = ["envelope", "arch", "rings", "glasses", "dinner", "car"];
  return order[i % order.length];
}

/** A cream oval with the event's drawing in it. */
export function Medallion({ icon }: { icon: IconKey }) {
  const src = ART.icons[icon];
  return (
    <div
      className="flex shrink-0 items-center justify-center"
      style={{
        width: v(64),
        height: v(80),
        borderRadius: "50%",
        background: OVAL,
        boxShadow: `inset 0 0 0 ${v(3)} ${OVAL}, inset 0 0 0 ${v(4)} rgba(90,26,36,0.35), 0 4px 12px rgba(10,0,3,0.4)`,
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" aria-hidden style={{ width: "72%", height: "72%", objectFit: "contain" }} />
      ) : (
        <span aria-hidden style={{ fontFamily: SERIF, fontSize: v(26), color: INK, opacity: 0.6 }}>
          ✦
        </span>
      )}
    </div>
  );
}
