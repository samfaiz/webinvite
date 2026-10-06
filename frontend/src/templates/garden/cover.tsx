"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Plate, Zone, u } from "./stage";
import { Caps, DateCartouche, Icon, SCRIPT, SERIF, SealMonogram } from "./kit";
import { COVER_HEART, heartAt } from "./opening";

/**
 * The Garden cover, and the opening of the invitation.
 *
 * A guest arrives at the envelope still sealed in the garden. Tapping it
 * plays the envelope opening, and as the heart rises out of the envelope
 * their initials are written onto it as if by pen, the names surfacing and
 * the date opening out — the writing rides on the heart, following its
 * measured path through the film (opening.ts), and grows with it into the
 * cover's own heart as the film dissolves. The seal carries their initials
 * throughout. Names can't be in the video — every couple's are different —
 * so that part is done here, on top of it.
 *
 * Until the opening video exists the cover opens straight into the writing.
 * The Studio, the gallery and thumbnails skip all of it (`gated` false).
 */

const A = (f: string) => `/assets/templates/garden/${f}`;

/** The sealed envelope as a still, and the film of it opening. The film's
 *  first frame is the still; it ends on the cover's own garden and envelope,
 *  with the heart a little smaller than the plate's, so it hands over with a
 *  slow crossfade that reads as the card settling. The seal sits exactly where
 *  the cover's does throughout, so their initials can be on it from the start. */
const OPENING: { still: string; video: string } | null = { still: A("00-sealed.jpg"), video: A("00-opening.mp4") };

/** How long the film takes to dissolve into the cover, in seconds. */
const HANDOFF = 1.0;

/** The film's first seconds are the envelope sitting still: start a little
 *  in, and play it a little quicker, so something is happening at once. */
const FILM_START = 1.8;
const FILM_RATE = 1.35;
/** film time at which the heart is out far enough to write on */
const INK_AT = 5.25;
/** film time at which the heart has settled: hand over to the cover then,
 *  rather than sit through the film's still last seconds */
const HANDOFF_AT = 7.6;

/** If nobody taps, the envelope opens by itself after this long (ms), so a
 *  guest who doesn't think to tap still sees it. */
const AUTO_OPEN = 5000;

type Stage = "sealed" | "opening" | "written";

const EASE = [0.45, 0, 0.25, 1] as const;

// one set of variants per element, so the card is written in order, timed
// from the moment the writing starts ("ink")
const pen: Variants = {
  // swashes overhang the line, so the clip reaches past the box on every side
  hidden: { clipPath: "inset(-40% 112% -40% -12%)" },
  shown: { clipPath: "inset(-40% -12% -40% -12%)", transition: { duration: 1.6, ease: EASE, delay: 0.1 } },
};
const surface: Variants = {
  hidden: { opacity: 0, filter: "blur(6px)" },
  shown: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.9, ease: "easeOut", delay: 1.1 } },
};
const unfold: Variants = {
  hidden: { opacity: 0, scaleX: 0.55 },
  shown: { opacity: 1, scaleX: 1, transition: { duration: 0.8, ease: EASE, delay: 1.7 } },
};
const arrive: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.9, delay: 2.6 } },
};

/** Their initials as the card's title: two script capitals around a small
 *  italic ampersand. */
function Monogram({ letters, size }: { letters: string[]; size: number }) {
  const cap: CSSProperties = { fontFamily: SCRIPT, fontSize: u(size), lineHeight: 1.05 };
  return (
    <span
      className="flex items-center whitespace-nowrap drop-shadow-[0_1px_2px_rgba(40,48,30,0.35)]"
      style={{ color: "#fbf8f0" }}
    >
      <span style={cap}>{letters[0]}</span>
      {letters[1] ? (
        <>
          <span
            style={{
              fontFamily: SERIF,
              fontStyle: "italic",
              fontSize: u(size * 0.4),
              opacity: 0.85,
              margin: `0 ${u(size * 0.22)} 0 ${u(size * 0.12)}`,
            }}
          >
            &amp;
          </span>
          <span style={cap}>{letters[1]}</span>
        </>
      ) : null}
    </span>
  );
}

