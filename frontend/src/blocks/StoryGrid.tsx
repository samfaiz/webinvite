"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { InvitationContent } from "@/engine/types";
import { Divider } from "@/components/Ornaments";
import { Reveal } from "@/components/Reveal";

/**
 * Story as a photo grid with a click-to-enlarge lightbox (alternative to the
 * Polaroid carousel). Used by the Royal Ornate / Minimal templates.
 */
export function StoryGrid({ content }: { content: InvitationContent }) {
  const items = content.story.items;
  const [open, setOpen] = useState<number | null>(null);

  if (!items.length) return null;

  return (
    <section className="px-6 py-20 text-center">
      <Reveal>
        <h2
          className="font-display text-2xl uppercase tracking-[0.12em] sm:text-3xl"
          style={{ color: "var(--c-primary)" }}
        >
          {content.story.heading}
        </h2>
        {content.story.subtext ? (
          <p className="font-body mt-2 text-base italic" style={{ color: "var(--c-secondary)" }}>
            {content.story.subtext}
          </p>
        ) : null}
        <Divider className="my-7" width={90} />
      </Reveal>

      <div className="mx-auto grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((item, i) => (
          <Reveal key={i} delay={(i % 3) * 0.06}>
            <motion.button
              onClick={() => setOpen(i)}
              whileHover={{ y: -4 }}
              className="group relative block aspect-[4/5] w-full overflow-hidden rounded-md"
              style={{ boxShadow: "0 10px 26px rgba(40,50,80,0.14)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.photo}
                alt={item.caption}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span
                className="absolute inset-x-0 bottom-0 p-2 text-left text-xs opacity-0 transition-opacity group-hover:opacity-100"
                style={{
                  background: "linear-gradient(0deg, rgba(0,0,0,0.55), transparent)",
                  color: "#fff",
                  fontFamily: "var(--f-script)",
                  fontSize: 16,
                }}
              >
                {item.caption}
              </span>
            </motion.button>
          </Reveal>
        ))}
      </div>

      {/* lightbox */}
      <AnimatePresence>
        {open !== null ? (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center p-6"
            style={{ background: "rgba(20,24,40,0.82)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
          >
            <motion.div
              className="max-w-sm"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={items[open].photo}
                alt={items[open].caption}
                className="w-full rounded-md"
              />
              <p className="font-script mt-3 text-center text-2xl text-white">
                {items[open].caption}
              </p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
