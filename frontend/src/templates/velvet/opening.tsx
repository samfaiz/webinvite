"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { keepTitles } from "@/lib/titles";
import { Icon } from "@/templates/garden/kit";
import { artPath } from "./parts";

/**
 * Velvet Lily's opening: a sealed burgundy envelope by candlelight with the
 * couple's initials pressed into the wax. Touch the seal (or wait) and it
 * lifts away, the envelope opens and its card rises; the view closes in on
 * the card, "Wedding Invitation" and the names are written on it, and the
 * invitation shows through.
 *
 * The film is generated (opening.mp4, from just after the flap has folded
 * back, so the seal's own stamp is never seen); the still before it has a
 * blank seal (opening-sealed.webp), and the card after it is the film's
 * last frame (opening-card.webp). All three share one 9:16 frame.
 */

const SEALED = artPath("opening-sealed.webp");
const FILM = artPath("opening.mp4");
const CARD = artPath("opening-card.webp");

/** Where the seal sits in the 9:16 frame, and where the risen card is. */
const SEAL = { x: 49.6, y: 56.5 };
const CARD_AT = "49% 54%";
const AUTO_OPEN = 7000;

const CREAM = "#f6ead9";
const CAPS = "var(--font-cinzel)";
const SCRIPT = "var(--font-parisienne)";
const SERIF = "var(--font-cormorant)";

type Stage = "sealed" | "film" | "closer" | "card" | "leaving";