export function Cover({
  gated,
  names,
  letters,
  seal,
  date,
  nav,
  onOpen,
  onDone,
}: {
  gated: boolean;
  names: string;
  /** the couple's initials, written on the card as it is revealed */
  letters: string[];
  /** what is pressed into the wax seal */
  seal: string;
  date: { iso?: string; fallback?: string };
  nav: [string, () => void][];
  onOpen: () => void;
  /** the card has been written: time to take the guest onwards */
  onDone?: () => void;
}) {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState<Stage>(gated ? "sealed" : "written");
  const film = useRef<HTMLVideoElement | null>(null);
  // the writing on the heart: moved and scaled to follow the film's heart
  const heart = useRef<HTMLDivElement | null>(null);
  const written = stage === "written";
  // the writing starts as the heart comes out of the envelope, before the
  // film is over; without a film, as soon as the envelope is opened
  const [ink, setInk] = useState(!gated);
  // the Studio and thumbnails render the finished card with no animation
  const from = gated ? "hidden" : false;
  const to = ink ? "shown" : "hidden";

  const write = () => {
    setInk(true);
    setStage("written");
    onOpen();
    // the writing grows with the heart into the cover's own heart
    const g = heart.current;
    if (g) {
      g.style.transition = `transform ${HANDOFF}s ease-in-out`;
      g.style.transform = "none";
    }
    // give them a moment with the finished card before moving on
    if (onDone) window.setTimeout(onDone, 4200);
  };

  const open = () => {
    if (stage === "opening") return write(); // a second tap skips the film
    if (stage !== "sealed") return;
    // the invitation's music starts inside the guest's tap, so it is allowed to
    try {
      window.dispatchEvent(new Event("invite:open"));
    } catch {
      /* no window */
    }
    const v = film.current;
    if (!OPENING || !v || reduce) return write();
    setStage("opening");
    try {
      v.currentTime = FILM_START;
      v.playbackRate = FILM_RATE;
    } catch {
      /* not seekable yet: it plays from the start, which is fine */
    }
    v.play().catch(() => write());
  };

  // while the film plays: keep the writing on the heart, start the pen when
  // the heart is out, and hand over once it has settled
  const writeRef = useRef(write);
  useEffect(() => {
    writeRef.current = write;
  });
  useEffect(() => {
    if (stage !== "opening") return;
    const v = film.current;
    if (!v) return;
    let raf = 0;
    let inked = false;
    const tick = () => {
      const t = v.currentTime;
      const { dy, s } = heartAt(t);
      if (heart.current) heart.current.style.transform = `translateY(${(dy * 100).toFixed(3)}%) scale(${s.toFixed(4)})`;
      if (!inked && t >= INK_AT) {
        inked = true;
        setInk(true);
      }
      if (t >= HANDOFF_AT) return writeRef.current();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  // open by itself if nobody taps (the film is muted, so it may autoplay)
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  });
  useEffect(() => {
    if (stage !== "sealed") return;
    const t = window.setTimeout(() => openRef.current(), AUTO_OPEN);
    return () => window.clearTimeout(t);
  }, [stage]);

  // nothing below the cover to scroll to until it has been opened
  useEffect(() => {
    if (written) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = before;
    };
  }, [written]);

  return (
    <Plate
      id="frame-couple"
      art={A("01-cover.jpg")}
      video={written || !OPENING ? A("01-cover.mp4") : undefined}
      field="var(--g-dusk)"
      fill
    >
      {/* the sealed envelope and its opening, laid over the living cover and
          dissolved away once the film reaches the cover's own frame */}
      <AnimatePresence>
        {OPENING && !written ? (
          <motion.video
            key="opening"
            ref={film}
            src={OPENING.video}
            poster={OPENING.still}
            muted
            playsInline
            preload="auto"
            aria-hidden
            onEnded={() => write()}
            className="absolute inset-0 h-full w-full"
            style={{ objectFit: "fill" }}
            exit={{ opacity: 0, transition: { duration: HANDOFF, ease: "easeInOut" } }}
          />
        ) : null}
      </AnimatePresence>

      <motion.div initial={from} animate={to} variants={arrive} className="contents">
        {/* (a filled plate loses up to ~9% each side on a tall phone) */}
        <Zone box={{ x0: 0.12, y0: 0.018, x1: 0.88, y1: 0.056 }} className="flex-row items-center justify-center">
          {nav.map(([label, act], i) => (
            <motion.span key={label} className="flex items-center" initial={from} animate={to} variants={arrive}>
              {i > 0 ? (
                <span aria-hidden style={{ color: "var(--g-paper)", opacity: 0.6, fontSize: u(13), margin: `0 ${u(18)}` }}>
                  ◆
                </span>
              ) : null}
              <button
                type="button"
                onClick={act}
                tabIndex={written ? 0 : -1}
                className="uppercase"
                style={{
                  fontFamily: SERIF,
                  fontSize: u(28),
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  color: "var(--g-paper)",
                  textShadow: "0 1px 8px rgba(0,0,0,0.6)",
                }}
              >
                {label}
              </button>
            </motion.span>
          ))}
        </Zone>
      </motion.div>

      {/* light catching the card as it is written */}
      {gated ? (
        <Zone box={{ x0: 0.27, y0: 0.6, x1: 0.73, y1: 0.78 }} className="pointer-events-none">
          <motion.span
            aria-hidden
            className="absolute inset-0"
            style={{ background: "radial-gradient(closest-side, rgba(255,250,232,0.55), transparent)" }}
            initial={{ opacity: 0 }}
            animate={ink ? { opacity: [0, 0.9, 0] } : { opacity: 0 }}
            transition={{ duration: 2.4, ease: "easeInOut" }}
          />
        </Zone>
      ) : null}

      {/* On the sage face of the heart, one line per band. Measured: the
          lobes join at .65 where it is .31–.69 wide (above that a cream flap
          tip divides them); .70 → .32–.68; .74 → .37–.63; then it closes.
          All three ride together on the film's heart while it plays,
          scaled about the cover heart's centre. */}
      <div
        ref={heart}
        className="pointer-events-none absolute inset-0"
        style={{ transformOrigin: `50% ${(COVER_HEART.cy * 100).toFixed(2)}%` }}
      >
      <Zone box={{ x0: 0.3, y0: 0.632, x1: 0.7, y1: 0.697 }} className="items-center justify-end">
        <motion.div initial={from} animate={to} variants={pen}>
          <Monogram letters={letters} size={104} />
        </motion.div>
      </Zone>
      <Zone box={{ x0: 0.33, y0: 0.697, x1: 0.67, y1: 0.72 }} className="items-center justify-center text-center">
        <motion.div initial={from} animate={to} variants={surface}>
          <Caps size={names.length > 18 ? 22 : 27} color="#fbf8f0" track={0.16} className="leading-tight">
            {names}
          </Caps>
        </motion.div>
      </Zone>
      <Zone box={{ x0: 0.35, y0: 0.721, x1: 0.65, y1: 0.748 }} className="items-center justify-center">
        <motion.div initial={from} animate={to} variants={unfold}>
          <DateCartouche {...date} color="#f6f2e6" size={20} />
        </motion.div>
      </Zone>
      </div>

      {/* the wax seal, pressed with their initials — there from the start, it
          is the first thing on the envelope that is theirs */}
      {/* (the closed envelope in the film has its seal elsewhere, so over the
          film it waits for the cover's own seal) */}
      <Zone box={{ x0: 0.475, y0: 0.7936, x1: 0.525, y1: 0.8215 }} className="z-[2]">
        <SealMonogram initials={seal} />
      </Zone>

      {/* the invitation to open it: the envelope breathes with a soft light,
          and a plain, large "Tap here to open" sits right under it */}
      <AnimatePresence>
        {stage === "sealed" ? (
          <motion.div
            key="hint"
            className="contents"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
          >
            <Zone
              box={OPENING ? { x0: 0.18, y0: 0.63, x1: 0.82, y1: 0.95 } : { x0: 0.2, y0: 0.55, x1: 0.8, y1: 0.87 }}
              className="pointer-events-none"
            >
              <motion.span
                aria-hidden
                className="absolute inset-0"
                style={{ background: "radial-gradient(closest-side, rgba(255,246,214,0.42), transparent)" }}
                animate={{ opacity: [0.25, 0.85, 0.25], scale: [0.96, 1.04, 0.96] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              />
            </Zone>
            <Zone box={{ x0: 0.14, y0: 0.9, x1: 0.86, y1: 0.97 }} className="items-center justify-center">
              <motion.span
                className="inline-flex items-center"
                style={{
                  gap: 10,
                  padding: "12px 22px",
                  borderRadius: 999,
                  background: "rgba(30,26,14,0.55)",
                  border: "1px solid rgba(248,243,230,0.55)",
                  color: "#fbf8f0",
                  fontFamily: SERIF,
                  fontSize: 19,
                  fontWeight: 600,
                  backdropFilter: "blur(3px)",
                  WebkitBackdropFilter: "blur(3px)",
                }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              >
                <Icon name="hand" size={22} />
                Tap here to open
              </motion.span>
            </Zone>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* the whole plate is the button until it has been opened */}
      {written ? null : (
        <button
          type="button"
          onClick={open}
          aria-label={stage === "opening" ? "Skip" : "Open the invitation"}
          className="absolute inset-0 z-10 cursor-pointer"
        />
      )}
    </Plate>
  );
}
