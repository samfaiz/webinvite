"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { InvitationContent } from "@/engine/types";
import { MEALS, useRsvp } from "@/blocks/useRsvp";
import { usePreview } from "@/components/PreviewContext";
import { DirectionsLink } from "@/components/DirectionsLink";
import { hasMapTarget, targetFromEvent } from "@/lib/maps";
import { ArchPanel, Bow, SprigDivider } from "./ornaments";

/**
 * Toile's own elements. None of these are the shared blocks: the programme is
 * a column of time pills rather than a card per event, the countdown is a
 * clock face of digits rather than four chips, and the RSVP is a printed
 * questionnaire — ruled entry lines and radio lists, the way the paper version
 * of this design would have been filled in by hand.
 */

const script: CSSProperties = { fontFamily: "var(--font-parisienne)" };
const serif: CSSProperties = { fontFamily: "var(--font-cormorant)" };

/** Small engraved caps — the label voice of the whole design. */
export function Caps({
  children,
  size = 11,
  className = "",
  tone = "ink",
  ...rest
}: {
  children: ReactNode;
  size?: number;
  className?: string;
  tone?: "ink" | "soft";
  "data-edit"?: string;
} & React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`uppercase ${className}`}
      style={{
        ...serif,
        fontSize: size,
        letterSpacing: "0.22em",
        lineHeight: 1.6,
        color: tone === "ink" ? "var(--t-ink)" : "var(--t-soft)",
      }}
      {...rest}
    >
      {children}
    </p>
  );
}

/** A section title, in the engraved serif. */
export function Title({
  children,
  className = "",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  "data-edit"?: string;
} & React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={`uppercase ${className}`}
      style={{ ...serif, fontSize: "clamp(20px, 5.6vw, 26px)", letterSpacing: "0.2em", color: "var(--t-ink)" }}
      {...rest}
    >
      {children}
    </h2>
  );
}

export function Body({
  children,
  className = "",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  "data-edit"?: string;
} & React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={className}
      style={{ ...serif, fontSize: "clamp(14px, 3.8vw, 16px)", lineHeight: 1.75, color: "var(--t-body)" }}
      {...rest}
    >
      {children}
    </p>
  );
}

/* ------------------------------ programme ----------------------------- */

/**
 * The day, as a column of time pills. A pill carries the hour, the event name
 * sits beside it and the note runs underneath in script — no card per event,
 * so a five-event day still reads on one screen.
 */
