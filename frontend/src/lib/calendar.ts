/**
 * "Add to calendar" for the guest RSVP card.
 *
 * We emit an .ics file rather than a Google Calendar link: guests arrive on
 * whatever phone they own, and an .ics opens in the native calendar on iOS,
 * Android and desktop alike, while a Google link assumes a Google account.
 */

import type { InvitationContent } from "@/engine/types";

export type CalendarEvent = {
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  url?: string;
};

/** Celebrations don't carry an end time anywhere in the content model, so we
 *  block out a sensible evening rather than leaving a zero-length event. */
const DEFAULT_HOURS = 3;

/**
 * The one machine-readable date in the content is `countdown.targetDate` (the
 * builder writes an ISO datetime there). The schedule's `date`/`time` are free
 * text meant for humans — we try them only as a fallback, and give up rather
 * than guess, so the guest never gets an event on the wrong day.
 */
function parseStart(content: InvitationContent): Date | null {
  const iso = content.countdown?.targetDate;
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const ev = content.schedule?.events?.[0];
  if (ev?.date) {
    const d = new Date(`${ev.date} ${ev.time ?? ""}`.trim());
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

/** Build the calendar entry for an invitation, or null when we can't pin down
 *  a real date (the caller then hides the button instead of offering a dud). */
export function calendarEvent(
  content: InvitationContent,
  url?: string,
): CalendarEvent | null {
  const start = parseStart(content);
  if (!start) return null;

  const ev = content.schedule?.events?.[0];
  const p1 = content.couple?.partner1?.name;
  const p2 = content.couple?.partner2?.name;
  const names = p1 && p2 ? `${p1} & ${p2}` : p1 || p2 || "";
  const occasion = ev?.name || "Wedding";

  return {
    title: names ? `${occasion} — ${names}` : occasion,
    start,
    end: new Date(start.getTime() + DEFAULT_HOURS * 3600_000),
    location: [ev?.venue, ev?.address].filter(Boolean).join(", ") ||
      content.dateReveal?.location ||
      undefined,
    description: names ? `You're invited to celebrate with ${names}.` : undefined,
    url,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ICS timestamps are UTC ("…Z") — the safest form when we don't know which
 *  timezone database the guest's calendar app ships with. */
function stamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** RFC 5545 text escaping: backslash first, then the separators. */
function esc(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Fold long lines at 75 octets, continuation lines starting with a space. */
function fold(line: string): string {
  if (line.length <= 73) return line;
  const parts = [line.slice(0, 73)];
  let rest = line.slice(73);
  while (rest.length) {
    parts.push(` ${rest.slice(0, 72)}`);
    rest = rest.slice(72);
  }
  return parts.join("\r\n");
}

export function buildIcs(ev: CalendarEvent): string {
  const now = stamp(new Date());
  const uid = `${now}-${Math.random().toString(36).slice(2, 10)}@webinvite`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WebInvite//Invitation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${stamp(ev.start)}`,
    `DTEND:${stamp(ev.end)}`,
    `SUMMARY:${esc(ev.title)}`,
    ev.location ? `LOCATION:${esc(ev.location)}` : null,
    ev.description ? `DESCRIPTION:${esc(ev.description)}` : null,
    ev.url ? `URL:${esc(ev.url)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((l): l is string => l !== null);
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/** Hand the .ics to the browser. Safe to call only from an event handler. */
export function downloadIcs(ev: CalendarEvent, filename = "invitation.ics") {
  const blob = new Blob([buildIcs(ev)], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // give Safari a moment to start the download before the blob disappears
  setTimeout(() => URL.revokeObjectURL(href), 2000);
}
