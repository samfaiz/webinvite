"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import type { InvitationContent, Theme } from "@/engine/types";
import { backgroundFor } from "@/engine/types";
import { MonogramCrest, Divider } from "@/components/Ornaments";
import { Movable } from "@/components/Movable";
import { usePreview } from "@/components/PreviewContext";
import { ScratchCard } from "./ScratchCard";
import { Countdown } from "./Countdown";

/**
 * Section 1 — the whole opening scene on one contained background:
 * monogram, couple names, "We Are Getting Married", the scratch→Save-the-Date
 * card, the countdown, and a closing line. Everything lives in one section so the
 * background image starts and finishes here (the next section has its own art).
 */
export function Hero({ content, theme }: { content: InvitationContent; theme: Theme }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "-6%"]);

  const { couple, hero, dateReveal, countdown } = content;
  const heroBg = backgroundFor(theme, "hero");
  const { compact, editing } = usePreview();
  const [dateRevealed, setDateRevealed] = useState(false);
  // hidden until the card is scratched; always shown in the editor (compact/editing)
  const showCountdown = dateRevealed || compact || editing;

  return (
    <section
      ref={ref}
      className={`relative flex ${compact ? "" : "min-h-svh"} flex-col items-center overflow-hidden px-6 py-6 text-center`}
    >
      {/* scenic gradient only when no uploaded hero art */}
      {!heroBg ? (
        <motion.div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            y: bgY,
            scale: 1.15,
            background:
              "linear-gradient(180deg, #f6f1e7 0%, #e7eef4 30%, #cdddea 60%, #b9cfe0 100%)",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 80% at 50% 0%, transparent 55%, rgba(255,255,255,0.5) 100%)",
            }}
          />
        </motion.div>
      ) : null}

      <Movable moveKey="hero.block" offset={content.offsets?.["hero.block"]} className="flex w-full flex-col items-center">
      <motion.div style={{ y: contentY }} className="flex w-full flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <MonogramCrest monogram={couple.monogram} logo={couple.logo} scale={couple.logoScale} size={66} />
        </motion.div>

        <motion.h1
          className="mt-3 flex flex-wrap items-baseline justify-center gap-x-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25 }}
        >
          <span data-edit="couple.partner1.name" className="font-script text-4xl sm:text-6xl" style={{ color: "var(--c-primary)" }}>
            {couple.partner1.name}
          </span>
          <span data-edit="couple.connector" className="font-display text-sm uppercase tracking-[0.25em]" style={{ color: "var(--c-accent)" }}>
            {couple.connector ?? "&"}
          </span>
          <span data-edit="couple.partner2.name" className="font-script text-4xl sm:text-6xl" style={{ color: "var(--c-primary)" }}>
            {couple.partner2.name}
          </span>
        </motion.h1>

        <motion.p
          data-edit="hero.marriageText"
          className="font-display mt-2 text-xs uppercase tracking-[0.34em] sm:text-sm"
          style={{ color: "var(--c-secondary)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.45 }}
        >
          {hero.marriageText}
        </motion.p>

        <Divider className="my-3" width={80} />

        <motion.div
          className="w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.6 }}
        >
          <ScratchCard
            teaser={dateReveal.teaser}
            revealLabel={dateReveal.revealLabel}
            eventDate={dateReveal.eventDate}
            location={dateReveal.location}
            primary={theme.colors.primary}
            secondary={theme.colors.secondary}
            accent={theme.colors.accent}
            onRevealed={() => setDateRevealed(true)}
          />
        </motion.div>

        {/* countdown — appears after the date is scratched */}
        <AnimatePresence>
          {showCountdown ? (
            <motion.div
              key="countdown"
              className="w-full"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <Countdown
                targetDate={countdown.targetDate}
                headline={countdown.headline}
                subtext={countdown.subtext}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
      </Movable>

      {/* spacer pushes the closing line to the bottom of the scene */}
      <div className="min-h-[2vh] flex-1" />

      {hero.closingLine ? (
        <p className="font-script mt-3 text-lg" style={{ color: "var(--c-secondary)" }}>
          <span style={{ color: "var(--c-accent)" }}>♥ </span>
          <span data-edit="hero.closingLine">{hero.closingLine}</span>
          <span style={{ color: "var(--c-accent)" }}> ♥</span>
        </p>
      ) : null}
    </section>
  );
}
