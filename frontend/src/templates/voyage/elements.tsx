"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { motion } from "framer-motion";
import type { InvitationContent } from "@/engine/types";
import { MEALS, useRsvp } from "@/blocks/useRsvp";
import { usePreview } from "@/components/PreviewContext";
import { Value, Body, u } from "./parts";

/**
 * The Voyage template's own elements.
 *
 * None of these are shared with the other designs — a boarding pass has no
 * rounded cards, no soft shadows and no floral envelope, and dressing the
 * common blocks in navy would have read as exactly that. Everything here is
 * drawn in the language of printed travel stationery: hairlines, perforations,
 * mono field labels, hand-stamped rings.
 *
 * Two sizing systems, on purpose:
 *   · elements that sit ON a plate (countdown, calendar, timeline) size in
 *     `u()` / cqw, so they scale with the artwork as one picture;
 *   · elements a guest touches (the RSVP stub, the dress code) size in real
 *     units, because type that scales with a phone-width plate ends up at 9px.
 */

/* ------------------------- shared type scale ------------------------- */

const MONO = "var(--font-space-mono)";

const label: CSSProperties = {
  fontFamily: MONO,
  fontSize: "clamp(9px, 2.6vw, 11px)",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "var(--v-gold)",
  lineHeight: 1.3,
};

const entryText: CSSProperties = {
  fontFamily: MONO,
  fontSize: "clamp(14px, 3.9vw, 16px)",
  color: "var(--v-ink)",
};

const bodyText: CSSProperties = {
  fontFamily: "var(--font-karla)",
  fontSize: "clamp(13px, 3.6vw, 15px)",
  lineHeight: 1.7,
  color: "var(--v-body)",
};

const serifHead: CSSProperties = {
  fontFamily: "var(--font-cinzel)",
  fontSize: "clamp(20px, 5.6vw, 28px)",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  lineHeight: 1.2,
  color: "var(--v-ink)",
};

/* ------------------------------ chrome ------------------------------ */

/** The dotted tear line across a ticket. */
export function Perforation({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block w-full ${className}`}
      style={{
        height: 3,
        backgroundImage: "radial-gradient(circle, var(--v-gold) 1.2px, transparent 1.4px)",
        backgroundSize: "10px 3px",
        backgroundRepeat: "repeat-x",
        opacity: 0.55,
      }}
    />
  );
}

/** A field written the way a ticket prints one: label over a ruled entry. */
export function TicketField({
  label: text,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span style={{ ...label, display: "block" }}>{text}</span>
      <span
        className="mt-1 block"
        style={{ borderBottom: "1px solid color-mix(in srgb, var(--v-gold) 45%, transparent)" }}
      >
        {children}
      </span>
    </label>
  );
}

/** A solid navy action bar — the template's only filled control. */
export function StubButton({
  children,
  onClick,
  type = "button",
  disabled,
  tone = "navy",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  tone?: "navy" | "ghost";
  className?: string;
}) {
  const navy = tone === "navy";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`uppercase transition-opacity disabled:opacity-50 ${className}`}
      style={{
        fontFamily: MONO,
        fontSize: "clamp(11px, 3.2vw, 13px)",
        letterSpacing: "0.18em",
        padding: "14px 24px",
        background: navy ? "var(--v-navy)" : "transparent",
        color: navy ? "var(--v-cream)" : "var(--v-ink)",
        border: navy ? "none" : "1px solid color-mix(in srgb, var(--v-ink) 35%, transparent)",
      }}
    >
      {children}
    </button>
  );
}

/**
 * A cream sheet with the corner notches of a torn stub. Used where the deck
 * has no printed plate behind it, so the element brings its own stationery
 * instead of leaning on a background.
 */
export function StubSheet({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative ${className}`}
      style={{
        background: "var(--v-cream)",
        boxShadow: "0 22px 50px rgba(0,0,0,0.3)",
        // the notch: a navy disc bitten out of each side at the tear line
        ["--notch" as string]: "14px",
      }}
    >
      <span
        aria-hidden
        className="absolute rounded-full"
        style={{ left: -14, top: "50%", width: 28, height: 28, marginTop: -14, background: "var(--v-navy)" }}
      />
      <span
        aria-hidden
        className="absolute rounded-full"
        style={{ right: -14, top: "50%", width: 28, height: 28, marginTop: -14, background: "var(--v-navy)" }}
      />
      {children}
    </div>
  );
}

