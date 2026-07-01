"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MonogramCrest, Divider } from "@/components/Ornaments";
import { BotanicalCorner } from "@/components/BotanicalCorner";
import { WaxHeartSeal } from "@/components/WaxHeartSeal";

/**
 * Full-screen portrait envelope intro. A scenic "letter" (the design's hero art)
 * peeks from a cream envelope with botanical corners, a laurel monogram crest and
 * a gold heart wax seal. Tapping lifts the letter out and fades the cover to
 * reveal the invitation beneath. Reduced-motion users just get a quick fade.
 */
export function EnvelopeIntro({
  monogram = "S | L",
  logo,
  logoScale,
  tagline,
  seal = "S L",
  sceneUrl,
  cornerUrl,
  onOpen,
  onOpening,
}: {
  monogram?: string;
  /** custom crest/logo image (data URL) — replaces the drawn monogram crest */
  logo?: string;
  /** crest/logo scale multiplier (default 1) */
  logoScale?: number;
  tagline?: string;
  seal?: string;
  /** the design's hero image — shown as the "letter" / scene */
  sceneUrl?: string;
  /** optional painted botanical-corner PNG (falls back to the gold SVG sprig) */
  cornerUrl?: string;
  onOpen: () => void;
  /** fired the instant the user taps, so the page can start revealing Section 1 */
  onOpening?: () => void;
}) {
  const [opening, setOpening] = useState(false);
  const reduce = useReducedMotion();

  const open = () => {
    if (opening) return;
    setOpening(true);
    onOpening?.();
    // fire inside the tap so music can start within the user gesture
    try {
      window.dispatchEvent(new Event("invite:open"));
    } catch {
      /* SSR / no window */
    }
    window.setTimeout(onOpen, reduce ? 450 : 1700);
  };

  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <motion.button
      type="button"
      onClick={open}
      aria-label="Open invitation"
      className="fixed inset-0 z-[60] block w-full overflow-hidden text-center"
      style={{
        background:
          "radial-gradient(125% 90% at 50% 14%, color-mix(in srgb, var(--c-surface) 94%, #ffffff), color-mix(in srgb, var(--c-grad-to) 26%, var(--c-surface)))",
      }}
      initial={{ opacity: 1 }}
      animate={{ opacity: opening ? 0 : 1, scale: opening && !reduce ? 1.06 : 1 }}
      transition={{
        opacity: { duration: reduce ? 0.4 : 1.15, delay: opening ? 0.45 : 0, ease: "easeInOut" },
        scale: { duration: 1.4, ease },
      }}
    >
      <div className="relative mx-auto h-full w-full max-w-[460px]">
        {/* botanical corners */}
        <motion.div
          className="pointer-events-none absolute left-0 top-0 z-10 w-[44%] max-w-[180px]"
          animate={{ opacity: opening ? 0 : 1 }}
          transition={{ duration: 0.4 }}
        >
          <BotanicalCorner imageUrl={cornerUrl} className="w-full" />
        </motion.div>
        <motion.div
          className="pointer-events-none absolute right-0 top-0 z-10 w-[36%] max-w-[150px]"
          animate={{ opacity: opening ? 0 : 1 }}
          transition={{ duration: 0.4 }}
        >
          <BotanicalCorner imageUrl={cornerUrl} flip className="w-full" />
        </motion.div>

        {/* laurel crest */}
        <motion.div
          className="absolute left-1/2 top-[7%] z-40 -translate-x-1/2"
          initial={{ opacity: 0, y: 14 }}
          animate={opening ? { opacity: 0, y: -8 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
        >
          <MonogramCrest monogram={monogram} logo={logo} scale={logoScale} size={118} />
          <div className="-mt-1 text-lg" style={{ color: "var(--c-accent)" }} aria-hidden>
            ♥
          </div>
        </motion.div>

        {/* the "letter" — scenic arched window that lifts out on open */}
        <motion.div
          className="absolute left-1/2 top-[25%] z-20 h-[40%] w-[78%] max-w-[330px] -translate-x-1/2 overflow-hidden rounded-t-[130px] rounded-b-lg"
          style={{
            boxShadow: "0 20px 40px rgba(40,50,80,0.22)",
            border: "1px solid color-mix(in srgb, var(--c-accent) 45%, transparent)",
            background: sceneUrl
              ? undefined
              : "linear-gradient(180deg,#eaf0f5 0%,#cdddea 55%,#b9cfe0 100%)",
          }}
          initial={{ opacity: 0, y: 24 }}
          animate={
            opening
              ? { y: reduce ? 0 : "-132%", scale: reduce ? 1 : 1.05, opacity: reduce ? 0 : 0.9 }
              : { opacity: 1, y: 0, scale: 1 }
          }
          transition={{ duration: opening ? 0.9 : 0.8, ease }}
        >
          {sceneUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sceneUrl} alt="" aria-hidden className="h-full w-full object-cover" />
          ) : null}
        </motion.div>

        {/* envelope front pocket — chevron top with the wax seal at its peak */}
        <motion.div
          className="absolute inset-x-0 bottom-0 z-30 h-[46%]"
          style={{
            clipPath: "polygon(0% 16%, 50% 0%, 100% 16%, 100% 100%, 0% 100%)",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--c-surface) 97%, #fff), color-mix(in srgb, var(--c-surface) 80%, var(--c-grad-to)))",
            boxShadow: "0 -8px 22px rgba(40,50,80,0.10)",
          }}
          animate={opening ? { y: reduce ? 0 : 70, opacity: reduce ? 0 : 0.96 } : { y: 0, opacity: 1 }}
          transition={{ duration: 0.9, ease }}
        />
        {/* a faint seam following the chevron, for definition */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[46%]"
          style={{
            clipPath: "polygon(0% 16%, 50% 0%, 100% 16%, 50% 1.5%, 0% 17.5%)",
            background: "color-mix(in srgb, var(--c-accent) 30%, transparent)",
          }}
        />

        {/* wax heart seal at the pocket peak */}
        <motion.div
          className="absolute left-1/2 top-[52%] z-40 -translate-x-1/2 -translate-y-1/2"
          animate={opening ? { opacity: 0, scale: 0.55, y: reduce ? 0 : -14 } : { opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.55, ease }}
        >
          <WaxHeartSeal initials={seal} size={96} />
        </motion.div>

        {/* tagline + tap-to-open at the bottom */}
        <motion.div
          className="absolute inset-x-0 bottom-[7%] z-40 px-8"
          animate={{ opacity: opening ? 0 : 1 }}
          transition={{ duration: 0.3 }}
        >
          {tagline ? (
            <p
              className="font-display text-[11px] uppercase tracking-[0.34em]"
              style={{ color: "var(--c-muted)" }}
            >
              {tagline}
            </p>
          ) : null}
          <motion.span
            className="font-display mt-3 inline-block rounded-full px-6 py-2 text-[11px] uppercase tracking-[0.28em]"
            style={{
              color: "var(--c-secondary)",
              border: "1px solid color-mix(in srgb, var(--c-accent) 45%, transparent)",
              background: "color-mix(in srgb, var(--c-surface) 70%, transparent)",
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Tap to open
          </motion.span>
          <Divider className="mt-4" width={60} />
        </motion.div>
      </div>
    </motion.button>
  );
}
