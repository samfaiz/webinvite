"use client";

import { motion } from "framer-motion";
import type { InvitationContent } from "@/engine/types";
import { usePreview } from "@/components/PreviewContext";
import { MonogramCrest } from "@/components/Ornaments";

/**
 * Clean, contemporary hero (used by the Minimal Modern template). Sans display
 * type, generous whitespace, quiet fade-in. No envelope/scratch — date shown plainly.
 */
export function HeroMinimal({ content }: { content: InvitationContent }) {
  const { couple, hero, dateReveal } = content;
  const { compact } = usePreview();
  return (
    <section className={`relative flex ${compact ? "py-16" : "min-h-svh"} flex-col items-center justify-center px-6 text-center`}>
      {/* a custom crest/logo is honoured here; the default minimal hero stays crest-free */}
      {couple.logo ? (
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <MonogramCrest monogram={couple.monogram} logo={couple.logo} scale={couple.logoScale} size={72} />
        </motion.div>
      ) : null}

      <motion.p
        className="text-xs uppercase tracking-[0.5em]"
        style={{ color: "var(--c-accent)", fontFamily: "var(--font-jost)" }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {hero.marriageText}
      </motion.p>

      <motion.h1
        className="mt-8 leading-[1.05]"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.15 }}
        style={{ fontFamily: "var(--font-jost)", fontWeight: 300, color: "var(--c-primary)" }}
      >
        <span className="block text-5xl sm:text-8xl">{couple.partner1.name}</span>
        <span className="my-2 block text-2xl" style={{ color: "var(--c-accent)" }}>
          {couple.connector ?? "&"}
        </span>
        <span className="block text-5xl sm:text-8xl">{couple.partner2.name}</span>
      </motion.h1>

      <motion.div
        className="mt-12 flex items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.4 }}
      >
        <span style={{ height: 1, width: 40, background: "var(--c-accent)" }} />
        <p
          className="text-sm uppercase tracking-[0.3em]"
          style={{ color: "var(--c-secondary)", fontFamily: "var(--font-jost)" }}
        >
          {dateReveal.eventDate} · {dateReveal.location}
        </p>
        <span style={{ height: 1, width: 40, background: "var(--c-accent)" }} />
      </motion.div>

      <motion.div
        className="mt-16"
        style={{ color: "var(--c-muted)" }}
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        aria-hidden
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>
    </section>
  );
}
