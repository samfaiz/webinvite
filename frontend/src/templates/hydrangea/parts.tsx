"use client";

import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";

/**
 * The pieces of "Blue Hydrangea" that aren't type: flowers, the carved oval
 * frame, the lace ground, the week strip with its heart, the colour dots.
 *
 * The flowers, the frame and the lace are generated art (see ART). Until a
 * piece is in, a drawn stand-in takes its place at the same size, so the page
 * lays out exactly as it will with the real art.
 */

/** Generated art (files in public/assets/templates/hydrangea); null until each is in. */
const A = (f: string) => `/assets/templates/hydrangea/${f}`;

export const ART: { band: string | null; flower: string | null; frame: string | null; lace: string | null } = {
  band: A("band.webp"),
  flower: A("flower.webp"),
  frame: A("frame.webp"),
  lace: A("lace.webp"),
};

export const BLUE = "#4b678d";
export const BLUSH = "#fdeef4";

/** Design pixels (the reference is drawn ~390 wide) → container units. */
export function v(px: number): string {
  return `${((px / 390) * 100).toFixed(3)}cqw`;
}

/* ------------------------------- flowers ------------------------------- */

/** One blue flower: five broad petals, navy at the heart fading to near-white
 *  tips, a cluster of white stamens. */
export function Flower({ size, rotate = 0, style }: { size: string; rotate?: number; style?: CSSProperties }) {
  const id = useId().replace(/:/g, "");
  if (ART.flower) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={ART.flower} alt="" aria-hidden style={{ width: size, height: size, transform: `rotate(${rotate}deg)`, ...style }} />
    );
  }
  return (
    <svg viewBox="-50 -50 100 100" style={{ width: size, height: size, transform: `rotate(${rotate}deg)`, ...style }} aria-hidden>
      <defs>
        <radialGradient id={`p${id}`} cx="0" cy="0" r="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1f3a6e" />
          <stop offset="0.45" stopColor="#3f5c94" />
          <stop offset="0.8" stopColor="#8ea5d1" />
          <stop offset="1" stopColor="#dfe7f6" />
        </radialGradient>
        <filter id={`s${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.4" floodColor="#1c2c4a" floodOpacity="0.35" />
        </filter>
      </defs>
      <g filter={`url(#s${id})`}>
        {[0, 72, 144, 216, 288].map((a) => (
          <g key={a} transform={`rotate(${a})`}>
            <path d="M0 -4 C 15 -10, 22 -32, 10 -44 C 4 -49, -4 -49, -10 -44 C -22 -32, -15 -10, 0 -4 Z" fill={`url(#p${id})`} />
            <path d="M0 -6 L 0 -38 M0 -14 L 6 -30 M0 -14 L -6 -30" stroke="#1b3264" strokeOpacity="0.35" strokeWidth="0.7" fill="none" />
          </g>
        ))}
      </g>
      {[[0, 0], [3, -2], [-3, -1.5], [1.5, 3], [-2, 2.8], [4, 2], [-4, 1.5]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.9" fill={i % 2 ? "#fbf6e6" : "#ffffff"} stroke="#c9c2a4" strokeWidth="0.3" />
      ))}
    </svg>
  );
}

/** The row of flowers between sections, laid across the join of two grounds
 *  (`top` above its middle, `bottom` below — a colour or the lace). The
 *  outer flowers run off the edges, as in the reference. */
export function FlowerBand({ top, bottom }: { top: CSSProperties; bottom: CSSProperties }) {
  // the grounds reach a pixel past the band, and the band overlaps its
  // neighbours by a pixel, so no hairline shows where rounding leaves a gap
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
  const row: [number, number, number][] = [
    [96, -12, 0],
    [84, 18, -14],
    [90, -6, 4],
    [80, 30, -10],
    [94, 8, 2],
    [86, -20, -6],
  ];
  return (
    <div className="relative overflow-hidden" style={{ height: v(96), margin: "-1px 0" }}>
      {grounds}
      <div className="absolute inset-y-0 flex items-center" style={{ left: "-7%", right: "-7%", justifyContent: "space-between" }}>
        {row.map(([s, r, y], i) => (
          <Flower key={i} size={v(s)} rotate={r} style={{ marginTop: v(y), marginLeft: i ? v(-14) : 0 }} />
        ))}
      </div>
    </div>
  );
}

/* ----------------------------- the frame ----------------------------- */

