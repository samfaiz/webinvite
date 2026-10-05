"use client";

import type { CSSProperties, ReactNode } from "react";
import type { InvitationContent } from "@/engine/types";
import { usePreview } from "@/components/PreviewContext";
import { MEALS, useRsvp } from "@/blocks/useRsvp";
import { calendarEvent, downloadIcs } from "@/lib/calendar";
import { ActionButton, Icon, Rise, SERIF } from "./kit";

/**
 * The RSVP form shared by the plate designs (Secret Garden, Blue Hydrangea).
 * It draws in the design's own colours through three variables every such
 * design sets: --g-ink (buttons, labels), --g-cream (text on ink) and
 * --g-soft (secondary text).
 */

/* ------------------------------ the reply ------------------------------ */

const label: CSSProperties = {
  fontFamily: SERIF,
  fontSize: 19,
  fontWeight: 700,
  color: "var(--g-ink)",
  lineHeight: 1.25,
  display: "block",
  marginBottom: 8,
};
const field: CSSProperties = {
  width: "100%",
  minHeight: 52,
  padding: "10px 16px",
  fontFamily: SERIF,
  fontSize: 19,
  fontWeight: 500,
  color: "var(--g-ink)",
  background: "rgba(255,255,255,0.65)",
  border: "1.5px solid color-mix(in srgb, var(--g-ink) 40%, transparent)",
  borderRadius: 14,
  outline: "none",
};

/** A big either/or choice: a full-width button that fills when chosen. */
function Choice({ on, onClick, icon, children }: { on: boolean; onClick: () => void; icon: "check" | "x"; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="flex w-full items-center justify-center"
      style={{
        gap: 10,
        minHeight: 56,
        padding: "0 18px",
        borderRadius: 999,
        fontFamily: SERIF,
        fontSize: 19,
        fontWeight: 600,
        background: on ? "var(--g-ink)" : "rgba(255,255,255,0.55)",
        color: on ? "var(--g-cream)" : "var(--g-ink)",
        border: "1.5px solid var(--g-ink)",
        boxShadow: on ? "inset 0 0 0 3px var(--g-ink), inset 0 0 0 4px rgba(241,234,218,0.5)" : undefined,
        transition: "background 200ms, color 200ms",
      }}
    >
      {icon === "check" ? (
        <Icon name="check" size={22} />
      ) : (
        <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      )}
      {children}
    </button>
  );
}

/**
 * The RSVP, right on the page: will you come, your name, how many, food, a
 * note, send. Everything is a large, labelled target; nothing is hidden behind
 * a link. Behaviour is the shared `useRsvp`, so it records exactly what every
 * other design records.
 */
