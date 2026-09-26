"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePreview } from "@/components/PreviewContext";

/**
 * Stage primitives for the Voyage template.
 *
 * Every slide of this design is a piece of fixed artwork — a cream ticket, a
 * perforated stamp, an arched card — sitting on a flat navy field. The words
 * have to land INSIDE that card, so the layout can't be a normal flow: each
 * slide lays the art in at its exact aspect ratio and positions text in boxes
 * measured as fractions of the art.
 *
 * The navy around the art is the same navy as the art's own border, so a phone
 * that's taller than 9:16 just shows more navy rather than cropping the card.
 */

/** Intrinsic size of every background plate in this set. */
export const ART_W = 768;
export const ART_H = 1365;

/** A rectangle on the artwork, as fractions of its width/height. */
export type Box = { x0: number; y0: number; x1: number; y1: number };

/**
 * Art pixels → container units. Type is sized in `cqw` (1% of the stage width)
 * so the whole slide scales as one picture: at full size 1cqw = 7.68px, and on
 * a narrow phone everything shrinks together instead of reflowing.
 */
export function u(artPx: number): string {
  return `${((artPx / ART_W) * 100).toFixed(3)}cqw`;
}

export function Stage({
  id,
  art,
  children,
}: {
  id?: string;
  art?: string;
  children: ReactNode;
}) {
  const { compact } = usePreview();
  return (
    <section
      id={id}
      className={`relative flex snap-start items-center justify-center overflow-hidden ${
        compact ? "" : "min-h-svh"
      }`}
      style={{ background: "var(--v-navy)" }}
    >
      <div
        className="relative"
        style={{
          aspectRatio: `${ART_W} / ${ART_H}`,
          // as wide as it can be without the art growing taller than the screen
          width: compact ? "100%" : `min(100%, calc(100svh * ${ART_W} / ${ART_H}))`,
          // makes 1cqw = 1% of this box, which every child sizes against
          containerType: "size",
          ...(art
            ? {
                backgroundImage: `url(${art})`,
                // exact, not `cover`: the measured boxes below depend on the
                // plate filling this box edge to edge
                backgroundSize: "100% 100%",
                backgroundRepeat: "no-repeat",
              }
            : {}),
        }}
      >
        {children}
      </div>
    </section>
  );
}

/** An absolutely-placed column inside the stage, measured off the artwork. */
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

/* ------------------------------- type ------------------------------- */

/** Small gold caps — the ticket's field labels ("DESTINATION", "CLASS"). */
export function Label({
  children,
  size = 17,
  className = "",
  ...rest
}: {
  children: ReactNode;
  size?: number;
  className?: string;
  /** Studio inline-editing hook; forwarded to the rendered element. */
  "data-edit"?: string;
} & React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`uppercase ${className}`}
      style={{
        fontFamily: "var(--font-space-mono)",
        fontSize: u(size),
        letterSpacing: "0.18em",
        color: "var(--v-gold)",
        lineHeight: 1.2,
      }}
      {...rest}
    >
      {children}
    </p>
  );
}

/** The value under a label — navy mono, the boarding-pass voice. */
export function Value({
  children,
  size = 23,
  className = "",
  ...rest
}: {
  children: ReactNode;
  size?: number;
  className?: string;
  /** Studio inline-editing hook; forwarded to the rendered element. */
  "data-edit"?: string;
} & React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`uppercase ${className}`}
      style={{
        fontFamily: "var(--font-space-mono)",
        fontSize: u(size),
        letterSpacing: "0.06em",
        color: "var(--v-ink)",
        lineHeight: 1.25,
      }}
      {...rest}
    >
      {children}
    </p>
  );
}

/** Serif caps headings — "VENUE", "TIMELINE". */
export function Heading({
  children,
  size = 46,
  tone = "ink",
  className = "",
  ...rest
}: {
  children: ReactNode;
  size?: number;
  tone?: "ink" | "cream";
  className?: string;
  /** Studio inline-editing hook; forwarded to the rendered element. */
  "data-edit"?: string;
} & React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={`uppercase ${className}`}
      style={{
        fontFamily: "var(--font-cinzel)",
        fontSize: u(size),
        letterSpacing: "0.14em",
        color: tone === "cream" ? "var(--v-cream)" : "var(--v-ink)",
        lineHeight: 1.15,
      }}
      {...rest}
    >
      {children}
    </h2>
  );
}

/** Running copy. */
export function Body({
  children,
  size = 20,
  tone = "ink",
  className = "",
  ...rest
}: {
  children: ReactNode;
  size?: number;
  tone?: "ink" | "cream";
  className?: string;
  /** Studio inline-editing hook; forwarded to the rendered element. */
  "data-edit"?: string;
} & React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={className}
      style={{
        fontFamily: "var(--font-karla)",
        fontSize: u(size),
        color: tone === "cream" ? "color-mix(in srgb, var(--v-cream) 82%, transparent)" : "var(--v-body)",
        lineHeight: 1.75,
      }}
      {...rest}
    >
      {children}
    </p>
  );
}

/** A hairline in the gold of the plates. */
export function Rule({ width = "100%", className = "" }: { width?: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: "block",
        width,
        height: 1,
        background: "color-mix(in srgb, var(--v-gold) 55%, transparent)",
      }}
    />
  );
}

/**
 * The round postmark: two rings with the couple's initials and the date, set
 * slightly askew the way a hand stamp lands.
 */
export function Postmark({
  initials,
  date,
  size = 150,
  rotate = -8,
}: {
  initials: string;
  date?: string;
  size?: number;
  rotate?: number;
}) {
  return (
    <div
      className="flex items-center justify-center rounded-full"
      style={{
        width: u(size),
        height: u(size),
        border: `${u(3)} solid color-mix(in srgb, var(--v-gold) 70%, transparent)`,
        transform: `rotate(${rotate}deg)`,
        opacity: 0.85,
      }}
    >
      <div
        className="flex flex-col items-center justify-center rounded-full text-center"
        style={{
          width: "82%",
          height: "82%",
          border: `${u(1.5)} solid color-mix(in srgb, var(--v-gold) 55%, transparent)`,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-cinzel)",
            fontSize: u(size * 0.2),
            letterSpacing: "0.1em",
            color: "var(--v-gold)",
          }}
        >
          {initials}
        </span>
        {date ? (
          <span
            style={{
              fontFamily: "var(--font-space-mono)",
              fontSize: u(size * 0.1),
              letterSpacing: "0.14em",
              color: "color-mix(in srgb, var(--v-gold) 80%, transparent)",
              marginTop: u(size * 0.04),
            }}
          >
            {date}
          </span>
        ) : null}
      </div>
    </div>
  );
}
