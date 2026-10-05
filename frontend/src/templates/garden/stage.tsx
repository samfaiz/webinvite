"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePreview } from "@/components/PreviewContext";

/**
 * Plates for the Garden template — the same idea as Voyage's stage, sized
 * for this set's 1116 × 2000 artwork.
 *
 * Every page is a finished painting or engraving with the words still to be
 * written in, so text has to land inside the heart, the oval, the arch of a
 * garland. Each page lays its plate in at its exact aspect ratio, and text is
 * placed in boxes measured as fractions of the art. Type sizes in `cqw`, so a
 * plate scales as one picture rather than reflowing around its own drawing.
 */

export const ART_W = 1116;
export const ART_H = 2000;

/** A rectangle on the artwork, as fractions of its width and height. */
export type Box = { x0: number; y0: number; x1: number; y1: number };

/** Art pixels → container units. 1cqw = 1% of the plate's rendered width. */
export function u(artPx: number): string {
  return `${((artPx / ART_W) * 100).toFixed(3)}cqw`;
}

/**
 * One page. `field` fills the screen around the plate on a phone taller than
 * the art — it's the colour of the plate's own edges, so the join can't be
 * seen. Flat pages use the olive, the paintings their dark foliage.
 */
export function Plate({
  id,
  art,
  field = "var(--g-olive)",
  children,
}: {
  id?: string;
  art: string;
  field?: string;
  children: ReactNode;
}) {
  const { compact } = usePreview();
  return (
    <section
      id={id}
      className={`relative flex snap-start items-center justify-center overflow-hidden ${compact ? "" : "min-h-svh"}`}
      style={{ background: field }}
    >
      <div
        className="relative"
        style={{
          aspectRatio: `${ART_W} / ${ART_H}`,
          width: compact ? "100%" : `min(100%, calc(100svh * ${ART_W} / ${ART_H}))`,
          containerType: "size",
          backgroundImage: `url(${art})`,
          // exact, not `cover` — the measured boxes depend on it
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
        }}
      >
        {children}
      </div>
    </section>
  );
}

/** An absolutely placed column on the plate. */
export function Zone({
  box,
  className = "",
  style,
  children,
}: {
  box: Box;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className={`absolute flex flex-col ${className}`}
      style={{
        left: `${box.x0 * 100}%`,
        top: `${box.y0 * 100}%`,
        width: `${(box.x1 - box.x0) * 100}%`,
        height: `${(box.y1 - box.y0) * 100}%`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