export function Programme({
  events,
}: {
  events: { id: string; name: string; time: string; venue?: string; verse?: string }[];
}) {
  if (!events.length) return null;
  return (
    <div className="mx-auto w-full max-w-sm">
      {events.map((e) => (
        <div key={e.id} className="mb-6 last:mb-0">
          <div
            className="flex items-center gap-3 rounded-full px-4 py-2.5"
            style={{
              background: "var(--t-paper)",
              border: "1px solid color-mix(in srgb, var(--t-line) 35%, transparent)",
            }}
          >
            <span
              style={{ ...serif, fontSize: 17, letterSpacing: "0.12em", color: "var(--t-ink)" }}
            >
              {e.time}
            </span>
            <span
              aria-hidden
              className="h-3.5 w-px shrink-0"
              style={{ background: "color-mix(in srgb, var(--t-line) 50%, transparent)" }}
            />
            <span
              className="min-w-0 flex-1 truncate uppercase"
              style={{ ...serif, fontSize: 14, letterSpacing: "0.16em", color: "var(--t-ink)" }}
            >
              {e.name}
            </span>
          </div>
          {e.verse || e.venue ? (
            <p
              className="mt-2 px-5 text-center"
              style={{ ...script, fontSize: 15, lineHeight: 1.6, color: "var(--t-body)" }}
            >
              {e.verse || e.venue}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ palette ------------------------------- */

/** The wedding's colours as painted tiles, with the name written beneath in
 *  script — the reference prints one square, but a couple may want several. */
export function Palette({
  swatches,
  caption,
}: {
  swatches: { hex: string; label: string }[];
  caption?: string;
}) {
  if (!swatches.length) return null;
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-center gap-3">
        {swatches.map((s, i) => (
          <span
            key={`${s.hex}-${i}`}
            title={s.label}
            className="block"
            style={{
              width: 46,
              height: 46,
              borderRadius: 6,
              background: s.hex,
              border: "1px solid color-mix(in srgb, var(--t-line) 45%, transparent)",
            }}
          />
        ))}
      </div>
      {caption ? (
        <p className="mt-3" style={{ ...script, fontSize: 17, color: "var(--t-body)" }}>
          {caption}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------- wishes ------------------------------- */

/** "Flowers", "Gifts", "Telegram chat" — the practical notes a couple wants
 *  to make without turning them into paragraphs. Ruled rows, engraving style. */
export function Wishes({ items }: { items: { title: string; body: string }[] }) {
  if (!items.length) return null;
  return (
    <div className="mx-auto w-full max-w-sm text-left">
      {items.map((w, i) => (
        <div
          key={i}
          className="py-4"
          style={{
            borderTop: i === 0 ? "none" : "1px solid color-mix(in srgb, var(--t-line) 30%, transparent)",
          }}
        >
          <Caps size={11}>{w.title}</Caps>
          <Body className="mt-1.5">{w.body}</Body>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------- countdown ------------------------------ */

const DAY = 864e5;
const HOUR = 36e5;
const MIN = 6e4;

function left(target: string) {
  const ms = new Date(target).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return null;
  return {
    d: Math.floor(ms / DAY),
    h: Math.floor((ms % DAY) / HOUR),
    m: Math.floor((ms % HOUR) / MIN),
    s: Math.floor((ms % MIN) / 1000),
  };
}

/** A clock face rather than four chips: `18 : 10 : 22 : 30`, colons and all. */
export function DigitCountdown({ targetDate, label }: { targetDate?: string; label?: string }) {
  const [t, setT] = useState<ReturnType<typeof left>>(null);

  useEffect(() => {
    if (!targetDate) return;
    const tick = () => setT(left(targetDate));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetDate]);

  if (!targetDate) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const parts = t ? [String(t.d), pad(t.h), pad(t.m), pad(t.s)] : ["--", "--", "--", "--"];

  return (
    <div className="text-center">
      {label ? (
        <p className="mb-3" style={{ ...script, fontSize: 19, color: "var(--t-body)" }}>
          {label}
        </p>
      ) : null}
      <p
        style={{
          ...serif,
          fontSize: "clamp(22px, 6.4vw, 30px)",
          letterSpacing: "0.12em",
          color: "var(--t-ink)",
        }}
      >
        {parts.map((p, i) => (
          <span key={i}>
            {i > 0 ? <span style={{ opacity: 0.45 }}> : </span> : null}
            {p}
          </span>
        ))}
      </p>
    </div>
  );
}

/* --------------------------- questionnaire ---------------------------- */

/** A ruled entry line — the paper form this design is imitating. */
function Ruled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-5 block text-left">
      <span
        className="mb-1 block"
        style={{ ...script, fontSize: 16, color: "var(--t-body)" }}
      >
        {label}
      </span>
      <span
        className="block"
        style={{ borderBottom: "1px solid color-mix(in srgb, var(--t-line) 55%, transparent)" }}
      >
        {children}
      </span>
    </label>
  );
}

/** An open circle that fills when chosen — a printed form's radio. */
function Radio({
  on,
  children,
  onClick,
  disabled,
}: {
  on: boolean;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2.5 py-1.5 text-left"
    >
      <span
        aria-hidden
        className="grid shrink-0 place-items-center rounded-full"
        style={{
          width: 14,
          height: 14,
          border: "1px solid color-mix(in srgb, var(--t-line) 70%, transparent)",
        }}
      >
        {on ? <span className="block rounded-full" style={{ width: 7, height: 7, background: "var(--t-ink)" }} /> : null}
      </span>
      <span style={{ ...serif, fontSize: 15, color: "var(--t-body)" }}>{children}</span>
    </button>
  );
}

/**
 * The RSVP as the printed questionnaire ("анкета") this design calls for:
 * ruled lines to write on and radio lists to tick, not boxed inputs and
 * buttons. Behaviour comes from the shared `useRsvp`, so the meal keys and the
 * decline rules match every other design.
 */
export function Questionnaire({
  content,
  live = false,
}: {
  content: InvitationContent;
  live?: boolean;
}) {
  const { editing } = usePreview();
  const form = useRsvp({ content, live, editing });
  const rsvp = content.rsvp;
  const askGuests = rsvp?.askGuests !== false;
  const askMeal = rsvp?.askMeal !== false;

  const entry: CSSProperties = {
    ...serif,
    fontSize: 16,
    color: "var(--t-ink)",
    background: "transparent",
    border: "none",
    outline: "none",
    width: "100%",
    padding: "4px 0 6px",
  };

  if (form.submitted) {
    return (
      <div className="mx-auto max-w-sm text-center">
        <SprigDivider width={140} />
        <p className="mt-4" style={{ ...script, fontSize: 26, color: "var(--t-ink)" }}>
          {form.attending === "accept" ? "Thank you — we cannot wait!" : "Thank you for telling us"}
        </p>
        <Body className="mt-3">
          {form.attending === "accept"
            ? `Your reply is saved${form.guests > 1 ? ` for ${form.guests}` : ""} — ${form.names} will be so glad to see you.`
            : "We will miss you on the day."}
        </Body>
        <button
          type="button"
          onClick={form.reopen}
          className="mt-5 rounded-full px-5 py-2.5"
          style={{
            ...serif,
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--t-ink)",
            border: "1px solid color-mix(in srgb, var(--t-line) 55%, transparent)",
          }}
        >
          Change my answer
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={editing ? (e) => e.preventDefault() : form.submit}
      className="mx-auto w-full max-w-sm"
    >
      <Ruled label="Your name">
        <input
          style={entry}
          value={form.name}
          onChange={(e) => form.setName(e.target.value)}
          autoComplete="name"
        />
      </Ruled>
      <Ruled label="Email (optional)">
        <input
          style={entry}
          type="email"
          value={form.email}
          onChange={(e) => form.setEmail(e.target.value)}
          autoComplete="email"
        />
      </Ruled>

      <div className="mb-5" role="radiogroup" aria-label={rsvp?.prompt}>
        <p className="mb-1" style={{ ...script, fontSize: 16, color: "var(--t-body)" }}>
          <span data-edit="rsvp.prompt">{rsvp?.prompt}</span>
        </p>
        <Radio
          on={form.attending === "accept"}
          disabled={editing}
          onClick={editing ? undefined : () => form.setAttending("accept")}
        >
          <span data-edit="rsvp.acceptLabel">{rsvp?.acceptLabel}</span>
        </Radio>
        <Radio
          on={form.attending === "decline"}
          disabled={editing}
          onClick={editing ? undefined : () => form.setAttending("decline")}
        >
          <span data-edit="rsvp.declineLabel">{rsvp?.declineLabel}</span>
        </Radio>
      </div>

      {form.showExtras && askGuests ? (
        <Ruled label="How many of you">
          <span className="flex items-center gap-4 pb-1">
            <button
              type="button"
              aria-label="One fewer guest"
              disabled={editing || form.guests <= 1}
              onClick={() => form.stepGuests(-1)}
              style={{ ...serif, fontSize: 20, color: "var(--t-ink)" }}
              className="disabled:opacity-35"
            >
              −
            </button>
            <span style={{ ...serif, fontSize: 18, color: "var(--t-ink)", minWidth: 18, textAlign: "center" }}>
              {form.guests}
            </span>
            <button
              type="button"
              aria-label="One more guest"
              disabled={editing || form.guests >= 50}
              onClick={() => form.stepGuests(1)}
              style={{ ...serif, fontSize: 20, color: "var(--t-ink)" }}
              className="disabled:opacity-35"
            >
              +
            </button>
          </span>
        </Ruled>
      ) : null}

      {form.showExtras && askMeal ? (
        <div className="mb-5" role="radiogroup" aria-label="Meal preference">
          <p className="mb-1" style={{ ...script, fontSize: 16, color: "var(--t-body)" }}>
            Preference at the table
          </p>
          {MEALS.map((m) => (
            <Radio
              key={m.key}
              on={form.meal === m.key}
              disabled={editing}
              onClick={editing ? undefined : () => form.pickMeal(m.key)}
            >
              {m.label}
            </Radio>
          ))}
        </div>
      ) : null}

      <Ruled label="A note for the couple">
        <textarea
          style={{ ...entry, resize: "none", minHeight: 44 }}
          rows={2}
          maxLength={500}
          value={form.note}
          onChange={(e) => form.setNote(e.target.value)}
        />
      </Ruled>

      {form.error ? (
        <p className="mb-3" style={{ ...serif, fontSize: 14, color: "#b3261e" }}>
          {form.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={form.busy}
        className="w-full rounded-full py-3.5 disabled:opacity-60"
        style={{
          ...serif,
          fontSize: 12,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--t-paper)",
          background: "var(--t-ink)",
        }}
      >
        {form.busy ? "Sending…" : <span data-edit="rsvp.submitLabel">{rsvp?.submitLabel}</span>}
      </button>
    </form>
  );
}

/* ------------------------------ location ------------------------------ */

/** The venue, on an arch panel with the route button the reference prints. */
export function Location({ content }: { content: InvitationContent }) {
  const ev = content.schedule?.events?.[0];
  const map = content.map ?? { points: [] };
  const target = ev ? targetFromEvent(ev) : {};
  if (map.directionsQuery?.trim()) {
    target.query = map.directionsQuery.trim();
    target.url = undefined;
  }
  if (map.directionsUrl?.trim()) target.url = map.directionsUrl.trim();

  return (
    <ArchPanel>
      <Title>Location</Title>
      <p className="mt-4" style={{ ...script, fontSize: 19, color: "var(--t-body)" }}>
        Address
      </p>
      <p className="mt-1" style={{ ...script, fontSize: 19, lineHeight: 1.5, color: "var(--t-ink)" }}>
        {[ev?.venue, ev?.address].filter(Boolean).join(", ")}
      </p>
      {hasMapTarget(target) ? (
        <DirectionsLink
          target={target}
          className="mt-6 inline-block rounded-full px-6 py-2.5"
          style={{
            ...serif,
            fontSize: 12,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--t-ink)",
            background: "var(--t-paper)",
            border: "1px solid color-mix(in srgb, var(--t-line) 45%, transparent)",
          }}
        >
          {map.directionsLabel ?? "Open the map"}
        </DirectionsLink>
      ) : null}
    </ArchPanel>
  );
}

/** The letter, under its ribbon. */
export function LetterPanel({ content }: { content: InvitationContent }) {
  const { families, hero, dateReveal } = content;
  return (
    <div className="relative mx-auto w-full max-w-sm pt-10">
      <Bow size={120} className="absolute left-1/2 top-0 -translate-x-1/2" />
      <ArchPanel className="pt-14">
        <Title data-edit="families.heading">{families?.heading}</Title>
        <p
          data-edit="hero.tagline"
          className="mt-5"
          style={{ ...script, fontSize: 18, lineHeight: 1.7, color: "var(--t-body)" }}
        >
          {hero?.tagline || families?.footer}
        </p>
        {dateReveal?.eventDate ? (
          <p
            data-edit="dateReveal.eventDate"
            className="mt-6"
            style={{ ...serif, fontSize: 19, letterSpacing: "0.14em", color: "var(--t-ink)" }}
          >
            {dateReveal.eventDate}
          </p>
        ) : null}
      </ArchPanel>
    </div>
  );
}
