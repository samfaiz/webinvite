"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { InvitationContent } from "@/engine/types";
import { Reveal } from "@/components/Reveal";
import { usePreview } from "@/components/PreviewContext";
import { VenueMap, resolveVenues } from "./VenueMap";
import { ArchedCard } from "@/components/ArchedCard";
import { DirectionsLink } from "@/components/DirectionsLink";
import { hasMapTarget, targetFromEvent } from "@/lib/maps";
import { calendarEvent, downloadIcs } from "@/lib/calendar";
import { MEALS, useRsvp } from "./useRsvp";

/**
 * The guest RSVP card: an invitation header band (who, when, where, plus the
 * two things a guest reaches for first — calendar and directions) sitting over
 * the reply form, then the venue map.
 *
 * Every colour comes from the active invitation theme (`--c-*`) so the card
 * re-skins with the couple's palette; the one fixed hue is the green on a
 * chosen "yes", which is semantic rather than decorative.
 *
 * When `live` (rendered on a published public page) it POSTs to the backend;
 * otherwise (demo / Studio preview) it just shows the thank-you state without
 * sending anything.
 */

/** "yes" reads as green in every palette — keep it out of the theme. */
const YES = "#1d7a4f";

const CARD = "color-mix(in srgb, var(--c-surface) 45%, white)";
const CARD_LINE = "color-mix(in srgb, var(--c-accent) 30%, transparent)";
/** legible text on the primary-coloured header band */
const ON_BAND = "color-mix(in srgb, var(--c-surface) 92%, white)";
const ON_BAND_SOFT = "color-mix(in srgb, var(--c-surface) 72%, var(--c-accent))";

