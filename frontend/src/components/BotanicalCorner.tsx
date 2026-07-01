import type { CSSProperties } from "react";

/** A small leaf (teardrop) used to build the sprig. */
function Leaf({ x, y, s = 1, r = 0, o = 0.5 }: { x: number; y: number; s?: number; r?: number; o?: number }) {
  return (
    <path
      d="M0 0 C 5 -7 5 -16 0 -23 C -5 -16 -5 -7 0 0 Z"
      transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
      style={{ fill: "var(--c-accent)" }}
      opacity={o}
    />
  );
}

/**
 * Decorative botanical corner sprig. Defaults to a tasteful gold vector branch
 * (themed via --c-accent); when a painted PNG pack is supplied (`imageUrl`) that
 * is used instead. Anchor it in a corner and pass `flip` to mirror it.
 */
export function BotanicalCorner({
  imageUrl,
  flip = false,
  className = "",
  style,
}: {
  imageUrl?: string;
  flip?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const mirror = flip ? { transform: "scaleX(-1)" } : {};

  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={imageUrl}
        alt=""
        aria-hidden
        className={className}
        style={{ ...mirror, ...style }}
      />
    );
  }

  // a curving branch from the corner with leaf clusters
  const leaves: { x: number; y: number; s?: number; r?: number; o?: number }[] = [
    { x: 30, y: 34, s: 1.1, r: -40 }, { x: 24, y: 30, s: 1, r: 150, o: 0.4 },
    { x: 52, y: 58, s: 1.15, r: -25 }, { x: 44, y: 54, s: 1, r: 165, o: 0.4 },
    { x: 70, y: 86, s: 1.1, r: -10 }, { x: 62, y: 84, s: 0.95, r: 175, o: 0.4 },
    { x: 82, y: 118, s: 1.0, r: 5 }, { x: 74, y: 116, s: 0.9, r: -170, o: 0.4 },
    { x: 88, y: 150, s: 0.9, r: 18 },
    // a few small accent leaves up high
    { x: 16, y: 16, s: 0.8, r: -60, o: 0.55 }, { x: 40, y: 18, s: 0.7, r: -75, o: 0.45 },
  ];

  return (
    <svg viewBox="0 0 160 200" className={className} style={{ ...mirror, ...style }} aria-hidden>
      {/* main stem + a secondary offshoot */}
      <g
        fill="none"
        style={{ stroke: "var(--c-accent)" }}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.75}
      >
        <path d="M6 2 C 36 26, 66 64, 92 160" />
        <path d="M6 2 C 24 18, 30 46, 30 78" opacity={0.7} />
      </g>
      <g>
        {leaves.map((l, i) => (
          <Leaf key={i} {...l} />
        ))}
      </g>
    </svg>
  );
}
