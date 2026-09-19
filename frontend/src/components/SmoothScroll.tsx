"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * The live Lenis instance, or null when smooth scroll is off (reduced motion,
 * or a snap-scrolling preview). Anything that scrolls programmatically must go
 * through this — Lenis owns the window scroll position while it is running, so
 * a native window.scrollTo fights its rAF loop and stutters.
 */
let instance: Lenis | null = null;
export const getLenis = () => instance;

/**
 * Lenis smooth-scroll inertia for the polished, weighty feel from the reference.
 * Disabled automatically when the user prefers reduced motion.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      touchMultiplier: 1.5,
    });
    instance = lenis;

    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      if (instance === lenis) instance = null;
    };
  }, []);

  return null;
}