export function RSVPForm({
  content,
  live = false,
}: {
  content: InvitationContent;
  live?: boolean;
}) {
  const { rsvp, couple } = content;
  /* the band follows whatever the couple chose for the opening screen */
  const stackedNames = couple.nameLayout === "stacked";
  /* both questions are on unless the couple turned them off */
  /* large widens the card, bumps the type, and takes back the side gutter —
     on a phone the card already fills max-w-md, so a wider cap alone would
     change nothing there */
  const large = rsvp.cardSize === "large";
  const band = rsvp.bandStyle ?? "filled";
  /* the band packs a lot into a small plate — this is the air it gets */
  const air = {
    compact: { pad: "px-5 pb-4 pt-4", name: "mt-2", date: "mt-1.5", acts: "mt-3", lead: "1.1" },
    regular: { pad: "px-6 pb-6 pt-6", name: "mt-3", date: "mt-2.5", acts: "mt-4", lead: "1.2" },
    roomy: { pad: "px-7 pb-9 pt-9", name: "mt-4", date: "mt-3.5", acts: "mt-6", lead: "1.3" },
  }[rsvp.bandDensity ?? "regular"];
  const showDateLine = rsvp.showDateLine !== false;
  const showActions = rsvp.showActions !== false;
  const askGuests = rsvp.askGuests !== false;
  const askMeal = rsvp.askMeal !== false;
  // tolerate invitations saved without a map block (API-created / legacy data)
  const map = content.map ?? { points: [] };
  const { editing } = usePreview();
  const form = useRsvp({ content, live, editing });
  const {
    name,
    email,
    subscribed,
    attending,
    guests,
    meal,
    note,
    submitted,
    error,
    busy,
    showExtras,
    names,
  } = form;

  const firstEv = content.schedule?.events?.[0];
  const whenWhere = [
    firstEv?.date || content.dateReveal?.eventDate,
    firstEv?.venue || content.dateReveal?.location,
  ]
    .filter(Boolean)
    .join(" · ");

  // directions target, most specific first: a pasted map link, then the manual
  // location text, then the first event's venue
  const target = firstEv ? targetFromEvent(firstEv) : {};
  if (map.directionsQuery?.trim()) {
    target.query = map.directionsQuery.trim();
    target.url = undefined; // manual text replaces the event's pasted link too
  }
  if (map.directionsUrl?.trim()) target.url = map.directionsUrl.trim();
  const canRoute = hasMapTarget(target);

  const cal = calendarEvent(
    content,
    content.meta?.slug && typeof window !== "undefined"
      ? window.location.origin + "/i/" + content.meta.slug
      : undefined,
  );

  const field = {
    background: CARD,
    border: "1px solid " + CARD_LINE,
    color: "var(--c-text)",
  } as const;

  const pillInk = band === "filled" ? ON_BAND_SOFT : "var(--c-secondary)";
  const pill = {
    color: pillInk,
    border: "1px solid color-mix(in srgb, " + pillInk + " 50%, transparent)",
  } as const;

  return (
    <section className={`py-20 ${large ? "px-3" : "px-6"}`}>
      <Reveal>
        <ArchedCard maxWidth={large ? "34rem" : undefined}>
          {/* ---------- invitation band ---------- */}
          {/* a rounded plate sitting inside the card, not a rectangle bled to
              its edges — square corners against the arch above read as pasted
              on, and the hard bottom rule cut the card in two */}
          <div
            className={`mt-1 rounded-[1.5rem] text-center ${air.pad}`}
            style={
              band === "filled"
                ? {
                    background: "var(--c-primary)",
                    border: "1px solid color-mix(in srgb, var(--c-accent) 50%, transparent)",
                    boxShadow: "0 10px 26px color-mix(in srgb, var(--c-primary) 22%, transparent)",
                  }
                : band === "outline"
                  ? { border: "1px solid color-mix(in srgb, var(--c-accent) 55%, transparent)" }
                  : undefined
            }
          >
            <p
              data-edit="rsvp.heading"
              className="font-display text-[10px] uppercase tracking-[0.26em]"
              style={{ color: band === "filled" ? "color-mix(in srgb, var(--c-accent) 75%, white)" : "var(--c-accent)" }}
            >
              {rsvp.heading}
            </p>
            {/* "Rejin & Dr. Jessin" used to wrap wherever it ran out of room,
                which broke mid-name. Each name is now unbreakable, so the only
                place a line can end is at the connector — and if the couple
                asked for stacked names, this band stacks with them. */}
            <h2
              className={`font-display ${air.name} ${
                stackedNames
                  ? `flex flex-col items-center ${large ? "text-[34px]" : "text-[28px]"}`
                  : `flex flex-wrap items-baseline justify-center gap-x-2 ${large ? "text-[30px] sm:text-[36px]" : "text-[26px] sm:text-[30px]"}`
              }`}
              style={{ color: band === "filled" ? ON_BAND : "var(--c-primary)", lineHeight: air.lead }}
            >
              <span className="whitespace-nowrap">{couple.partner1?.name}</span>
              <span
                className={stackedNames ? "text-[0.5em] uppercase tracking-[0.2em]" : "text-[0.72em]"}
                style={{ color: band === "filled" ? ON_BAND_SOFT : "var(--c-accent)" }}
              >
                {couple.connector ?? "&"}
              </span>
              <span className="whitespace-nowrap">{couple.partner2?.name}</span>
            </h2>
            {showDateLine && whenWhere ? (
              <p
                className={`font-body ${air.date} text-[13px]`}
                style={{ color: band === "filled" ? ON_BAND_SOFT : "var(--c-muted)" }}
              >
                {whenWhere}
              </p>
            ) : null}

            {showActions && (cal || canRoute) ? (
              <div className={`flex flex-wrap items-center justify-center gap-2 ${air.acts}`}>
                {cal ? (
                  <button
                    type="button"
                    onClick={editing ? undefined : () => downloadIcs(cal, "invitation.ics")}
                    className="font-body rounded-full px-3 py-1.5 text-[11px] font-semibold"
                    style={pill}
                  >
                    ＋ Add to calendar
                  </button>
                ) : null}
                {canRoute ? (
                  <DirectionsLink
                    target={target}
                    className="font-body rounded-full px-3 py-1.5 text-[11px] font-semibold"
                    style={pill}
                  >
                    ◎ Directions
                  </DirectionsLink>
                ) : null}
              </div>
            ) : null}
          </div>

          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="thanks"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center pt-8 text-center"
              >
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-full text-[28px] leading-none"
                  style={{ background: YES, color: "#fff" }}
                  aria-hidden
                >
                  ✓
                </span>
                <p
                  className="font-display mt-4 text-[26px]"
                  style={{ color: "var(--c-primary)" }}
                >
                  {attending === "accept" ? "You're on the list!" : "Thank you for telling us"}
                </p>
                <p
                  className="font-body mt-2 max-w-[30ch] text-sm leading-[1.6]"
                  style={{ color: "var(--c-text)" }}
                >
                  {attending === "accept"
                    ? "We have saved " +
                      (guests > 1 ? guests + " seats" : "your seat") +
                      " — " +
                      names +
                      " cannot wait to celebrate with you."
                    : "We will miss you, but we are glad you let us know."}
                </p>
                <button
                  type="button"
                  onClick={form.reopen}
                  className="font-body mt-5 rounded-full px-5 py-2.5 text-[13px] font-semibold"
                  style={{
                    color: "var(--c-primary)",
                    border: "1px solid color-mix(in srgb, var(--c-primary) 40%, transparent)",
                  }}
                >
                  Edit my RSVP
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={editing ? (e) => e.preventDefault() : form.submit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pt-6"
              >
                <input
                  value={name}
                  onChange={(e) => form.setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  className={`font-body w-full rounded-xl px-4 text-base outline-none ${large ? "py-4" : "py-3.5"}`}
                  style={field}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => form.setEmail(e.target.value)}
                  placeholder="Email (optional — for your confirmation)"
                  autoComplete="email"
                  className={`font-body mt-3 w-full rounded-xl px-4 text-base outline-none ${large ? "py-4" : "py-3.5"}`}
                  style={field}
                />
                {email.trim() ? (
                  <label
                    className="font-body mt-2.5 flex cursor-pointer items-start gap-2 text-[13px]"
                    style={{ color: "var(--c-text)" }}
                  >
                    <input
                      type="checkbox"
                      checked={subscribed}
                      onChange={(e) => form.setSubscribed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--c-primary)]"
                    />
                    <span>Send me updates about {names}&apos;s wedding</span>
                  </label>
                ) : null}

                {/* ---------- will you be joining us? ---------- */}
                <p
                  data-edit="rsvp.prompt"
                  className="font-display mt-6 text-center text-[20px]"
                  style={{ color: "var(--c-primary)" }}
                >
                  {rsvp.prompt}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {(
                    [
                      ["accept", rsvp.acceptLabel, "rsvp.acceptLabel"],
                      ["decline", rsvp.declineLabel, "rsvp.declineLabel"],
                    ] as const
                  ).map(([val, label, path]) => {
                    const active = attending === val;
                    const on = val === "accept" ? YES : "var(--c-primary)";
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={editing ? undefined : () => form.setAttending(val)}
                        aria-pressed={active}
                        className="font-body rounded-xl px-3 py-3.5 text-sm font-bold transition-all"
                        style={{
                          background: active ? on : CARD,
                          color: active ? "var(--c-bg)" : "var(--c-text)",
                          border: "1px solid " + (active ? on : CARD_LINE),
                        }}
                      >
                        <span data-edit={path}>{label}</span>
                      </button>
                    );
                  })}
                </div>

                {showExtras ? (
                  <>
                    {/* ---------- how many ---------- */}
                    {askGuests ? (
                    <div
                      className="mt-3 flex items-center justify-between rounded-xl px-4 py-3"
                      style={{ background: CARD, border: "1px solid " + CARD_LINE }}
                    >
                      <span className="font-body text-sm" style={{ color: "var(--c-text)" }}>
                        How many of you?
                      </span>
                      <div className="flex items-center gap-3">
                        <StepButton
                          label="One fewer guest"
                          disabled={editing || guests <= 1}
                          onClick={() => form.stepGuests(-1)}
                        >
                          −
                        </StepButton>
                        <span
                          className="font-body min-w-5 text-center text-[17px] font-bold"
                          style={{ color: "var(--c-primary)" }}
                          aria-live="polite"
                        >
                          {guests}
                        </span>
                        <StepButton
                          label="One more guest"
                          filled
                          disabled={editing || guests >= 50}
                          onClick={() => form.stepGuests(1)}
                        >
                          +
                        </StepButton>
                      </div>
                    </div>
                    ) : null}

                    {/* ---------- what they eat ---------- */}
                    {askMeal ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {MEALS.map((m) => {
                        const active = meal === m.key;
                        return (
                          <button
                            key={m.key}
                            type="button"
                            onClick={
                              editing
                                ? undefined
                                : () => form.pickMeal(m.key)
                            }
                            aria-pressed={active}
                            className="font-body rounded-full px-4 py-2 text-[13px] font-semibold transition-all"
                            style={{
                              background: active ? "var(--c-primary)" : CARD,
                              color: active ? "var(--c-bg)" : "var(--c-text)",
                              border: "1px solid " + (active ? "var(--c-primary)" : CARD_LINE),
                            }}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                    ) : null}
                  </>
                ) : null}

                {/* ---------- a note for the couple ---------- */}
                <textarea
                  value={note}
                  onChange={(e) => form.setNote(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="So happy for you both…"
                  className="font-body mt-3 min-h-14 w-full resize-y rounded-xl px-4 py-3 text-base outline-none"
                  style={field}
                />

                {error ? (
                  <p className="mt-3 text-center text-sm" style={{ color: "#b3261e" }}>
                    {error}
                  </p>
                ) : null}

                <motion.button
                  type="submit"
                  disabled={busy}
                  whileHover={{ scale: busy ? 1 : 1.02 }}
                  whileTap={{ scale: busy ? 1 : 0.98 }}
                  className={`font-body mt-5 w-full rounded-full text-base font-bold disabled:opacity-70 ${large ? "py-5 text-lg" : "py-4"}`}
                  style={{
                    background: "var(--c-primary)",
                    color: "var(--c-bg)",
                    boxShadow: "0 8px 22px color-mix(in srgb, var(--c-primary) 30%, transparent)",
                  }}
                >
                  {busy ? "Sending…" : <span data-edit="rsvp.submitLabel">{rsvp.submitLabel}</span>}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-8">
            <VenueMap venues={resolveVenues(content)} />
          </div>
        </ArchedCard>
      </Reveal>

      {rsvp.footer ? (
        <Reveal delay={0.1}>
          <p
            data-edit="rsvp.footer"
            className="font-script mt-10 text-center text-3xl"
            style={{ color: "var(--c-secondary)" }}
          >
            {rsvp.footer}
          </p>
        </Reveal>
      ) : null}

      {canRoute ? (
        <div className="mt-6 text-center">
          <DirectionsLink
            target={target}
            className="font-display inline-block rounded-full px-7 py-3 text-[11px] uppercase tracking-[0.2em]"
            style={{
              color: "var(--c-secondary)",
              border: "1px solid color-mix(in srgb, var(--c-accent) 40%, transparent)",
            }}
          >
            ♥ {map.directionsLabel ?? "Get Directions"}
          </DirectionsLink>
        </div>
      ) : null}
    </section>
  );
}

/** The round −/+ of the guest stepper. */
function StepButton({
  children,
  label,
  onClick,
  disabled,
  filled = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  filled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-full text-[18px] leading-none transition-opacity disabled:opacity-40"
      style={{
        background: filled ? "var(--c-primary)" : "transparent",
        color: filled ? "var(--c-bg)" : "var(--c-primary)",
        border:
          "1px solid color-mix(in srgb, var(--c-primary) " +
          (filled ? 100 : 40) +
          "%, transparent)",
      }}
    >
      {children}
    </button>
  );
}
