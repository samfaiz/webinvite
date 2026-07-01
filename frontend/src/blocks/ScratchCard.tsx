"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import { usePreview } from "@/components/PreviewContext";

/**
 * Scratch-to-reveal card. A canvas coating sits over the revealed date; dragging
 * erases it, and once ~55% is cleared it auto-completes with a confetti burst.
 * Reduced-motion users get a simple "Tap to reveal" button instead.
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
  // in the WYSIWYG editor the date is shown directly (no scratch) so it's editable
  const [revealed, setRevealed] = useState(editing);
  const drawing = useRef(false);
  const reduce = useReducedMotion();

  const fireConfetti = useCallback(() => {
    if (reduce) return;
    confetti({
      particleCount: 130,
      spread: 75,
      origin: { y: 0.5 },
      colors: ["#b08d57", "#2b3a67", "#ffffff", "#d9b366"],
      scalar: 0.9,
    });
  }, [reduce]);

  const finish = useCallback(() => {
    if (revealed) return;
    setRevealed(true);
    fireConfetti();
    onRevealed?.();
  }, [revealed, fireConfetti, onRevealed]);

  // paint the scratch coating
  useEffect(() => {
    if (reduce) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = wrap.getBoundingClientRect();
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

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
  }, [reduce, teaser, revealLabel, primary, secondary, accent]);

  const scratch = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const x = (clientX - rect.left) * dpr;
    const y = (clientY - rect.top) * dpr;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 24 * dpr, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const measure = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    const step = 32;
    let cleared = 0;
    let total = 0;
    const data = ctx.getImageData(0, 0, width, height).data;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        total++;
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha < 40) cleared++;
      }
    }
    if (total && cleared / total > 0.55) finish();
  }, [finish]);

  const onDown = (e: React.PointerEvent) => {
    if (revealed) return;
    drawing.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    scratch(e.clientX, e.clientY);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current || revealed) return;
    scratch(e.clientX, e.clientY);
  };
  const onUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    measure();
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
          animate={revealed ? { scale: [0.8, 1.06, 1] } : {}}
          transition={{ duration: 0.6 }}
        >
          {eventDate}
        </motion.p>
        <p data-edit="dateReveal.location" className="text-xs" style={{ color: "var(--c-secondary)" }}>
          {location}
        </p>
      </div>

      {/* scratch coating */}
      {!reduce && !revealed ? (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full cursor-pointer touch-none"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        />
      ) : null}

      {/* reduced-motion fallback */}
      {reduce && !revealed ? (
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
