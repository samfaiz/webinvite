"use client";

import type { InvitationContent, VenueLocation } from "@/engine/types";

/** A map pin; editPath (e.g. "venues.1") makes its labels inline-editable in
 *  the WYSIWYG editor — only manual locations have one, derived venues don't. */
export type VenuePin = VenueLocation & { editPath?: string };

/** Manual venues with a real name, capped at the 4 map slots (A–D). Keeps the
 *  original array index in editPath so inline edits hit the right entry even
 *  when earlier slots are empty. */
export function cleanVenues(list?: VenueLocation[]): VenuePin[] {
  return (list ?? [])
    .map((v, i) => ({ ...v, editPath: `venues.${i}` }))
    .filter((v) => v.label?.trim())
    .slice(0, 4);
}

/** Unique venues from the schedule (deduped by name+address) — so if all events
 *  share one venue, only one pin shows; different venues show separate pins. */
function uniqueVenues(events: InvitationContent["schedule"]["events"]) {
  const seen = new Set<string>();
  const out: VenueLocation[] = [];
  for (const e of events) {
    if (!e.venue) continue;
    const key = `${e.venue}|${e.address ?? ""}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label: e.venue, address: e.address });
  }
  return out;
}

/** Pins for the map: the couple's manual locations when any are set,
 *  otherwise the venues derived from their schedule. */
export function resolveVenues(content: InvitationContent): VenuePin[] {
  const manual = cleanVenues(content.venues);
  return manual.length > 0 ? manual : uniqueVenues(content.schedule.events).slice(0, 4);
}

const XS: Record<number, number[]> = { 1: [50], 2: [28, 72], 3: [18, 50, 82], 4: [14, 38, 62, 86] };
const YS: Record<number, number[]> = { 1: [26], 2: [28, 24], 3: [30, 20, 26], 4: [30, 20, 28, 22] };

/**
 * Stylized venue route — a soft map panel with a pin per venue on a dotted
 * path (1–4 pins). Fed by resolveVenues() (fixed templates) or the manual
 * locations alone (custom sections).
 */
export function VenueMap({ venues }: { venues: VenuePin[] }) {
  const pins = venues.slice(0, 4);
  if (pins.length === 0) return null;

  const xs = XS[pins.length];
  const ys = YS[pins.length];
  const route =
    pins.length > 1
      ? pins.map((_, i) => `${i === 0 ? "M" : "L"}${xs[i]} ${ys[i]}`).join(" ")
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
        {pins.map((_, i) => (
          <g key={i}>
            <circle cx={xs[i]} cy={ys[i]} r="2.4" fill="var(--c-primary)" />
            <circle cx={xs[i]} cy={ys[i]} r="0.9" fill="#fff" />
          </g>
        ))}
      </svg>
      <div className="flex justify-around px-4 pb-4 pt-1 text-center">
        {pins.map((v, i) => (
          <div key={i} className="px-1" style={{ maxWidth: `${100 / pins.length}%` }}>
            <p
              data-edit={v.editPath ? `${v.editPath}.label` : undefined}
              className="font-display text-[9px] uppercase tracking-[0.1em]"
              style={{ color: "var(--c-primary)" }}
            >
              {v.label}
            </p>
            {v.address ? (
              <p
                data-edit={v.editPath ? `${v.editPath}.address` : undefined}
                className="text-[9px]"
                style={{ color: "var(--c-muted)" }}
              >
                {v.address}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
