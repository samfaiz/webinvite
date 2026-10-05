"use client";

import type { CSSProperties, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
  video,
  fill = false,
  field = "var(--g-olive)",
  children,
}: {
  id?: string;
  art: string;
  /** a moving version of the same plate, framed identically — the art stays
   *  underneath as its poster and for anyone who prefers reduced motion */
  video?: string;
  /** Always as tall as the screen. Phones are taller than the art, so this
   *  trims a little off each side instead of leaving bands above and below —
   *  for the plates whose edges are foliage or flat colour, never type. */
  fill?: boolean;
  field?: string;
  children: ReactNode;
}) {
  const { compact } = usePreview();
  const reduce = useReducedMotion();
  // a painting with nothing else moving on it drifts closer, very slowly
  const drift = fill && !video && !compact && !reduce;
  return (
    <section
      id={id}
      className={`relative flex snap-start items-center justify-center overflow-hidden ${compact ? "" : "min-h-svh"}`}
      style={{ background: field }}
    >
      <div
        className={`relative shrink-0 ${drift ? "overflow-hidden" : ""}`}
        style={{
          aspectRatio: `${ART_W} / ${ART_H}`,
          width: compact
            ? "100%"
            : fill
              ? `calc(100svh * ${ART_W} / ${ART_H})`
              : `min(100%, calc(100svh * ${ART_W} / ${ART_H}))`,
          containerType: "size",
          backgroundImage: `url(${art})`,
          // exact, not `cover` — the measured boxes depend on it
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
        }}
      >
        {drift ? (
          <motion.div
            aria-hidden
            className="absolute inset-0"
            style={{ backgroundImage: `url(${art})`, backgroundSize: "100% 100%" }}
            initial={{ scale: 1 }}
            whileInView={{ scale: 1.06 }}
            viewport={{ amount: 0.4 }}
            transition={{ duration: 16, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
          />
        ) : null}
        {video && !compact ? (
          <video
            src={video}
            poster={art}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden
            className="absolute inset-0 h-full w-full motion-reduce:hidden"
            // `fill`, like the art: the measured boxes hold for the video too
            style={{ objectFit: "fill" }}
          />
        ) : null}
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


/**
 * A plate whose middle grows with what is written on it.
 *
 * The arch-panel plates are cut into three: the top (garland, oval), a plain
 * band of the panel with straight sides, and the foot (curve, garland). The
 * band repeats down the page as far as the content needs, and at least far
 * enough to fill the screen — so there is no empty olive above and below on a
 * tall phone, and a long RSVP form or five events never run out of room.
 */
export type Slices = {
  top: string;
  mid: string;
  bot: string;
  /** each slice's height in art pixels (they are all ART_W wide) */
  topH: number;
  midH: number;
  botH: number;
};

export function FlowPlate({
  id,
  slices,
  pad,
  field = "var(--g-olive)",
  head,
  children,
}: {
  id?: string;
  slices: Slices;
  /** side padding in art px, so the words stay inside the panel */
  pad: number;
  field?: string;
  /** zones laid over the top slice (boxes are fractions of that slice) */
  head?: ReactNode;
  children: ReactNode;
}) {
  const { compact } = usePreview();
  const slice = (src: string, h: number, extra?: CSSProperties) => ({
    backgroundImage: `url(${src})`,
    backgroundSize: "100% 100%",
    aspectRatio: `${ART_W} / ${h}`,
    ...extra,
  });
  return (
    <section id={id} className="relative flex snap-start justify-center" style={{ background: field }}>
      <div
        className="flex flex-col"
        style={{
          width: compact ? "100%" : `min(100%, calc(100svh * ${ART_W} / ${ART_H}))`,
          minHeight: compact ? undefined : "100svh",
          containerType: "inline-size",
        }}
      >
        {/* the slices overlap by a pixel so no hairline of olive shows at a join */}
        <div className="relative z-[1] -mb-px" style={slice(slices.top, slices.topH)}>
          {head}
        </div>
        <div
          className="relative flex flex-1 flex-col items-center justify-center text-center"
          style={{
            backgroundImage: `url(${slices.mid})`,
            backgroundSize: "100% auto",
            backgroundRepeat: "repeat-y",
            minHeight: u(slices.midH),
            padding: `${u(10)} ${u(pad)}`,
          }}
        >
          {children}
        </div>
        <div className="relative z-[1] -mt-px" style={slice(slices.bot, slices.botH)} />
      </div>
    </section>
  );
}
