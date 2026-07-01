"use client";

import type { InvitationContent } from "@/engine/types";

/**
 * Stylized venue route — a soft map panel with pins on a dotted path, plus a
 * "Get Directions" button. (A real interactive map can be dropped in later.)
 */
export function VenueMap({ content }: { content: InvitationContent }) {
  const pts = content.map.points.slice(0, 3);
  const xs = [18, 50, 82];

  return (
    <div
      className="mx-auto w-full max-w-md overflow-hidden rounded-xl"
      style={{
        background:
          "linear-gradient(135deg, #e9eef3, #dbe6ef)",
        border: "1px solid color-mix(in srgb, var(--c-accent) 20%, transparent)",
      }}
    >
      <svg viewBox="0 0 100 46" className="h-32 w-full">
        {/* faint roads */}
        <g stroke="rgba(255,255,255,0.6)" strokeWidth="0.6">
          <path d="M0 30 H100" />
          <path d="M30 0 V46" />
          <path d="M70 0 V46" />
        </g>
        {/* dotted route */}
        <path
          d={`M${xs[0]} 30 Q35 12 ${xs[1]} 22 T${xs[2]} 26`}
          fill="none"
          stroke="var(--c-secondary)"
          strokeWidth="0.8"
          strokeDasharray="2 2"
        />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={xs[i]} cy={i === 1 ? 22 : i === 0 ? 30 : 26} r="2.4" fill="var(--c-primary)" />
            <circle cx={xs[i]} cy={i === 1 ? 22 : i === 0 ? 30 : 26} r="0.9" fill="#fff" />
          </g>
        ))}
      </svg>
      <div className="flex justify-between px-4 pb-4 pt-1 text-center">
        {pts.map((p, i) => (
          <div key={i} className="flex-1 px-1">
            <p className="font-display text-[9px] uppercase tracking-[0.1em]" style={{ color: "var(--c-primary)" }}>
              {p.label}
            </p>
            {p.address ? (
              <p className="text-[9px]" style={{ color: "var(--c-muted)" }}>
                {p.address}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
