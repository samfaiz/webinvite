"use client";

import type { InvitationContent } from "@/engine/types";

/** Unique venues from the schedule (deduped by name+address) — so if all events
 *  share one venue, only one pin shows; different venues show separate pins. */
function uniqueVenues(events: InvitationContent["schedule"]["events"]) {
  const seen = new Set<string>();
  const out: { label: string; address?: string }[] = [];
  for (const e of events) {
    if (!e.venue) continue;
    const key = `${e.venue}|${e.address ?? ""}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label: e.venue, address: e.address });
  }
  return out;
}

const XS: Record<number, number[]> = { 1: [50], 2: [28, 72], 3: [18, 50, 82] };
const YS: Record<number, number[]> = { 1: [26], 2: [28, 24], 3: [30, 20, 26] };

/**
 * Stylized venue route — a soft map panel with a pin per unique event venue on a
 * dotted path. Reflects the couple's actual schedule (one venue → one pin).
 */
export function VenueMap({ content }: { content: InvitationContent }) {
  const venues = uniqueVenues(content.schedule.events).slice(0, 3);
  if (venues.length === 0) return null;

  const xs = XS[venues.length];
  const ys = YS[venues.length];
  const route =
    venues.length > 1
      ? venues.map((_, i) => `${i === 0 ? "M" : "L"}${xs[i]} ${ys[i]}`).join(" ")
      : "";

  return (
    <div
      className="mx-auto w-full max-w-md overflow-hidden rounded-xl"
      style={{
        background: "linear-gradient(135deg, #e9eef3, #dbe6ef)",
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
        {/* dotted route between venues */}
        {route ? (
          <path d={route} fill="none" stroke="var(--c-secondary)" strokeWidth="0.8" strokeDasharray="2 2" />
        ) : null}
        {venues.map((_, i) => (
          <g key={i}>
            <circle cx={xs[i]} cy={ys[i]} r="2.4" fill="var(--c-primary)" />
            <circle cx={xs[i]} cy={ys[i]} r="0.9" fill="#fff" />
          </g>
        ))}
      </svg>
      <div className="flex justify-around px-4 pb-4 pt-1 text-center">
        {venues.map((v, i) => (
          <div key={i} className="px-1" style={{ maxWidth: `${100 / venues.length}%` }}>
            <p className="font-display text-[9px] uppercase tracking-[0.1em]" style={{ color: "var(--c-primary)" }}>
              {v.label}
            </p>
            {v.address ? (
              <p className="text-[9px]" style={{ color: "var(--c-muted)" }}>
                {v.address}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
