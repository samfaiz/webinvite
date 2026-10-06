"use client";

import { useEffect, useRef } from "react";

/**
 * The card begins by itself after `delay` ms, tap or no tap. A guest who
 * touches or scrolls first doesn't stop it: the tour simply waits for them
 * and carries on when they leave the screen alone.
 */
export function useAutoBegin(begun: boolean, begin: (withSound: boolean) => void, delay = 4000) {
  const ref = useRef(begin);
  useEffect(() => {
    ref.current = begin;
  });
  useEffect(() => {
    if (begun) return;
    const t = window.setTimeout(() => ref.current(false), delay);
    return () => window.clearTimeout(t);
  }, [begun, delay]);
}

/**
 * Phones only let a page make sound after the guest has touched it, so the
 * music starts on their first tap anywhere, not only on "Tap here to begin".
 * It tries once per tap until the music is actually playing, and gives up for
 * good once it has played, or once the guest has used the music button
 * themselves (so a pause from them is never undone by a later tap).
 */
export function useFirstTapMusic() {
  useEffect(() => {
    const kinds = ["click", "touchend", "pointerup", "keydown"] as const;
    let check = 0;
    const done = () => {
      window.clearTimeout(check);
      kinds.forEach((k) => window.removeEventListener(k, onTap, { capture: true }));
    };
    function onTap(e: Event) {
      const audio = document.querySelector("audio");
      const target = e.target as Element | null;
      if (!audio || audio.currentTime > 0 || !audio.paused || target?.closest?.('[aria-label="Play music"],[aria-label="Pause music"]')) {
        done();
        return;
      }
      window.dispatchEvent(new Event("invite:open"));
      window.clearTimeout(check);
      check = window.setTimeout(() => {
        if (!audio.paused) done();
      }, 800);
    }
    kinds.forEach((k) => window.addEventListener(k, onTap, { capture: true, passive: true }));
    return done;
  }, []);
}
