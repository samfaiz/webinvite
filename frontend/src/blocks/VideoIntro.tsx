"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Custom video intro. The couple's MP4 starts only when the guest taps (a user
 * gesture, so it plays *with sound*), runs full-screen, and near the end dissolves
 * into the invitation — the video's last moment overlaps Section 1 fading in for a
 * smooth hand-off. Tapping again skips. Reduced-motion users get a quick fade.
 */
export function VideoIntro({
  videoUrl,
  tagline,
  onOpen,
  onOpening,
}: {
  videoUrl: string;
  tagline?: string;
  onOpen: () => void;
  onOpening?: () => void;
}) {
  const [phase, setPhase] = useState<"idle" | "playing" | "ending">("idle");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reduce = useReducedMotion();

  const EXIT = reduce ? 0.4 : 1.1; // crossfade seconds
  const OVERLAP = 1.2; // begin the dissolve this many seconds before the end
  const exiting = phase === "ending";

  const beginExit = () => {
    if (phase === "ending") return;
    setPhase("ending");
    onOpening?.(); // Section 1 starts dissolving in underneath
    window.setTimeout(onOpen, EXIT * 1000);
  };

  const startPlay = () => {
    const v = videoRef.current;
    setPhase("playing");
    // the intro video plays silently; the invitation's music is the soundtrack,
    // started here within the user's tap so the browser allows it
    try {
      window.dispatchEvent(new Event("invite:open"));
    } catch {
      /* SSR / no window */
    }
    if (!v) return;
    v.muted = true;
    v.currentTime = 0;
    v.play().catch(() => {});
  };

  const onTap = () => {
    if (phase === "idle") startPlay();
    else if (phase === "playing") beginExit(); // tap again to skip
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || phase !== "playing") return;
    if (v.duration && Number.isFinite(v.duration) && v.duration - v.currentTime <= OVERLAP) {
      beginExit();
    }
  };

  return (
    <motion.button
      type="button"
      onClick={onTap}
      aria-label="Open invitation"
      className="fixed inset-0 z-[60] block w-full overflow-hidden"
      style={{ background: "#000" }}
      initial={{ opacity: 1 }}
      animate={{ opacity: exiting ? 0 : 1, scale: exiting && !reduce ? 1.05 : 1 }}
      transition={{
        opacity: { duration: EXIT, ease: "easeInOut" },
        scale: { duration: EXIT * 1.1, ease: [0.22, 1, 0.36, 1] },
      }}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        playsInline
        muted
        preload="auto"
        onEnded={beginExit}
        onTimeUpdate={onTimeUpdate}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* soft scrim so the prompt stays readable over any footage */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, transparent 35%, rgba(0,0,0,0.45) 100%)" }}
      />

      {/* skip hint while playing */}
      {phase === "playing" ? (
        <span className="font-display absolute right-4 top-4 z-10 rounded-full bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/85 backdrop-blur-sm">
          skip ›
        </span>
      ) : null}

      {/* elegant bottom overlay — only while idle */}
      <motion.div
        className="absolute inset-x-0 bottom-[6%] z-10 px-8 text-center"
        animate={{ opacity: phase === "idle" ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        <OrnamentRule className="mb-3.5" />
        {tagline ? (
          <p
            className="font-display text-[13px] uppercase tracking-[0.32em] sm:text-sm"
            style={{ color: "#f6eedd", textShadow: "0 1px 8px rgba(0,0,0,0.55)" }}
          >
            {tagline}
          </p>
        ) : null}
        <motion.span
          className="mt-3 inline-block rounded-full px-8 py-2"
          style={{
            background: "rgba(248,241,225,0.82)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.65)",
            boxShadow: "0 8px 22px rgba(0,0,0,0.22)",
          }}
          animate={{ scale: [1, 1.035, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="font-script text-2xl leading-none" style={{ color: "#8a6a3c" }}>
            tap to open
          </span>
        </motion.span>
        <OrnamentRule className="mt-3.5" heart />
      </motion.div>
    </motion.button>
  );
}

/** Gold flourish: dot — line — ▶ ◆ ◀ — line — dot, with an optional heart below. */
function OrnamentRule({ className = "", heart = false }: { className?: string; heart?: boolean }) {
  const gold = "#dcbb74";
  return (
    <div
      className={`flex flex-col items-center ${className}`}
      aria-hidden
      style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.45))" }}
    >
      <svg viewBox="0 0 200 12" width={190} height={12} className="block">
        <g fill={gold} stroke={gold} strokeWidth={1} strokeLinecap="round">
          <circle cx={30} cy={6} r={1.5} stroke="none" />
          <line x1={38} y1={6} x2={84} y2={6} />
          <path d="M86 6 l-8 -3.6 v7.2 z" stroke="none" />
          <path d="M100 1 l5.5 5 -5.5 5 -5.5 -5 z" stroke="none" />
          <path d="M114 6 l8 -3.6 v7.2 z" stroke="none" />
          <line x1={116} y1={6} x2={162} y2={6} />
          <circle cx={170} cy={6} r={1.5} stroke="none" />
        </g>
      </svg>
      {heart ? (
        <span className="mt-1 text-sm leading-none" style={{ color: gold }}>
          ♥
        </span>
      ) : null}
    </div>
  );
}
