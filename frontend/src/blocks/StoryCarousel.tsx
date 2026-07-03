"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { InvitationContent } from "@/engine/types";
import { Divider } from "@/components/Ornaments";
import { Reveal } from "@/components/Reveal";
import { Movable } from "@/components/Movable";
import { usePreview } from "@/components/PreviewContext";

/**
 * Polaroid story carousel — swipe/drag or use the arrows. Postcard-style framing
 * with handwritten (script) captions. The arrows float over the edges so the
 * photo keeps a natural portrait proportion instead of being squeezed thin.
 */
export function StoryCarousel({ content }: { content: InvitationContent }) {
  const items = content.story.items;
  const count = items.length;
  const [[index, dir], setState] = useState<[number, number]>([0, 0]);
  const { editing } = usePreview();
  const reduce = useReducedMotion();
  const [paused, setPaused] = useState(false);

  // auto-advance ~every 4.5s; paused on hover/touch, while editing, when there's
  // only one photo, or for reduced-motion. Changing `index` resets the timer, so
  // manual navigation won't cause an immediate jump.
  useEffect(() => {
    if (reduce || editing || paused || count <= 1) return;
    const id = window.setTimeout(() => setState(([p]) => [(p + 1) % count, 1]), 4500);
    return () => window.clearTimeout(id);
  }, [index, paused, editing, reduce, count]);

  if (!count) return null;

  const paginate = (d: number) =>
    setState(([prev]) => [(prev + d + count) % count, d]);

  const item = items[index];

  return (
    <section className="px-5 py-10 text-center">
      <Movable moveKey="story.heading" offset={content.offsets?.["story.heading"]}>
        <Reveal>
          <h2
            data-edit="story.heading"
            className="font-display text-2xl uppercase tracking-[0.12em] sm:text-3xl"
            style={{ color: "var(--c-primary)" }}
          >
            {content.story.heading}
          </h2>
          {content.story.subtext ? (
            <p data-edit="story.subtext" className="font-body mt-2 text-sm italic sm:text-base" style={{ color: "var(--c-secondary)" }}>
              {content.story.subtext}
            </p>
          ) : null}
          <Divider className="my-4" width={84} />
        </Reveal>
      </Movable>

      <div
        className="relative mx-auto flex max-w-[340px] items-center justify-center"
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
      >
        <CarouselArrow
          side="left"
          onClick={() => paginate(-1)}
          className="absolute left-0 top-1/2 z-20 -translate-y-1/2"
        />

        {/* aspect box reserves the polaroid's footprint so the absolute card has room */}
        <div className="relative mx-auto aspect-[3/4] w-[74%] max-w-[240px]">
          <AnimatePresence custom={dir} initial={false} mode="popLayout">
            <motion.div
              key={index}
              custom={dir}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.5}
              onDragEnd={(_, info) => {
                if (info.offset.x < -70) paginate(1);
                else if (info.offset.x > 70) paginate(-1);
              }}
              initial={{ opacity: 0, x: dir > 0 ? 120 : -120, rotate: dir > 0 ? 6 : -6 }}
              animate={{ opacity: 1, x: 0, rotate: -2 }}
              exit={{ opacity: 0, x: dir > 0 ? -120 : 120, rotate: dir > 0 ? -6 : 6 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 cursor-grab active:cursor-grabbing"
            >
              <Polaroid photo={item.photo} caption={item.caption} captionPath={`story.items.${index}.caption`} photoPath={`story.items.${index}.photo`} />
            </motion.div>
          </AnimatePresence>
        </div>

        <CarouselArrow
          side="right"
          onClick={() => paginate(1)}
          className="absolute right-0 top-1/2 z-20 -translate-y-1/2"
        />
      </div>

      {/* dots */}
      <div className="mt-5 flex items-center justify-center gap-2">
        {items.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to photo ${i + 1}`}
            onClick={() => setState([i, i > index ? 1 : -1])}
            className="h-2 rounded-full transition-all"
            style={{
              width: i === index ? 18 : 8,
              background: i === index ? "var(--c-accent)" : "var(--c-muted)",
              opacity: i === index ? 1 : 0.5,
            }}
          />
        ))}
      </div>
    </section>
  );
}

/** A single polaroid frame — photo on top, handwritten caption beneath. */
function Polaroid({ photo, caption, captionPath, photoPath }: { photo?: string; caption: string; captionPath?: string; photoPath?: string }) {
  const [errored, setErrored] = useState(false);
  const showPhoto = photo && !errored;

  return (
    <div
      className="flex h-full w-full flex-col rounded-sm p-2.5 pb-3"
      style={{
        background: "#fffdf8",
        boxShadow: "0 16px 40px rgba(40,50,80,0.22)",
        border: "1px solid rgba(0,0,0,0.05)",
      }}
    >
      <div className="relative flex-1 overflow-hidden rounded-sm bg-[var(--c-grad-to)]">
        {showPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={caption}
            data-photo={photoPath}
            className="h-full w-full object-cover"
            draggable={false}
            onError={() => setErrored(true)}
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-2"
            style={{ color: "var(--c-secondary)" }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" opacity="0.6">
              <path
                d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            <span className="font-display text-[10px] uppercase tracking-[0.22em] opacity-80">
              Add your photo
            </span>
          </div>
        )}

        {/* postage stamp accent */}
        <span
          className="absolute right-2 top-2 rounded-[2px] px-1 text-[8px]"
          style={{
            background: "rgba(255,255,255,0.8)",
            color: "var(--c-accent)",
            border: "1px dashed var(--c-accent)",
          }}
        >
          ♥
        </span>
      </div>

      <p
        data-edit={captionPath}
        className="font-script mt-2.5 line-clamp-2 text-lg leading-tight"
        style={{ color: "var(--c-secondary)" }}
      >
        {caption}
      </p>
    </div>
  );
}

function CarouselArrow({
  side,
  onClick,
  className = "",
}: {
  side: "left" | "right";
  onClick: () => void;
  className?: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      aria-label={side === "left" ? "Previous" : "Next"}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${className}`}
      style={{
        background: "var(--c-surface)",
        color: "var(--c-primary)",
        boxShadow: "0 4px 12px rgba(40,50,80,0.14)",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d={side === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.button>
  );
}
