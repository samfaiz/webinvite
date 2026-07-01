"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * A card with an ornate cusped/ogee arched top — the classic wedding-invitation
 * "tag" silhouette. Built as a fixed-height arch cap drawn in SVG sitting flush
 * on a flexible body, so the card grows with its content while the crown keeps
 * its shape. Fill + gold hairline follow the active theme.
 */
export function ArchedCard({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  // identical fill on cap + body so the seam is invisible
  const fill = "color-mix(in srgb, var(--c-surface) 90%, transparent)";
  const line = "color-mix(in srgb, var(--c-accent) 55%, transparent)";

  // gentle ogee arch. Coordinates map 1:1 with the body width (0..320) so the
  // crown's side strokes line up exactly with the body's side borders. The side
  // strokes sit at x=0 / x=320 (the card edges) and overflow rather than clip.
  const fillPath =
    "M0,88 L0,44 C50,44 110,16 160,16 C210,16 270,44 320,44 L320,88 Z";
  const outline =
    "M0,88 L0,44 C50,44 110,16 160,16 C210,16 270,44 320,44 L320,88";

  return (
    <div
      className={`relative mx-auto w-full max-w-md ${className}`}
      style={{ filter: "drop-shadow(0 18px 30px rgba(40,50,80,0.18))", ...style }}
    >
      {/* arched crown */}
      <svg
        viewBox="0 0 320 88"
        preserveAspectRatio="none"
        className="block w-full"
        style={{ height: 64, overflow: "visible" }}
        aria-hidden
      >
        <path d={fillPath} style={{ fill }} />
        <path
          d={outline}
          fill="none"
          style={{ stroke: line }}
          strokeWidth={1.3}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* body — flat top tucks under the crown, rounded bottom; side borders line
          up with the crown's side strokes for one continuous gold outline */}
      <div
        className="-mt-px rounded-b-[1.75rem] px-7 pb-9 pt-1"
        style={{
          background: fill,
          borderLeft: `1px solid ${line}`,
          borderRight: `1px solid ${line}`,
          borderBottom: `1px solid ${line}`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
