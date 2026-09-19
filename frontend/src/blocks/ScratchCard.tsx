"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import { usePreview } from "@/components/PreviewContext";

/** brush radius, CSS px */
const BRUSH = 24;
/** fraction of the coating that must go before it auto-completes */
const THRESHOLD = 0.55;
/** coarse coverage grid — how progress is measured, see `mark` */
const COLS = 20;
const ROWS = 6;
/**
 * Phones report devicePixelRatio 3+; a 3x backing store for a 104px coating is
 * ~2.2x the pixels of a 2x one for no visible gain. Cap it.
 */
const MAX_DPR = 2;

/**
 * Scratch-to-reveal card. A canvas coating sits over the revealed date; dragging
 * erases it, and once ~55% is cleared it auto-completes with a confetti burst.
 * Reduced-motion users get a simple "Tap to reveal" button instead.
 *
 * The 2D context is kept in CSS-pixel space (see `paint`), so every coordinate
 * below is CSS px — never multiply by dpr here.
 */
export function ScratchCard({
  teaser = "Scratch to reveal",
  revealLabel = "your special day",
  eventDate,
  location,
  onRevealed,
  primary = "#2b3a67",
  secondary = "#3f5b8b",
  accent = "#b08d57",
}: {
  teaser?: string;
  revealLabel?: string;
  eventDate: string;
  location: string;
  onRevealed?: () => void;
  /** theme colours — passed in because <canvas> can't read CSS variables */
  primary?: string;
  secondary?: string;
  accent?: string;
}) {
  const { editing } = usePreview();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  // in the WYSIWYG editor the date is shown directly (no scratch) so it's
  // editable — derived, so toggling edit mode after mount is picked up
  const shown = revealed || editing;
  const reduce = useReducedMotion();

  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  /** one flag per grid cell, plus a running count, so progress needs no readback */
  const grid = useRef(new Uint8Array(COLS * ROWS));
  const clearedCells = useRef(0);
  const doneRef = useRef(editing);
  /** queued client coords as a flat [x,y,x,y,...] buffer, drained once a frame */
  const pending = useRef<number[]>([]);
  const rafRef = useRef(0);

  const fireConfetti = useCallback(() => {
    if (reduce) return;
    const small = typeof window !== "undefined" && window.innerWidth < 480;
    confetti({
      particleCount: small ? 70 : 130,
      spread: 75,
      origin: { y: 0.5 },
      colors: ["#b08d57", "#2b3a67", "#ffffff", "#d9b366"],
      scalar: 0.9,
      disableForReducedMotion: true,
    });
  }, [reduce]);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    drawing.current = false;
    setRevealed(true);
    fireConfetti();
    onRevealed?.();
  }, [fireConfetti, onRevealed]);

  /** (re)draw the coating and reset progress. Also runs on resize. */
  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // measure the canvas, not the wrapper: the wrapper's border box is 2px
    // larger, which would scale the coating against the pointer coordinates
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // assign rather than scale() so repaints never compound the transform
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";

    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, primary);
    grad.addColorStop(1, secondary);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "600 13px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("✦  " + teaser.toUpperCase() + "  ✦", width / 2, height / 2 - 4);
    ctx.fillStyle = accent;
    ctx.font = "italic 12px Georgia, serif";
    ctx.fillText(revealLabel, width / 2, height / 2 + 16);

    ctxRef.current = ctx;
    sizeRef.current = { width, height };
    grid.current.fill(0);
    clearedCells.current = 0;
    last.current = null;
  }, [teaser, revealLabel, primary, secondary, accent]);

  useEffect(() => {
    if (reduce || shown) return;
    paint();
    const wrap = wrapRef.current;
    if (!wrap || typeof ResizeObserver === "undefined") return;
    // width is responsive, so rotating the phone changes it; without this the
    // coating stretches and the scratch stops landing under the finger
    let w = wrap.getBoundingClientRect().width;
    const ro = new ResizeObserver(() => {
      const next = wrap.getBoundingClientRect().width;
      if (Math.abs(next - w) < 1) return;
      w = next;
      paint();
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [reduce, shown, paint]);

  /** Flag every grid cell the brush covers at (x, y); true once past threshold. */
  const mark = useCallback((x: number, y: number) => {
    const { width, height } = sizeRef.current;
    if (!width || !height) return false;
    const cw = width / COLS;
    const ch = height / ROWS;
    const c0 = Math.max(0, Math.floor((x - BRUSH) / cw));
    const c1 = Math.min(COLS - 1, Math.floor((x + BRUSH) / cw));
    const r0 = Math.max(0, Math.floor((y - BRUSH) / ch));
    const r1 = Math.min(ROWS - 1, Math.floor((y + BRUSH) / ch));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const i = r * COLS + c;
        if (grid.current[i]) continue;
        // circular brush: only count a cell whose centre is actually under it
        const dx = (c + 0.5) * cw - x;
        const dy = (r + 0.5) * ch - y;
        if (dx * dx + dy * dy > BRUSH * BRUSH) continue;
        grid.current[i] = 1;
        clearedCells.current++;
      }
    }
    return clearedCells.current / (COLS * ROWS) > THRESHOLD;
  }, []);

  /** Erase from the previous point to (x, y) as one continuous stroke. */
  const strokeTo = useCallback(
    (x: number, y: number) => {
      const ctx = ctxRef.current;
      if (!ctx) return false;
      ctx.globalCompositeOperation = "destination-out";
      const prev = last.current;
      if (prev) {
        ctx.lineWidth = BRUSH * 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, BRUSH, 0, Math.PI * 2);
        ctx.fill();
      }

      // sample along the segment so a fast swipe still scores every cell it crossed
      let hit = false;
      if (prev) {
        const dist = Math.hypot(x - prev.x, y - prev.y);
        const steps = Math.min(24, Math.ceil(dist / (BRUSH * 0.5)));
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          if (mark(prev.x + (x - prev.x) * t, prev.y + (y - prev.y) * t)) hit = true;
        }
      }
      if (mark(x, y)) hit = true;
      last.current = { x, y };
      return hit;
    },
    [mark],
  );

  /**
   * Drain the queued points and draw them as one batch.
   *
   * This runs once per frame, and reads the canvas rect once for the whole
   * batch. That matters: the card lives inside a scroll-driven parallax
   * transform and Lenis keeps the layout tree dirty, so every
   * getBoundingClientRect() forces a synchronous reflow. Measuring per point
   * (with coalesced events, 5-15 of them a frame) thrashes layout badly on a
   * phone.
   */
  const flush = useCallback(() => {
    rafRef.current = 0;
    const canvas = canvasRef.current;
    const queue = pending.current;
    if (!canvas || !queue.length || doneRef.current) {
      queue.length = 0;
      return;
    }
    const rect = canvas.getBoundingClientRect();
    let hit = false;
    for (let i = 0; i < queue.length; i += 2) {
      // CSS px — the context transform already accounts for dpr
      if (strokeTo(queue[i] - rect.left, queue[i + 1] - rect.top)) hit = true;
    }
    queue.length = 0;
    if (hit) finish();
  }, [strokeTo, finish]);

  const enqueue = useCallback(
    (x: number, y: number) => {
      pending.current.push(x, y);
      if (!rafRef.current) rafRef.current = requestAnimationFrame(flush);
    },
    [flush],
  );

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const onDown = (e: React.PointerEvent) => {
    if (doneRef.current) return;
    drawing.current = true;
    last.current = null;
    // capture keeps the stroke alive if the finger slides off the card, but it
    // throws if the pointer is already gone — never let that kill the gesture
    try {
      canvasRef.current?.setPointerCapture?.(e.pointerId);
    } catch {
      /* not capturable; scratching still works, it just ends at the edge */
    }
    enqueue(e.clientX, e.clientY);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current || doneRef.current) return;
    // phones batch several samples into one frame; replaying them keeps the
    // stroke smooth instead of leaving gaps on a fast swipe
    const native = e.nativeEvent;
    const points =
      typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [];
    if (points.length) {
      for (const pt of points) enqueue(pt.clientX, pt.clientY);
    } else {
      enqueue(e.clientX, e.clientY);
    }
  };

  const onUp = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    drawing.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      flush();
    }
    last.current = null;
    try {
      canvasRef.current?.releasePointerCapture?.(e.pointerId);
    } catch {
      /* capture was never taken, or already released */
    }
  };

  return (
    <div
      ref={wrapRef}
      className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl"
      style={{
        height: 104,
        background: "var(--c-surface)",
        boxShadow: "0 14px 34px rgba(40,50,80,0.16)",
        border: "1px solid color-mix(in srgb, var(--c-accent) 26%, transparent)",
      }}
    >
      {/* revealed content underneath */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p
          className="font-display text-xs uppercase tracking-[0.3em]"
          style={{ color: "var(--c-muted)" }}
        >
          Save the Date
        </p>
        <motion.p
          data-edit="dateReveal.eventDate"
          className="font-script text-2xl"
          style={{ color: "var(--c-primary)" }}
          animate={shown ? { scale: [0.8, 1.06, 1] } : {}}
          transition={{ duration: 0.6 }}
        >
          {eventDate}
        </motion.p>
        <p data-edit="dateReveal.location" className="text-xs" style={{ color: "var(--c-secondary)" }}>
          {location}
        </p>
      </div>

      {/* scratch coating */}
      {!reduce && !shown ? (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full cursor-pointer touch-none"
          role="button"
          tabIndex={0}
          aria-label={teaser + " — " + revealLabel}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          // fires when the browser takes the gesture over (scroll, call, app switch);
          // without it `drawing` sticks on and the next tap resumes mid-stroke
          onPointerCancel={onUp}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              finish();
            }
          }}
        />
      ) : null}

      {/* reduced-motion fallback */}
      {reduce && !shown ? (
        <button
          onClick={finish}
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "var(--c-primary)", color: "#fff" }}
        >
          <span className="font-display text-sm tracking-[0.2em]">
            ✦ TAP TO REVEAL ✦
          </span>
        </button>
      ) : null}
    </div>
  );
}