/** The carved oval frame. `children` is what shows in its opening. */
export function OrnateFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto" style={{ width: "100%", aspectRatio: "3 / 4" }}>
      {/* the opening: a vertical oval inside the carving — measured off
          frame.webp, with a sliver of overlap so no gap shows at its rim */}
      <div
        className="absolute overflow-hidden"
        style={ART.frame
          ? { left: "19%", right: "19%", top: "18.6%", bottom: "17.4%", borderRadius: "50%" }
          : { left: "17%", right: "17%", top: "13%", bottom: "13%", borderRadius: "50%" }}
      >
        {children}
      </div>
      {ART.frame ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ART.frame} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
      ) : (
        <svg viewBox="0 0 300 400" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <linearGradient id="hf" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#6e88b0" />
              <stop offset="0.5" stopColor={BLUE} />
              <stop offset="1" stopColor="#36507a" />
            </linearGradient>
          </defs>
          <ellipse cx="150" cy="200" rx="125" ry="172" fill="none" stroke="url(#hf)" strokeWidth="26" />
          <ellipse cx="150" cy="200" rx="139" ry="186" fill="none" stroke="#36507a" strokeWidth="2" />
          <ellipse cx="150" cy="200" rx="111" ry="158" fill="none" stroke="#2f4770" strokeWidth="2.5" />
          {Array.from({ length: 36 }, (_, i) => {
            const t = (i / 36) * Math.PI * 2;
            return <circle key={i} cx={150 + 125 * Math.cos(t)} cy={200 + 172 * Math.sin(t)} r="5" fill="#7f97bd" stroke="#36507a" strokeWidth="1" />;
          })}
          {/* shell crests, top and bottom */}
          {[
            [150, 22, 1],
            [150, 378, -1],
          ].map(([x, y, d]) => (
            <g key={y} transform={`translate(${x} ${y}) scale(1 ${d})`}>
              <path d="M-34 10 C -30 -14, 30 -14, 34 10 Z" fill="url(#hf)" stroke="#2f4770" strokeWidth="2" />
              {[-24, -12, 0, 12, 24].map((xx) => (
                <path key={xx} d={`M0 10 L ${xx} -8`} stroke="#2f4770" strokeWidth="1.5" />
              ))}
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

/* ------------------------------- lace ------------------------------- */

/** The blue lace ground behind the programme. */
export function laceStyle(): CSSProperties {
  // a fixed tile size, so the lace is the same scale wherever it appears
  if (ART.lace) return { backgroundColor: BLUE, backgroundImage: `url(${ART.lace})`, backgroundSize: "420px auto" };
  // stand-in: faint scrolling stems and blossoms on the blue
  const tile = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><g fill='none' stroke='%237690b6' stroke-width='1.2' opacity='0.55'><path d='M0 60 C 20 40, 40 80, 60 60 S 100 40, 120 60'/><path d='M60 0 C 40 20, 80 40, 60 60 S 40 100, 60 120'/><circle cx='30' cy='30' r='9'/><circle cx='30' cy='30' r='4'/><circle cx='90' cy='90' r='9'/><circle cx='90' cy='90' r='4'/><path d='M84 24 c 6 -8 14 -8 16 0 c -6 6 -12 6 -16 0z'/><path d='M24 84 c 6 -8 14 -8 16 0 c -6 6 -12 6 -16 0z'/></g></svg>`;
  return { backgroundColor: BLUE, backgroundImage: `url("data:image/svg+xml,${tile.replace(/#/g, "%23").replace(/"/g, "'")}")`, backgroundSize: "34% auto" };
}

/* ----------------------------- week strip ----------------------------- */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** The week of the wedding, Monday to Sunday, the day itself on a heart. The
 *  rules run the full width of the page, past the edges of the circle. */
export function WeekStrip({ iso, ink, ground }: { iso?: string; ink: string; ground: string }) {
  const d = new Date(iso ?? "");
  if (Number.isNaN(d.getTime())) return null;
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const line = `1px solid color-mix(in srgb, ${ink} 55%, transparent)`;
  return (
    <div className="grid w-full" style={{ gridTemplateColumns: "repeat(7, 1fr)", borderTop: line, borderBottom: line }}>
      {DAYS.map((name, i) => {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        const on = day.toDateString() === d.toDateString();
        return (
          <div
            key={name}
            className="relative flex flex-col items-center justify-center"
            style={{ padding: `${v(10)} 0 ${v(8)}`, borderLeft: i ? line : undefined }}
          >
            {on ? (
              <svg viewBox="0 0 100 92" className="absolute" style={{ width: "136%", left: "-18%", top: "-22%" }} aria-hidden>
                <path d="M50 90 C 18 66, 2 46, 2 26 C 2 12, 13 2, 27 2 C 38 2, 46 9, 50 18 C 54 9, 62 2, 73 2 C 87 2, 98 12, 98 26 C 98 46, 82 66, 50 90 Z" fill={ink} />
              </svg>
            ) : null}
            <span
              className="relative"
              style={{ fontFamily: "var(--font-cormorant)", fontSize: v(22), fontWeight: 600, lineHeight: 1, color: on ? ground : ink }}
            >
              {day.getDate()}
            </span>
            <span
              className="relative"
              style={{ fontFamily: "var(--font-cormorant)", fontSize: v(12.5), fontWeight: 600, marginTop: v(5), color: on ? ground : ink, opacity: on ? 1 : 0.85 }}
            >
              {name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------- colour dots ----------------------------- */

/** The palette as overlapping dots, like swatches laid on a table. */
export function Swatches({ colors }: { colors: { hex: string; label?: string }[] }) {
  return (
    <div className="flex justify-center">
      {colors.map((c, i) => (
        <span
          key={`${c.hex}-${i}`}
          title={c.label}
          className="block rounded-full"
          style={{
            width: v(60),
            height: v(60),
            marginLeft: i ? v(-12) : 0,
            background: c.hex,
            boxShadow: "0 2px 6px rgba(40,50,80,0.18)",
            zIndex: colors.length - i,
          }}
        />
      ))}
    </div>
  );
}