export function ReplyForm({ content, live }: { content: InvitationContent; live: boolean }) {
  const { editing } = usePreview();
  const form = useRsvp({ content, live, editing });
  const rsvp = content.rsvp;
  const askGuests = rsvp?.askGuests !== false;
  const askMeal = rsvp?.askMeal !== false;
  const cal = calendarEvent(content);

  if (form.submitted) {
    const yes = form.attending === "accept";
    return (
      <Rise className="flex w-full flex-col items-center" style={{ gap: 14, maxWidth: 420 }}>
        <span
          className="flex items-center justify-center rounded-full"
          style={{ width: 64, height: 64, background: "var(--g-ink)", color: "var(--g-cream)" }}
        >
          <Icon name={yes ? "check" : "send"} size={30} />
        </span>
        <p style={{ fontFamily: "var(--font-greatvibes)", fontSize: 44, color: "var(--g-ink)", lineHeight: 1.1 }}>
          {yes ? "Thank you!" : "We will miss you"}
        </p>
        <p style={{ fontFamily: SERIF, fontSize: 20, color: "var(--g-soft)", lineHeight: 1.45 }}>
          {yes
            ? `Your reply has been sent. ${form.guests > 1 ? `${form.guests} seats are` : "A seat is"} saved for you.`
            : "Your reply has been sent. Thank you for letting us know."}
        </p>
        {yes && cal ? (
          <ActionButton icon="calendar" onClick={() => downloadIcs(cal, "invitation.ics")}>
            Add to my calendar
          </ActionButton>
        ) : null}
        <button
          type="button"
          onClick={form.reopen}
          style={{ fontFamily: SERIF, fontSize: 18, color: "var(--g-ink)", textDecoration: "underline", minHeight: 44 }}
        >
          Change my reply
        </button>
      </Rise>
    );
  }

  return (
    <form onSubmit={editing ? (e) => e.preventDefault() : form.submit} className="w-full text-left" style={{ maxWidth: 420 }}>
      <Rise>
        <span style={{ ...label, textAlign: "center", fontSize: 21 }}>{rsvp?.prompt || "Will you be attending?"}</span>
        <div className="flex flex-col" style={{ gap: 10 }}>
          <Choice on={form.attending === "accept"} onClick={() => form.setAttending("accept")} icon="check">
            {rsvp?.acceptLabel || "Yes, I will come"}
          </Choice>
          <Choice on={form.attending === "decline"} onClick={() => form.setAttending("decline")} icon="x">
            {rsvp?.declineLabel || "Sorry, I can't come"}
          </Choice>
        </div>
      </Rise>

      <Rise delay={0.1}>
        <label className="mt-6 block">
          <span style={label}>Your name</span>
          <input
            style={field}
            value={form.name}
            onChange={(e) => form.setName(e.target.value)}
            autoComplete="name"
            placeholder="Type your name"
          />
        </label>
      </Rise>

      {form.showExtras && askGuests ? (
        <div className="mt-6">
          <span style={label}>How many people are coming, including you?</span>
          <div className="flex items-center justify-center" style={{ gap: 18 }}>
            <button
              type="button"
              aria-label="One fewer"
              disabled={form.guests <= 1}
              onClick={() => form.stepGuests(-1)}
              className="flex items-center justify-center rounded-full disabled:opacity-40"
              style={{ width: 52, height: 52, border: "1.5px solid var(--g-ink)", color: "var(--g-ink)", fontSize: 28, fontFamily: SERIF }}
            >
              −
            </button>
            <span style={{ fontFamily: SERIF, fontSize: 34, fontWeight: 600, color: "var(--g-ink)", minWidth: 40, textAlign: "center" }}>
              {form.guests}
            </span>
            <button
              type="button"
              aria-label="One more"
              disabled={form.guests >= 50}
              onClick={() => form.stepGuests(1)}
              className="flex items-center justify-center rounded-full disabled:opacity-40"
              style={{ width: 52, height: 52, background: "var(--g-ink)", color: "var(--g-cream)", fontSize: 28, fontFamily: SERIF }}
            >
              +
            </button>
          </div>
        </div>
      ) : null}

      {form.showExtras && askMeal ? (
        <div className="mt-6">
          <span style={label}>Food preference</span>
          <div className="flex flex-wrap justify-center" style={{ gap: 10 }}>
            {MEALS.map((m) => {
              const on = form.meal === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => form.pickMeal(m.key)}
                  style={{
                    minHeight: 50,
                    minWidth: 120,
                    padding: "0 22px",
                    borderRadius: 999,
                    fontFamily: SERIF,
                    fontSize: 18,
                    fontWeight: 600,
                    background: on ? "var(--g-ink)" : "rgba(255,255,255,0.55)",
                    color: on ? "var(--g-cream)" : "var(--g-ink)",
                    border: "1.5px solid color-mix(in srgb, var(--g-ink) 60%, transparent)",
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <label className="mt-6 block">
        <span style={label}>
          A message for the couple <span style={{ fontWeight: 500, color: "var(--g-soft)" }}>(optional)</span>
        </span>
        <textarea
          style={{ ...field, resize: "none", minHeight: 88 }}
          rows={3}
          maxLength={500}
          value={form.note}
          onChange={(e) => form.setNote(e.target.value)}
        />
      </label>

      {form.error ? (
        <p className="mt-4 text-center" role="alert" style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: "#9b2c22" }}>
          {form.error}
        </p>
      ) : null}

      <div className="mt-7">
        <ActionButton icon="send" type="submit" wide disabled={form.busy}>
          {form.busy ? "Sending…" : rsvp?.submitLabel || "Send my reply"}
        </ActionButton>
      </div>
    </form>
  );
}
