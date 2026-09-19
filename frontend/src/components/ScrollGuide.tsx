"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePreview } from "./PreviewContext";
import { getLenis } from "./SmoothScroll";

/** How long after the invitation opens before the one-time nudge. */
const NUDGE_DELAY = 4000;
/** Treated as "we are on this section" when within this many px of its top. */
const SNAP_TOLERANCE = 24;

/**
 * Scroll affordances for a guest reading an invitation:
 *
 *  - a single gentle glide to the second section, 4s after the envelope opens,
 *    so nobody sits on the cover not realising there is more below;
 *  - a bottom-right button that advances one section per tap, turning into
 *    "back to top" on the last one.
 *
 * The nudge is a hint, not a ride: any deliberate input (wheel, touch, key,
 * or the button) cancels it permanently for that visit. It never fires for
 * someone who has already started scrolling, nor under reduced motion.
 *
 * Sections are found by the `snap-start` class every template puts on its
 * section wrappers, so this works for the built-in templates and the custom
 * builder alike without either knowing about it.
 */
export function ScrollGuide({
  active,
  hasMusic = false,
}: {
  /** true once the envelope is open — the 4s timer starts from here */
  active: boolean;
  /** shift up to clear the floating music button, which owns the same corner */
  hasMusic?: boolean;
}) {
  const { compact, editing } = usePreview();
  // purely derived — the button is shown whenever the invitation is open and
  // we are not inside the editor's compact preview
  const visible = active && !compact && !editing;
  const [atEnd, setAtEnd] = useState(false);
  const takenOver = useRef(false);
  const scroller = useRef<HTMLElement | Window | null>(null);

  /**
   * The scrolling box: a snap container if the template made one, else the window.
   *
   * Only a found element is cached. The window fallback deliberately is not:
   * at mount the container is often not yet taller than the viewport (images
   * and fonts still loading), and caching window there would permanently point
   * every scroll at the wrong box — window.scrollTo is a no-op when an inner
   * div owns the scrolling, so the button and the nudge would silently do
   * nothing for the rest of the visit.
   */
  const getScroller = useCallback((): HTMLElement | Window => {
    const cached = scroller.current;
    if (cached && cached !== window) {
      const el = cached as HTMLElement;
      if (el.isConnected && el.scrollHeight > el.clientHeight + 4) return el;
      scroller.current = null;
    }
    let node: HTMLElement | null = document.querySelector("main");
    while (node) {
      const oy = getComputedStyle(node).overflowY;
      if ((oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight + 4) {
        scroller.current = node;
        return node;
      }
      node = node.parentElement;
    }
    return window;
  }, []);

  const sections = useCallback(
    () => Array.from(document.querySelectorAll<HTMLElement>("main .snap-start")),
    [],
  );

  const scrollTop = useCallback((s: HTMLElement | Window) =>
    s === window ? window.scrollY : (s as HTMLElement).scrollTop, []);

  /** Offset of a section within the scrolling box. */
  const offsetOf = useCallback((el: HTMLElement, s: HTMLElement | Window) => {
    if (s === window) return el.getBoundingClientRect().top + window.scrollY;
    const box = s as HTMLElement;
    return el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
  }, []);

  /**
   * Bring a section to the top of whichever box is scrolling.
   *
   * scrollIntoView is used rather than scrollTo(offset) deliberately: these
   * templates scroll inside a `snap-y snap-mandatory` container, and asking
   * the element to bring itself into view cooperates with scroll-snap instead
   * of racing it. It also means we never have to compute an offset or know
   * which ancestor is doing the scrolling.
   */
  const goToSection = useCallback((el: HTMLElement) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = getLenis();
    if (lenis && !reduce) {
      lenis.scrollTo(el, { duration: 1.1 });
      return;
    }
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, []);

  /** Index of the section currently filling the viewport. */
  const currentIndex = useCallback(() => {
    const s = getScroller();
    const list = sections();
    const top = scrollTop(s) + SNAP_TOLERANCE;
    let idx = 0;
    for (let i = 0; i < list.length; i++) {
      if (offsetOf(list[i], s) <= top) idx = i;
      else break;
    }
    return idx;
  }, [getScroller, sections, scrollTop, offsetOf]);

  const advance = useCallback(() => {
    takenOver.current = true; // using the button counts as taking control
    const list = sections();
    if (!list.length) return;
    const next = currentIndex() + 1;
    goToSection(next >= list.length ? list[0] : list[next]);
  }, [sections, currentIndex, goToSection]);

  // Show the button once the invitation is open, and track whether the guest
  // has reached the end so it can flip to "back to top".
  useEffect(() => {
    if (!visible) return;
    const s = getScroller();
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const list = sections();
        setAtEnd(list.length > 0 && currentIndex() >= list.length - 1);
      });
    };
    const target: EventTarget = s === window ? window : (s as HTMLElement);
    target.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      target.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [visible, getScroller, sections, currentIndex]);

  // The one-time nudge.
  useEffect(() => {
    if (!visible) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cancel = () => {
      takenOver.current = true;
    };
    const opts = { passive: true, once: true } as const;
    window.addEventListener("wheel", cancel, opts);
    window.addEventListener("touchstart", cancel, opts);
    window.addEventListener("pointerdown", cancel, opts);
    window.addEventListener("keydown", cancel, opts);

    const timer = window.setTimeout(() => {
      // don't yank the page from someone already reading, or already scrolled
      if (takenOver.current || scrollTop(getScroller()) > SNAP_TOLERANCE) return;
      const list = sections();
      if (list.length < 2) return;
      goToSection(list[1]);
    }, NUDGE_DELAY);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("wheel", cancel);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("pointerdown", cancel);
      window.removeEventListener("keydown", cancel);
    };
  }, [visible, getScroller, sections, scrollTop, goToSection]);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={advance}
      aria-label={atEnd ? "Back to top" : "Next section"}
      className="fixed right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
      style={{
        // stack above the music button, which already owns this corner
        bottom: hasMusic
          ? "max(4.75rem, calc(env(safe-area-inset-bottom) + 4.75rem))"
          : "max(1.25rem, env(safe-area-inset-bottom))",
        background: "var(--c-surface)",
        color: "var(--c-primary)",
        border: "1px solid color-mix(in srgb, var(--c-accent) 32%, transparent)",
      }}
    >
      <svg
        className={`h-5 w-5 transition-transform duration-300 ${atEnd ? "rotate-180" : ""}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 5v14" />
        <path d="M6 13l6 6 6-6" />
      </svg>
    </button>
  );
}
