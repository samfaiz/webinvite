"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Plate, Zone, u } from "./stage";
import { Caps, DateCartouche, SCRIPT, SERIF, Script, SealMonogram } from "./kit";

/**
 * The Garden cover, and the opening of the invitation.
 *
 * A guest arrives at the envelope still sealed in the garden. Tapping it
 * plays the envelope opening — a video framed exactly like the cover plate,
 * which ends on it — and then the card is written in: "Wedding Day" drawn
 * left to right as if by pen, the names surfacing out of a soft blur, the date
 * opening out from the centre. Before that the card carries only their
 * monogram, and the seal their initials. Names can't be in the video — every couple's are different — so that
 * part is done here, on top of it.
 *
 * Until the opening video exists the cover opens straight into the writing.
 * The Studio, the gallery and thumbnails skip all of it (`gated` false).
 */

const A = (f: string) => `/assets/templates/garden/${f}`;

/** The sealed envelope as a still, and the video of it opening (first frame
 *  = the still, last frame = 01-cover.jpg). null until both are made. */
const OPENING: { still: string; video: string } | null = null;

type Stage = "sealed" | "opening" | "written";

const EASE = [0.45, 0, 0.25, 1] as const;

// one set of variants per element, so the card is written in order
const pen: Variants = {
  // swashes overhang the line, so the clip reaches past the box on every side
  hidden: { clipPath: "inset(-40% 112% -40% -12%)" },
  shown: { clipPath: "inset(-40% -12% -40% -12%)", transition: { duration: 1.9, ease: EASE, delay: 0.7 } },
};
const surface: Variants = {
  hidden: { opacity: 0, filter: "blur(6px)" },
  shown: { opacity: 1, filter: "blur(0px)", transition: { duration: 1.1, ease: "easeOut", delay: 1.9 } },
};
const unfold: Variants = {
  hidden: { opacity: 0, scaleX: 0.55 },
  shown: { opacity: 1, scaleX: 1, transition: { duration: 1, ease: EASE, delay: 2.6 } },
};
const arrive: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.9, delay: 3.6 } },
};

