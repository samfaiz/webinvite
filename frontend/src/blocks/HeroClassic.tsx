"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import type { InvitationContent, MotifPack, Theme } from "@/engine/types";
import { backgroundFor } from "@/engine/types";
import { MonogramCrest, Divider } from "@/components/Ornaments";
import { DecorativeFrame, type BorderVariant } from "@/components/DecorativeBorder";
import { usePreview } from "@/components/PreviewContext";

/**
 * Ornate, traditional hero (used by the Royal Ornate template). No scratch card —
 * the date is presented directly inside a decorative frame with a gold shimmer.
 */
export function HeroClassic({
  content,
  motif,
  theme,
}: {
  content: InvitationContent;
  motif: MotifPack;
  theme: Theme;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);
  const variant = (motif.decorativeBorders?.[0] as BorderVariant) ?? "floral-vine";
  const { couple, hero, dateReveal } = content;
  const heroBg = backgroundFor(theme, "hero");
  const { compact } = usePreview();

  return (
    <section
      ref={ref}
      className={`relative flex ${compact ? "py-16" : "min-h-svh py-20"} items-center justify-center overflow-hidden px-6`}
    >
      {!heroBg ? (
        <motion.div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            y,
            scale: 1.12,
            background:
              "radial-gradient(120% 90% at 50% 10%, var(--c-surface), var(--c-grad-from) 55%, var(--c-grad-to) 100%)",
          }}
        />
      ) : null}

      <motion.div
        className="relative w-full max-w-lg px-8 py-14 text-center"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: "color-mix(in srgb, var(--c-surface) 70%, transparent)",
          boxShadow: "0 20px 60px rgba(40,40,60,0.12)",
          outline: "1px solid color-mix(in srgb, var(--c-accent) 45%, transparent)",
          outlineOffset: -14,
        }}
      >
        <DecorativeFrame variant={variant} inset={6} />

        <div className="flex flex-col items-center">
          <MonogramCrest monogram={couple.monogram} size={110} />

          <h1 className="mt-6">
            <span className="font-script block text-5xl sm:text-7xl" style={{ color: "var(--c-primary)" }}>
              {couple.partner1.name}
            </span>
            <span
              className="font-display my-1 block text-xs uppercase tracking-[0.3em]"
              style={{ color: "var(--c-accent)" }}
            >
              {couple.connector ?? "and"}
            </span>
            <span className="font-script block text-5xl sm:text-7xl" style={{ color: "var(--c-primary)" }}>
              {couple.partner2.name}
            </span>
          </h1>

          <p
            className="font-display mt-5 text-sm uppercase tracking-[0.34em]"
            style={{ color: "var(--c-secondary)" }}
          >
            {hero.marriageText}
          </p>

          <Divider className="my-6" width={70} />

          {/* shimmering date (replaces the scratch card) */}
          <p
            className="font-script text-4xl"
            style={{
              backgroundImage:
                "linear-gradient(100deg, var(--c-primary) 30%, var(--c-accent) 50%, var(--c-primary) 70%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              animation: "shimmer 4s linear infinite",
            }}
          >
            {dateReveal.eventDate}
          </p>
          <p className="text-sm" style={{ color: "var(--c-muted)" }}>
            {dateReveal.location}
          </p>
        </div>
      </motion.div>
    </section>
  );
}