export function VelvetOpening({
  initials,
  p1,
  p2,
  date,
  onOpen,
  onDone,
}: {
  initials: string;
  p1?: string;
  p2?: string;
  date?: string;
  /** the seal is touched (`withSound`) or the card opens by itself */
  onOpen: (withSound: boolean) => void;
  /** the opening is over and the invitation is showing */
  onDone: () => void;
}) {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState<Stage>("sealed");
  // drawn in place by the server (so the sealed envelope is the first thing
  // seen, before the page's script has loaded), then over the page in <body>
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const film = useRef<HTMLVideoElement | null>(null);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  // each step happens once, whichever signal arrives first
  const opened = useRef(false);
  const carded = useRef(false);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach((id) => window.clearTimeout(id));
  }, []);

  // nothing to scroll to until the invitation is showing
  useEffect(() => {
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = before;
    };
  }, []);

  const toCard = () => {
    if (carded.current) return;
    carded.current = true;
    setStage("closer");
    later(() => setStage("card"), reduce ? 0 : 900);
    later(() => setStage("leaving"), reduce ? 1600 : 900 + 3900);
    later(onDone, reduce ? 2200 : 900 + 3900 + 700);
  };

  const open = (withSound: boolean) => {
    if (opened.current) return;
    opened.current = true;
    onOpen(withSound);
    if (reduce) {
      carded.current = true;
      setStage("card");
      later(() => setStage("leaving"), 1600);
      later(onDone, 2200);
      return;
    }
    setStage("film");
    const v = film.current;
    if (v) {
      v.playbackRate = 1.15;
      v.play().catch(() => toCard());
    } else toCard();
    // if the film never says it has ended, carry on regardless
    later(() => toCard(), 6500);
  };
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  });
  useEffect(() => {
    if (stage !== "sealed") return;
    const t = window.setTimeout(() => openRef.current(false), AUTO_OPEN);
    return () => window.clearTimeout(t);
  }, [stage]);

  const fade = (on: boolean, ms = 450): CSSProperties => ({ opacity: on ? 1 : 0, transition: `opacity ${ms}ms ease` });
  const showFilm = stage === "film" || stage === "closer";
  const showCard = stage === "closer" || stage === "card" || stage === "leaving";
  const write = (delay: number) => ({
    initial: { clipPath: "inset(0 100% 0 0)", opacity: 0.4 },
    animate: { clipPath: "inset(0 0% 0 0)", opacity: 1 },
    transition: { duration: reduce ? 0 : 1.1, delay: reduce ? 0 : delay, ease: [0.45, 0, 0.25, 1] as const },
  });

  const tree = (
    <motion.div
      className="fixed inset-0 z-[90] flex justify-center"
      style={{ background: "#12040a" }}
      animate={{ opacity: stage === "leaving" ? 0 : 1 }}
      transition={{ duration: 0.7, ease: "easeInOut" }}
    >
      <div className="relative h-full overflow-hidden" style={{ width: "min(100%, 480px)", containerType: "size" }}>
        {/* one 9:16 frame, covering the screen, that every layer shares */}
        <div
          className="absolute left-1/2 top-1/2"
          style={{ width: "max(100cqw, 56.25cqh)", aspectRatio: "9 / 16", transform: "translate(-50%, -50%)", containerType: "inline-size" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SEALED} alt="" className="absolute inset-0 h-full w-full" style={fade(stage === "sealed", 500)} />
          <video
            ref={film}
            src={FILM}
            muted
            playsInline
            preload="auto"
            onEnded={toCard}
            className="absolute inset-0 h-full w-full"
            style={{
              ...fade(showFilm, 400),
              transform: stage === "closer" ? "scale(1.2)" : "scale(1)",
              transformOrigin: CARD_AT,
              transition: "opacity 400ms ease, transform 900ms cubic-bezier(.45,0,.25,1)",
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={CARD} alt="" className="absolute inset-0 h-full w-full" style={fade(showCard, 900)} />

          {/* the couple's initials pressed into the seal, until it lifts away */}
          <motion.button
            type="button"
            aria-label="Touch the seal to open the invitation"
            onClick={() => open(true)}
            className="absolute flex items-center justify-center rounded-full"
            style={{ left: `${SEAL.x}%`, top: `${SEAL.y}%`, width: "28cqw", height: "28cqw", marginLeft: "-14cqw", marginTop: "-14cqw" }}
            animate={stage === "sealed" ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.25 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            {stage === "sealed" ? (
              <motion.span
                aria-hidden
                className="absolute rounded-full"
                style={{ inset: "4cqw", boxShadow: `0 0 0 0.5cqw rgba(246,234,217,0.7)` }}
                animate={{ scale: [1, 1.4], opacity: [0.7, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              />
            ) : null}
            <span
              style={{
                fontFamily: SCRIPT,
                fontSize: "6cqw",
                lineHeight: 1,
                color: "#5a1520",
                letterSpacing: "-0.02em",
                wordSpacing: "-0.12em",
                whiteSpace: "nowrap",
                marginTop: "-1.2cqw",
                // pressed into the wax: light catching the lower lip, shade on the upper
                textShadow: "0 0.25cqw 0 rgba(255,196,196,0.38), 0 -0.2cqw 0 rgba(36,2,8,0.55)",
              }}
            >
              {initials}
            </span>
          </motion.button>

          {/* "Wedding Invitation" over the candlelight, and what to do */}
          <div className="pointer-events-none absolute inset-x-0 flex flex-col items-center" style={{ top: "15%", ...fade(stage === "sealed", 400) }}>
            <p style={{ fontFamily: CAPS, fontWeight: 600, fontSize: "4.6cqw", letterSpacing: "0.32em", color: CREAM, textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}>
              Wedding Invitation
            </p>
            <span aria-hidden style={{ width: "26cqw", height: 1, background: "rgba(246,234,217,0.7)", marginTop: "2.4cqw" }} />
          </div>
          <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: "72%", ...fade(stage === "sealed", 400) }}>
            <motion.span
              aria-hidden
              style={{ color: CREAM, display: "inline-flex", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.8))" }}
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            >
              <Icon name="hand" size={30} />
            </motion.span>
            <button
              type="button"
              onClick={() => open(true)}
              style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "max(19px, 5cqw)", color: CREAM, textShadow: "0 2px 10px rgba(0,0,0,0.9)", minHeight: 48, padding: "0 16px" }}
            >
              Tap the seal to open
            </button>
          </div>

          {/* written on the card */}
          <AnimatePresence>
            {stage === "card" || stage === "leaving" ? (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" style={{ padding: "0 12cqw", color: CREAM }}>
                <motion.p {...write(0)} style={{ fontFamily: CAPS, fontWeight: 600, fontSize: "4.4cqw", letterSpacing: "0.3em" }}>
                  Wedding Invitation
                </motion.p>
                <motion.span {...write(0.4)} aria-hidden style={{ display: "block", width: "30cqw", height: 1, background: "rgba(246,234,217,0.75)", margin: "4cqw 0 5cqw" }} />
                <motion.p {...write(0.7)} style={{ fontFamily: SCRIPT, fontSize: "14cqw", lineHeight: 1.05 }}>
                  {keepTitles(p1 ?? "")}
                </motion.p>
                <motion.p {...write(1.2)} style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "8cqw", lineHeight: 1.1, margin: "1cqw 0" }}>
                  &amp;
                </motion.p>
                <motion.p {...write(1.5)} style={{ fontFamily: SCRIPT, fontSize: "14cqw", lineHeight: 1.05 }}>
                  {keepTitles(p2 ?? "")}
                </motion.p>
                {date ? (
                  <motion.p {...write(2.1)} style={{ fontFamily: CAPS, fontSize: "4cqw", letterSpacing: "0.26em", marginTop: "6cqw" }}>
                    {date}
                  </motion.p>
                ) : null}
              </div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
  return mounted ? createPortal(tree, document.body) : tree;
}