/* ------------------------------- intro ------------------------------ */

/**
 * The opening: a boarding gate rather than a sealed envelope. The stub sits
 * on the navy field with a gold flight path running behind it; tapping tears
 * it upward and hands the guest through to the pass.
 */
export function GateIntro({
  names,
  from,
  date,
  tagline,
  onOpening,
  onOpen,
}: {
  names: string;
  from?: string;
  date?: string;
  tagline?: string;
  onOpening: () => void;
  onOpen: () => void;
}) {
  const [going, setGoing] = useState(false);

  const board = () => {
    if (going) return;
    setGoing(true);
    onOpening();
    window.setTimeout(onOpen, 900);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center px-6"
      style={{ background: "var(--v-navy)" }}
      initial={{ opacity: 1 }}
      animate={{ opacity: going ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* the flight path, drawn rather than imported */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <path
          d="M18,-5 C18,30 46,42 50,58 C54,74 40,88 34,110"
          fill="none"
          stroke="var(--v-gold)"
          strokeWidth="0.35"
          strokeDasharray="1.6 1.4"
          opacity="0.55"
        />
      </svg>

      <motion.button
        onClick={board}
        className="relative w-full text-left"
        style={{ maxWidth: 340, cursor: going ? "default" : "pointer" }}
        animate={going ? { y: "-130%", rotate: -3 } : { y: 0, rotate: 0 }}
        transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
      >
        <StubSheet className="px-6 pb-5 pt-6">
          <div className="flex items-start justify-between">
            <span style={label}>Boarding pass</span>
            <span style={{ ...label, letterSpacing: "0.14em" }}>{date}</span>
          </div>

          <p className="mt-6" style={{ ...serifHead, fontSize: "clamp(22px, 6.4vw, 28px)" }}>
            {names}
          </p>
          {from ? (
            <p className="mt-1" style={{ ...entryText, fontSize: "clamp(11px, 3.1vw, 12px)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--v-body)" }}>
              {from}
            </p>
          ) : null}

          <div className="mt-6" style={{ borderTop: "1px dashed rgba(184,147,90,0.6)" }} />

          <div className="mt-4 flex items-center justify-between">
            <span style={{ ...label, color: "var(--v-ink)" }}>
              {going ? "Boarding…" : "Tap to board"}
            </span>
            <span aria-hidden style={{ color: "var(--v-gold)", fontSize: 18 }}>
              ➤
            </span>
          </div>
        </StubSheet>
      </motion.button>

      {tagline ? (
        <p
          className="absolute bottom-10 left-0 right-0 text-center"
          style={{ ...label, color: "rgba(245,241,228,0.55)", letterSpacing: "0.28em" }}
        >
          {tagline}
        </p>
      ) : null}
    </motion.div>
  );
}

/* ----------------------------- countdown ---------------------------- */

const DAY = 864e5;
const HOUR = 36e5;
const MIN = 6e4;

function remaining(target: string) {
  const ms = new Date(target).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return null;
  return {
    days: Math.floor(ms / DAY),
    hours: Math.floor((ms % DAY) / HOUR),
    mins: Math.floor((ms % HOUR) / MIN),
    secs: Math.floor((ms % MIN) / 1000),
  };
}

/** The countdown as a departures board: mono figures on hairlines, no boxes. */
export function FlightCountdown({
  targetDate,
  tone = "cream",
}: {
  targetDate?: string;
  tone?: "cream" | "ink";
}) {
  const [t, setT] = useState<ReturnType<typeof remaining>>(null);

  useEffect(() => {
    if (!targetDate) return;
    // the server has no "now", so the first paint shows dashes and the real
    // figures arrive on the client's first tick
    const tick = () => setT(remaining(targetDate));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetDate]);

  if (!targetDate) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const cells: [string, string][] = [
    ["Days", t ? String(t.days) : "--"],
    ["Hrs", t ? pad(t.hours) : "--"],
    ["Min", t ? pad(t.mins) : "--"],
    ["Sec", t ? pad(t.secs) : "--"],
  ];
  const ink = tone === "cream" ? "var(--v-cream)" : "var(--v-ink)";

  return (
    <div className="flex w-full items-stretch">
      {cells.map(([name, value], i) => (
        <div
          key={name}
          className="flex-1 text-center"
          style={{
            borderLeft: i === 0 ? "none" : "1px solid color-mix(in srgb, var(--v-gold) 40%, transparent)",
          }}
        >
          <p style={{ fontFamily: MONO, fontSize: u(48), lineHeight: 1, color: ink }}>{value}</p>
          <p
            className="uppercase"
            style={{
              fontFamily: MONO,
              fontSize: u(13),
              letterSpacing: "0.22em",
              color: "var(--v-gold)",
              marginTop: u(9),
            }}
          >
            {name}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------- calendar ----------------------------- */

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * The month of the wedding with the day ringed — the one thing in the
 * reference that can't be faked with type. Weeks start Monday.
 */
export function MonthCalendar({ targetDate }: { targetDate?: string }) {
  if (!targetDate) return null;
  const d = new Date(targetDate);
  if (Number.isNaN(d.getTime())) return null;

  const year = d.getFullYear();
  const month = d.getMonth();
  const theDay = d.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // JS weeks start Sunday; shift so Monday is column 0
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;

  const cells: (number | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="w-full">
      <p
        className="text-center uppercase"
        style={{ fontFamily: MONO, fontSize: u(15), letterSpacing: "0.26em", color: "var(--v-gold)" }}
      >
        {MONTHS[month]} {year}
      </p>
      <div className="mt-[2%] grid grid-cols-7">
        {WEEKDAYS.map((w, i) => (
          <span
            key={i}
            className="text-center"
            style={{
              fontFamily: MONO,
              fontSize: u(12),
              color: "color-mix(in srgb, var(--v-ink) 50%, transparent)",
              paddingBottom: u(5),
            }}
          >
            {w}
          </span>
        ))}
        {cells.map((day, i) => {
          const isDay = day === theDay;
          return (
            <span key={i} className="flex items-center justify-center" style={{ height: u(27) }}>
              <span
                className="flex items-center justify-center"
                style={{
                  fontFamily: MONO,
                  fontSize: u(15),
                  lineHeight: 1,
                  width: u(25),
                  height: u(25),
                  borderRadius: "50%",
                  color: isDay ? "var(--v-cream)" : "var(--v-ink)",
                  background: isDay ? "var(--v-navy)" : "transparent",
                }}
              >
                {day ?? ""}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------- timeline ----------------------------- */

/**
 * The day's schedule as a route: a dashed rail with a hollow stop per event
 * and the last one filled, like the end of a flight path. Grows with however
 * many events the couple entered rather than assuming a fixed count.
 */
export function TimelineRail({
  events,
}: {
  events: { id: string; name: string; time: string; venue?: string }[];
}) {
  if (!events.length) return null;
  return (
    <div className="relative h-full w-full">
      <span
        aria-hidden
        className="absolute"
        style={{
          left: u(8),
          top: u(12),
          bottom: u(12),
          width: 1,
          backgroundImage: "linear-gradient(var(--v-gold) 60%, transparent 0%)",
          backgroundSize: `1px ${u(9)}`,
          backgroundRepeat: "repeat-y",
          opacity: 0.75,
        }}
      />
      <div className="flex h-full flex-col justify-between">
        {events.map((ev, i) => {
          const last = i === events.length - 1;
          return (
            <div key={ev.id} className="relative flex items-start" style={{ paddingLeft: u(32) }}>
              <span
                aria-hidden
                className="absolute rounded-full"
                style={{
                  left: 0,
                  top: u(3),
                  width: u(17),
                  height: u(17),
                  background: last ? "var(--v-gold)" : "var(--v-cream)",
                  border: `${u(2)} solid var(--v-gold)`,
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-[4%]">
                  <Value size={20}>{ev.name}</Value>
                  <Value size={20} className="shrink-0" style={{ color: "var(--v-gold)" }}>
                    {ev.time}
                  </Value>
                </div>
                {ev.venue ? (
                  <Body size={15} className="truncate">
                    {ev.venue}
                  </Body>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------- dress code ---------------------------- */

/** The palette guests are asked to wear, as painted chips. */
export const DEFAULT_DRESS = [
  { hex: "#f5f1e4", label: "Ivory" },
  { hex: "#e3d7bd", label: "Cream" },
  { hex: "#b8935a", label: "Gold" },
  { hex: "#1a2745", label: "Navy" },
  { hex: "#141414", label: "Black" },
];

export function DressCode({
  heading,
  note,
  swatches = DEFAULT_DRESS,
}: {
  heading: string;
  note?: string;
  swatches?: { hex: string; label: string }[];
}) {
  return (
    <div className="mx-auto w-full max-w-[420px] px-6 text-center">
      <h2 style={{ ...serifHead, color: "var(--v-cream)" }}>{heading}</h2>
      <span
        aria-hidden
        className="mx-auto mt-4 block"
        style={{ width: 54, height: 1, background: "var(--v-gold)" }}
      />
      {note ? (
        <p className="mx-auto mt-4 max-w-[34ch]" style={{ ...bodyText, color: "rgba(245,241,228,0.78)" }}>
          {note}
        </p>
      ) : null}
      <div className="mt-8 flex items-start justify-center gap-3">
        {swatches.map((s) => (
          <div key={s.label} className="flex flex-1 flex-col items-center">
            <span
              className="block w-full"
              style={{
                aspectRatio: "1 / 1",
                background: s.hex,
                border: "1px solid color-mix(in srgb, var(--v-gold) 55%, transparent)",
              }}
            />
            <span
              className="mt-2"
              style={{ ...label, color: "rgba(245,241,228,0.72)", letterSpacing: "0.14em" }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------- RSVP ------------------------------- */

/**
 * The RSVP written as the pass's tear-off stub: ruled entries, a mono
 * accept/decline pair, a perforation and a solid navy "Send". Shares its
 * behaviour with the brand form through `useRsvp`, so the meal keys, the
 * decline rules and the validation can't drift apart between designs.
 */
export function TicketRsvp({
  content,
  live = false,
}: {
  content: InvitationContent;
  live?: boolean;
}) {
  const { editing } = usePreview();
  const form = useRsvp({ content, live, editing });
  const rsvp = content.rsvp;

  const entry: CSSProperties = {
    ...entryText,
    background: "transparent",
    border: "none",
    outline: "none",
    width: "100%",
    padding: "6px 0",
  };

  if (form.submitted) {
    return (
      <StubSheet className="mx-auto w-full max-w-[420px] px-7 py-10 text-center">
        <span
          aria-hidden
          className="mx-auto flex items-center justify-center rounded-full"
          style={{ width: 62, height: 62, border: "2px solid var(--v-gold)", color: "var(--v-gold)", fontSize: 26 }}
        >
          ✓
        </span>
        <h2 className="mt-5" style={serifHead}>
          {form.attending === "accept" ? "Checked in" : "Noted with love"}
        </h2>
        <p className="mx-auto mt-3 max-w-[32ch]" style={bodyText}>
          {form.attending === "accept"
            ? `${form.guests > 1 ? `${form.guests} seats are` : "Your seat is"} reserved — ${form.names} can't wait to see you there.`
            : "We'll miss you, but thank you for letting us know."}
        </p>
        <StubButton tone="ghost" className="mt-6" onClick={form.reopen}>
          Change my answer
        </StubButton>
      </StubSheet>
    );
  }

  return (
    <StubSheet className="mx-auto w-full max-w-[420px]">
      <form onSubmit={editing ? (e) => e.preventDefault() : form.submit} className="px-7 pb-7 pt-8">
        <div className="flex items-start justify-between gap-3">
          <span data-edit="rsvp.heading" style={label}>
            {rsvp?.heading}
          </span>
          <span style={{ ...label, color: "color-mix(in srgb, var(--v-ink) 45%, transparent)" }}>
            {form.names}
          </span>
        </div>
        <span
          aria-hidden
          className="mt-3 block w-full"
          style={{ height: 1, background: "color-mix(in srgb, var(--v-gold) 55%, transparent)" }}
        />

        <TicketField label="Passenger name" className="mt-6">
          <input
            style={entry}
            value={form.name}
            onChange={(e) => form.setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />
        </TicketField>
        <TicketField label="Email (optional)" className="mt-5">
          <input
            style={entry}
            type="email"
            value={form.email}
            onChange={(e) => form.setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </TicketField>

        {form.email.trim() ? (
          <label className="mt-3 flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={form.subscribed}
              onChange={(e) => form.setSubscribed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ accentColor: "var(--v-navy)" }}
            />
            <span style={bodyText}>Send me updates about the wedding</span>
          </label>
        ) : null}

        <p data-edit="rsvp.prompt" className="mt-6" style={label}>
          {rsvp?.prompt}
        </p>
        <div className="mt-2 grid grid-cols-2">
          {(
            [
              ["accept", rsvp?.acceptLabel, "rsvp.acceptLabel"],
              ["decline", rsvp?.declineLabel, "rsvp.declineLabel"],
            ] as const
          ).map(([val, text, path], i) => {
            const on = form.attending === val;
            return (
              <button
                key={val}
                type="button"
                aria-pressed={on}
                onClick={editing ? undefined : () => form.setAttending(val)}
                className="uppercase"
                style={{
                  fontFamily: MONO,
                  fontSize: "clamp(10px, 2.9vw, 12px)",
                  letterSpacing: "0.12em",
                  padding: "13px 6px",
                  background: on ? "var(--v-navy)" : "transparent",
                  color: on ? "var(--v-cream)" : "var(--v-ink)",
                  // longhand throughout: React warns when a shorthand and a
                  // longhand for the same box are both updated on re-render
                  borderStyle: "solid",
                  borderColor: on ? "var(--v-navy)" : "color-mix(in srgb, var(--v-ink) 28%, transparent)",
                  // the pair reads as one control, so they share a middle edge
                  borderWidth: i === 1 ? "1px 1px 1px 0" : "1px",
                }}
              >
                <span data-edit={path}>{text}</span>
              </button>
            );
          })}
        </div>

        {form.showExtras ? (
          <div className="mt-5 flex items-end gap-5">
            <TicketField label="Seats" className="shrink-0">
              <span className="flex items-center gap-2 pb-1">
                <Stepper label="One fewer guest" onClick={() => form.stepGuests(-1)} disabled={editing || form.guests <= 1}>
                  −
                </Stepper>
                <span aria-live="polite" style={{ ...entryText, minWidth: 16, textAlign: "center" }}>
                  {form.guests}
                </span>
                <Stepper label="One more guest" onClick={() => form.stepGuests(1)} disabled={editing || form.guests >= 50}>
                  +
                </Stepper>
              </span>
            </TicketField>
            <TicketField label="Meal" className="flex-1">
              <span className="flex gap-1.5 pb-1">
                {MEALS.map((m) => {
                  const on = form.meal === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      aria-pressed={on}
                      onClick={editing ? undefined : () => form.pickMeal(m.key)}
                      className="uppercase"
                      style={{
                        fontFamily: MONO,
                        fontSize: "clamp(9px, 2.6vw, 11px)",
                        letterSpacing: "0.1em",
                        padding: "7px 9px",
                        background: on ? "var(--v-gold)" : "transparent",
                        color: on ? "var(--v-navy)" : "var(--v-ink)",
                        border: `1px solid ${on ? "var(--v-gold)" : "color-mix(in srgb, var(--v-ink) 25%, transparent)"}`,
                      }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </span>
            </TicketField>
          </div>
        ) : null}

        <TicketField label="A note for the couple" className="mt-5">
          <textarea
            style={{ ...entry, resize: "none", minHeight: 46 }}
            rows={2}
            maxLength={500}
            value={form.note}
            onChange={(e) => form.setNote(e.target.value)}
            placeholder="So happy for you both…"
          />
        </TicketField>

        {form.error ? (
          <p className="mt-3" style={{ ...bodyText, color: "#b3261e" }}>
            {form.error}
          </p>
        ) : null}

        <Perforation className="mt-7" />
        <StubButton type="submit" disabled={form.busy} className="mt-5 w-full">
          {form.busy ? "Sending…" : <span data-edit="rsvp.submitLabel">{rsvp?.submitLabel}</span>}
        </StubButton>
      </form>
    </StubSheet>
  );
}

function Stepper({
  children,
  label: text,
  onClick,
  disabled,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={text}
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center disabled:opacity-35"
      style={{
        width: 28,
        height: 28,
        fontSize: 16,
        lineHeight: 1,
        color: "var(--v-ink)",
        border: "1px solid color-mix(in srgb, var(--v-ink) 30%, transparent)",
      }}
    >
      {children}
    </button>
  );
}
