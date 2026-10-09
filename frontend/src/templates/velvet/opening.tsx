"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { keepTitles } from "@/lib/titles";
import { Icon } from "@/templates/garden/kit";
import { artPath } from "./parts";

/**
 * Velvet Lily's opening: a sealed burgundy envelope by candlelight with the
 * couple's initials pressed into the wax. Touch it (anywhere), swipe, or
 * wait, and the seal lifts away, the envelope opens and its card rises with
 * "Wedding Invitation", the names and the date printed on it; the view
 * closes in on the card and the invitation shows through. A touch while it
 * plays goes straight to the invitation.
 *
 * The film is generated (opening.mp4, from just after the flap has folded
 * back, so the seal's own stamp is never seen); the still before it has a
 * blank seal (opening-sealed.webp). Both share one 9:16 frame. The writing
 * follows the card through the film by CARD_TRACK, measured from its frames,
 * and is hidden below the envelope's pocket until the card clears it.
 */

const SEALED = artPath("opening-sealed.webp");
const FILM = artPath("opening.mp4");

/** Where the seal sits in the 9:16 frame, in %. */
const SEAL = { x: 49.6, y: 56.5 };
const AUTO_OPEN = 7000;

/**
 * The card in the film, by its own clock (seconds): its left, top and right
 * edges, and the envelope pocket's edge (at the card's sides, and at the
 * middle of its V) below which it can't be seen, all in % of the frame.
 * The card's height is 0.86 × its width (in those units).
 */
const CARD_TRACK: [t: number, l: number, top: number, r: number, side: number, mid: number][] = [
  [1.0, 19.0, 43.0, 79.6, 49.0, 54.0],
  [1.25, 18.6, 37.4, 79.9, 50.5, 57.0],
  [1.5, 18.0, 31.6, 80.2, 50.5, 59.5],
  [1.75, 17.4, 26.5, 81.4, 53.0, 62.0],
  [2.0, 17.1, 22.4, 82.0, 54.0, 63.8],
  [2.25, 16.2, 21.0, 82.9, 55.0, 65.9],
  [2.5, 15.6, 20.8, 84.1, 57.5, 66.9],
  [2.75, 13.8, 20.1, 85.0, 55.0, 68.0],
  [3.0, 11.7, 18.9, 87.4, 69.5, 70.5],
  [3.25, 9.9, 17.6, 89.2, 72.0, 72.0],
  [3.5, 8.4, 16.2, 91.9, 100, 100],
  [3.75, 6.6, 15.0, 93.4, 100, 100],
];
const CARD_H = 0.86;

function cardAt(t: number) {
  const k = CARD_TRACK;
  if (t <= k[0][0]) return k[0];
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i][0]) {
      const a = k[i - 1];
      const b = k[i];
      const f = (t - a[0]) / (b[0] - a[0]);
      return a.map((v, j) => v + (b[j] - v) * f) as (typeof k)[number];
    }
  }
  return k[k.length - 1];
}

const CREAM = "#f4e6d4";
const CAPS = "var(--font-cinzel)";
const SCRIPT = "var(--font-parisienne)";
const SERIF = "var(--font-cormorant)";