export function Cover({
  gated,
  names,
  initials,
  date,
  nav,
  onOpen,
}: {
  gated: boolean;
  names: string;
  initials: string;
  date: { iso?: string; fallback?: string };
  nav: [string, () => void][];
  onOpen: () => void;
}) {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState<Stage>(gated ? "sealed" : "written");
  const film = useRef<HTMLVideoElement | null>(null);
  const written = stage === "written";
  const letters = initials.split("·").filter(Boolean);
  // the Studio and thumbnails render the finished card with no animation
  const from = gated ? "hidden" : false;
  const to = written ? "shown" : "hidden";

  const write = () => {
    setStage("written");
    onOpen();
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
    v.play().catch(write);
  };

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

  const shadow: CSSProperties = { textShadow: "0 0 2px rgba(0,0,0,0.55), 0 1px 12px rgba(0,0,0,0.85)" };

  return (
    <Plate id="frame-couple" art={A("01-cover.jpg")} video={A("01-cover.mp4")} field="var(--g-dusk)">
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
            onEnded={write}
            className="absolute inset-0 h-full w-full"
            style={{ objectFit: "fill" }}
            exit={{ opacity: 0, transition: { duration: 0.8 } }}
          />
        ) : null}
      </AnimatePresence>

      <motion.div initial={from} animate={to} variants={arrive} className="contents">
        <Zone box={{ x0: 0.04, y0: 0.016, x1: 0.96, y1: 0.052 }} className="flex-row items-center justify-center">
          {nav.map(([label, act], i) => (
            <motion.span key={label} className="flex items-center" initial={from} animate={to} variants={arrive}>
              {i > 0 ? (
                <span aria-hidden style={{ color: "var(--g-paper)", opacity: 0.6, fontSize: u(13), margin: `0 ${u(24)}` }}>
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
                  fontSize: u(25),
                  fontWeight: 600,
                  letterSpacing: "0.2em",
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
            animate={written ? { opacity: [0, 0.9, 0] } : { opacity: 0 }}
            transition={{ duration: 2.4, ease: "easeInOut" }}
          />
        </Zone>
      ) : null}

      {/* On the sage face of the heart, one line per band. Measured: the lobes
          join at .65 where it is .31–.69 wide; .70 → .32–.68; .74 → .37–.63;
          then it closes fast. */}
      <Zone box={{ x0: 0.3, y0: 0.627, x1: 0.7, y1: 0.684 }} className="items-center justify-end">
        <motion.div initial={from} animate={to} variants={pen}>
          <Script size={74} color="#fbf8f0" className="whitespace-nowrap drop-shadow-[0_1px_2px_rgba(40,48,30,0.35)]">
            Wedding Day
          </Script>
        </motion.div>
      </Zone>
      <Zone box={{ x0: 0.33, y0: 0.686, x1: 0.67, y1: 0.712 }} className="items-center justify-center text-center">
        <motion.div initial={from} animate={to} variants={surface}>
          <Caps size={names.length > 18 ? 21 : 26} color="#fbf8f0" track={0.2} className="leading-tight">
            {names}
          </Caps>
        </motion.div>
      </Zone>
      <Zone box={{ x0: 0.35, y0: 0.714, x1: 0.65, y1: 0.742 }} className="items-center justify-center">
        <motion.div initial={from} animate={to} variants={unfold}>
          <DateCartouche {...date} color="#f6f2e6" size={19} />
        </motion.div>
      </Zone>

      {/* the wax seal, pressed with their initials — there from the start, it
          is the first thing on the envelope that is theirs */}
      {/* (the closed envelope in the film has its seal elsewhere, so over the
          film it waits for the cover's own seal) */}
      {OPENING && !written ? null : (
        <Zone box={{ x0: 0.475, y0: 0.7936, x1: 0.525, y1: 0.8215 }}>
          <SealMonogram initials={initials} />
        </Zone>
      )}

      {/* before it is opened, the card carries only their monogram */}
      <AnimatePresence>
        {!OPENING && stage === "sealed" && letters.length ? (
          <motion.div
            key="monogram"
            className="contents"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(5px)", transition: { duration: 0.6 } }}
          >
            <Zone box={{ x0: 0.3, y0: 0.618, x1: 0.7, y1: 0.75 }} className="flex-row items-center justify-center">
              <span style={{ fontFamily: SCRIPT, fontSize: u(150), lineHeight: 1, color: "#fbf8f0" }}>{letters[0]}</span>
              {letters[1] ? (
                <>
                  <span
                    style={{
                      fontFamily: SERIF,
                      fontStyle: "italic",
                      fontSize: u(58),
                      color: "rgba(251,248,240,0.8)",
                      margin: `0 ${u(22)} 0 ${u(12)}`,
                      alignSelf: "center",
                    }}
                  >
                    &amp;
                  </span>
                  <span style={{ fontFamily: SCRIPT, fontSize: u(150), lineHeight: 1, color: "#fbf8f0" }}>{letters[1]}</span>
                </>
              ) : null}
            </Zone>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* the invitation to open it */}
      <AnimatePresence>
        {stage === "sealed" ? (
          <motion.div
            key="hint"
            className="contents"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
          >
            <Zone box={{ x0: 0.2, y0: 0.9, x1: 0.8, y1: 0.955 }} className="items-center justify-center" style={shadow}>
              <motion.div
                className="flex flex-col items-center"
                animate={{ opacity: [0.55, 1, 0.55] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <span aria-hidden style={{ color: "var(--g-paper)", fontSize: u(15) }}>
                  ◆
                </span>
                <Caps size={27} color="var(--g-paper)" track={0.34} className="mt-[2%]">
                  Tap to open
                </Caps>
              </motion.div>
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
