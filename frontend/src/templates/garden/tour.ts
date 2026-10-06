"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

/**
 * The invitation playing itself: page after page, every page to the end.
 *
 * Each section is a stop (a section taller than the screen is two: its top,
 * then its foot), held five seconds; the reply page is held longer. `start`
 * can hold the first stop for less, when the guest has already been looking
 * at it. A touch, a scroll or a key
 * pauses the tour at once — the guest is reading, or tapping something — and
 * after a while with no touching it picks up again from wherever they are.
 * It never resumes while they're typing, or while `hold()` says so (a photo
 * viewer open, say).
 */
export function useTour(
  root: RefObject<HTMLElement | null>,
  {
    dwell = 5000,
    longDwell = 9000,
    longIds = ["frame-rsvp"],
    idle = 8000,
    hold,
  }: { dwell?: number; longDwell?: number; longIds?: string[]; idle?: number; hold?: () => boolean } = {},
) {
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  // what the progress line shows: the stop being held and for how long
  const [stop, setStop] = useState<{ n: number; ms: number }>({ n: 0, ms: dwell });
  const holdRef = useRef(hold);
  useEffect(() => {
    holdRef.current = hold;
  });
  const firstRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!running) return;
    const el = root.current;
    if (!el) return;
    const stops: { el: HTMLElement; block: ScrollLogicalPosition; ms: number }[] = [];
    for (const s of Array.from(el.querySelectorAll<HTMLElement>(":scope > section"))) {
      if (s.offsetParent === null) continue; // hidden
      const ms = longIds.includes(s.id) ? longDwell : dwell;
      stops.push({ el: s, block: "start", ms });
      if (s.offsetHeight > window.innerHeight + 60) stops.push({ el: s, block: "end", ms });
    }
    if (!stops.length) return;

    // start from the stop nearest where the guest is now
    const nearest = () => {
      let best = 0;
      let d = Infinity;
      stops.forEach((st, k) => {
        const r = st.el.getBoundingClientRect();
        const off = st.block === "start" ? Math.abs(r.top) : Math.abs(r.bottom - window.innerHeight);
        if (off < d) {
          d = off;
          best = k;
        }
      });
      return best;
    };

    let i = nearest();
    let timer = 0;
    let wake = 0;
    let isPaused = false;
    const hold = (k: number, ms = stops[k].ms) => {
      setStop({ n: k, ms });
      timer = window.setTimeout(next, ms);
    };
    const next = () => {
      i += 1;
      if (i >= stops.length) {
        setRunning(false);
        return;
      }
      stops[i].el.scrollIntoView({ behavior: "smooth", block: stops[i].block });
      hold(i);
    };
    const resume = () => {
      const a = document.activeElement as HTMLElement | null;
      const typing = !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable);
      if (typing || holdRef.current?.()) {
        wake = window.setTimeout(resume, idle);
        return;
      }
      isPaused = false;
      setPaused(false);
      i = nearest();
      // they've been looking at this page all the while: move on soon
      hold(i, 2000);
    };
    const pause = () => {
      window.clearTimeout(timer);
      window.clearTimeout(wake);
      if (!isPaused) {
        isPaused = true;
        setPaused(true);
      }
      wake = window.setTimeout(resume, idle);
    };

    hold(i, firstRef.current);
    const kinds = ["pointerdown", "wheel", "touchstart", "keydown"] as const;
    // (the tap that started the tour is over before these begin to listen)
    const arm = window.setTimeout(() => kinds.forEach((k) => window.addEventListener(k, pause, { passive: true, capture: true })), 300);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(wake);
      window.clearTimeout(arm);
      kinds.forEach((k) => window.removeEventListener(k, pause, { capture: true }));
    };
    // the options are fixed per design; only starting and stopping matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  return {
    running,
    paused,
    stop,
    start: (firstMs?: number) => {
      firstRef.current = firstMs;
      setRunning(true);
    },
  };
}