type Stage = "sealed" | "film" | "closer" | "leaving";

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
  /** opened by a touch (`withSound`) or by itself */
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
  const writing = useRef<HTMLDivElement | null>(null);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  // each step happens once, whichever signal arrives first
  const opened = useRef(false);
  const openedAt = useRef(0);
  const closing = useRef(false);
  const finished = useRef(false);

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

  const finish = (fadeMs = 700) => {
    if (finished.current) return;
    finished.current = true;
    setStage("leaving");
    later(onDone, fadeMs);
  };

  /** the film has ended: close in on the card a little, let it be read, go */
  const closeIn = () => {
    if (closing.current) return;
    closing.current = true;
    setStage("closer");
    later(() => finish(), 3200);
  };

  const open = (withSound: boolean) => {
    if (opened.current) return;
    opened.current = true;
    openedAt.current = Date.now();
    onOpen(withSound);
    if (reduce) {
      later(() => finish(400), 300);
      return;
    }
    setStage("film");
    const v = film.current;
    if (v) {
      v.playbackRate = 1.15;
      v.play().catch(() => finish(500));
    } else finish(500);
    // if the film never says it has ended, carry on regardless
    later(closeIn, 6000);
  };

  /** any touch: opens the envelope, or (a moment after it opened) skips ahead */
  const touch = () => {
    if (!opened.current) open(true);
    else if (Date.now() - openedAt.current > 700) finish(450);
  };

  const touchRef = useRef(touch);
  const openRef = useRef(open);
  useEffect(() => {
    touchRef.current = touch;
    openRef.current = open;
  });
  useEffect(() => {
    if (stage !== "sealed") return;
    const t = window.setTimeout(() => openRef.current(false), AUTO_OPEN);
    return () => window.clearTimeout(t);
  }, [stage]);

  // the writing rides on the card through the film, and is cut off where the
  // envelope's pocket hides the card
  useEffect(() => {
    if (stage !== "film") return;
    let raf = 0;
    const tick = () => {
      const v = film.current;
      const el = writing.current;
      if (v && el) {
        const [, l, top, r, side, mid] = cardAt(v.currentTime);
        const w = r - l;
        el.style.left = `${l}%`;
        el.style.top = `${top}%`;
        el.style.width = `${w}%`;
        el.style.height = `${w * CARD_H}%`;
        const clip = `polygon(-50% -50%, 150% -50%, 150% ${side - 1}%, ${r}% ${side - 1}%, 50% ${mid - 1}%, ${l}% ${side - 1}%, -50% ${side - 1}%)`;
        // the clip is in the frame's terms; the writing's box is the card's, so
        // put the clip on the layer that covers the whole frame
        const layer = el.parentElement as HTMLElement;
        layer.style.clipPath = clip;
        layer.style.opacity = v.currentTime > 1.05 ? "1" : "0";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  const tree = (
    <motion.div
      className="fixed inset-0 z-[90] flex justify-center"
      style={{ background: "#12040a", touchAction: "none" }}
      animate={{ opacity: stage === "leaving" ? 0 : 1 }}
      transition={{ duration: stage === "leaving" ? 0.6 : 0.3, ease: "easeInOut" }}
      onClick={() => touchRef.current()}
      onTouchMove={() => {
        if (!opened.current) openRef.current(true);
      }}
      onWheel={() => {
        if (!opened.current) openRef.current(true);
      }}
    >
      <div className="relative h-full overflow-hidden" style={{ width: "min(100%, 480px)", containerType: "size" }}>
        {/* one 9:16 frame, covering the screen, that every layer shares */}
        <div
          className="absolute left-1/2 top-1/2"
          style={{ width: "max(100cqw, 56.25cqh)", aspectRatio: "9 / 16", transform: "translate(-50%, -50%)", containerType: "inline-size" }}
        >
          {/* the film, and the card's writing with it; at its end both close in */}
          <div
            className="absolute inset-0"
            style={{
              transform: stage === "closer" || stage === "leaving" ? "scale(1.07)" : "none",
              transformOrigin: "50% 52%",
              transition: "transform 1600ms cubic-bezier(.45,0,.25,1)",
            }}
          >
            <video
              ref={film}
              src={FILM}
              muted
              playsInline
              preload="auto"
              onEnded={closeIn}
              className="absolute inset-0 h-full w-full"
              style={{ opacity: stage === "sealed" ? 0 : 1, transition: "opacity 350ms ease" }}
            />
            <div className="pointer-events-none absolute inset-0" style={{ opacity: 0, transition: "opacity 400ms ease" }}>
              <div
                ref={writing}
                className="absolute flex flex-col items-center text-center"
                style={{ left: "6.6%", top: "15%", width: "86.8%", height: "74.6%", containerType: "inline-size", color: CREAM }}
              >
                <div className="flex w-full flex-col items-center" style={{ marginTop: "19cqw" }}>
                  <p style={{ fontFamily: CAPS, fontWeight: 600, fontSize: "5cqw", letterSpacing: "0.28em", lineHeight: 1.2 }}>Wedding Invitation</p>
                  <span aria-hidden style={{ display: "block", width: "34cqw", height: 1, background: "rgba(244,230,212,0.75)", margin: "4cqw 0 6cqw" }} />
                  <p style={{ fontFamily: SCRIPT, fontSize: "15cqw", lineHeight: 1.05, whiteSpace: "nowrap" }}>{keepTitles(p1 ?? "")}</p>
                  <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "9cqw", lineHeight: 1.1, margin: "1cqw 0" }}>&amp;</p>
                  <p style={{ fontFamily: SCRIPT, fontSize: "15cqw", lineHeight: 1.05, whiteSpace: "nowrap" }}>{keepTitles(p2 ?? "")}</p>
                  {date ? (
                    <p style={{ fontFamily: CAPS, fontSize: "4.6cqw", letterSpacing: "0.24em", marginTop: "8cqw" }}>{date}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* the sealed envelope, until it's opened */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={SEALED}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full"
            style={{ opacity: stage === "sealed" ? 1 : 0, transition: "opacity 450ms ease" }}
          />

          {/* the couple's initials pressed into the seal, until it lifts away */}
          <motion.button
            type="button"
            aria-label="Touch the seal to open the invitation"
            onClick={(e) => {
              e.stopPropagation();
              touchRef.current();
            }}
            className="absolute flex items-center justify-center rounded-full"
            // once it has lifted away it mustn't catch the taps meant for skipping
            style={{ left: `${SEAL.x}%`, top: `${SEAL.y}%`, width: "28cqw", height: "28cqw", marginLeft: "-14cqw", marginTop: "-14cqw", pointerEvents: stage === "sealed" ? "auto" : "none" }}
            animate={stage === "sealed" ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.25 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            {stage === "sealed" ? (
              <motion.span
                aria-hidden
                className="absolute rounded-full"
                style={{ inset: "4cqw", boxShadow: "0 0 0 0.5cqw rgba(246,234,217,0.7)" }}
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
          <div
            className="pointer-events-none absolute inset-x-0 flex flex-col items-center"
            style={{ top: "15%", opacity: stage === "sealed" ? 1 : 0, transition: "opacity 400ms ease" }}
          >
            <p style={{ fontFamily: CAPS, fontWeight: 600, fontSize: "4.6cqw", letterSpacing: "0.32em", color: CREAM, textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}>
              Wedding Invitation
            </p>
            <span aria-hidden style={{ width: "26cqw", height: 1, background: "rgba(246,234,217,0.7)", marginTop: "2.4cqw" }} />
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 flex flex-col items-center"
            style={{ top: "72%", opacity: stage === "sealed" ? 1 : 0, transition: "opacity 400ms ease" }}
          >
            <motion.span
              aria-hidden
              style={{ color: CREAM, display: "inline-flex", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.8))" }}
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            >
              <Icon name="hand" size={30} />
            </motion.span>
            <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "max(19px, 5cqw)", color: CREAM, textShadow: "0 2px 10px rgba(0,0,0,0.9)", padding: "8px 16px" }}>
              Tap the seal to open
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
  return mounted ? createPortal(tree, document.body) : tree;
}

