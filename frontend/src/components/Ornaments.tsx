"use client";

import { useState, type CSSProperties } from "react";

/** A gold ornamental divider with a centered heart — used between sections. */
export function Divider({
  width = 160,
  symbol = "♥",
  className = "",
}: {
  width?: number;
  symbol?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center gap-3 ${className}`}
      style={{ color: "var(--c-accent)" }}
      aria-hidden
    >
      <span
        style={{
          height: 1,
          width,
          background:
            "linear-gradient(90deg, transparent, var(--c-accent), transparent)",
        }}
      />
      <span style={{ fontSize: 12 }}>{symbol}</span>
      <span
        style={{
          height: 1,
          width,
          background:
            "linear-gradient(90deg, transparent, var(--c-accent), transparent)",
        }}
      />
    </div>
  );
}

/**
 * Monogram crest (e.g. "S | L") inside a decorative gold laurel frame.
 * Uses the PNG frame at /ornaments/laurel-frame.png; if that image is missing it
 * falls back to a simple drawn laurel so nothing looks broken.
 *
 * When `logo` (a data/URL image) is supplied it replaces the drawn crest entirely
 * — couples can upload their own icon/logo. `scale` multiplies the base `size`
 * so either the default crest or an uploaded logo can be resized consistently
 * at every place the crest appears.
 */
export function MonogramCrest({
  monogram = "S | L",
  size = 96,
  scale = 1,
  logo,
  style,
}: {
  monogram?: string;
  size?: number;
  scale?: number;
  logo?: string;
  style?: CSSProperties;
}) {
  const [frameFailed, setFrameFailed] = useState(false);
  // clamp so an extreme saved value can never blow out the layout
  const s = Math.round(size * Math.min(3, Math.max(0.3, scale || 1)));

  // Custom uploaded logo: render it on its own (no laurel frame / initials).
  // Height-driven so `s` controls the on-screen size; a wide/tall logo keeps its
  // aspect ratio and extends horizontally (capped) instead of being squashed
  // into a square box.
  if (logo) {
    return (
      <div
        className="relative inline-flex items-center justify-center"
        style={{ height: s, maxWidth: "100%", ...style }}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt=""
          draggable={false}
          className="pointer-events-none block object-contain"
          style={{ height: s, width: "auto", maxWidth: Math.round(s * 3) }}
        />
      </div>
    );
  }

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: s, height: s, color: "var(--c-accent)", ...style }}
      aria-hidden
    >
      {frameFailed ? (
        <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full">
          <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <path d="M40 95 C20 80 18 50 38 30" />
            <path d="M80 95 C100 80 102 50 82 30" />
            {[0, 1, 2, 3, 4].map((i) => (
              <path key={`l${i}`} d={`M${38 - i * 2} ${78 - i * 12} q-9 -3 -13 4`} />
            ))}
            {[0, 1, 2, 3, 4].map((i) => (
              <path key={`r${i}`} d={`M${82 + i * 2} ${78 - i * 12} q9 -3 13 4`} />
            ))}
          </g>
        </svg>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/ornaments/laurel-frame.png"
          alt=""
          draggable={false}
          onError={() => setFrameFailed(true)}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        />
      )}
      <span
        className="font-display absolute"
        style={{
          top: "46%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: s * (frameFailed ? 0.26 : 0.2),
          color: "var(--c-primary)",
          letterSpacing: "0.05em",
          whiteSpace: "nowrap",
        }}
      >
        {monogram}
      </span>
    </div>
  );
}
