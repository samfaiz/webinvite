"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { InvitationContent, RenderProps } from "@/engine/types";
import { PreviewContext, usePreview } from "@/components/PreviewContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SmoothScroll } from "@/components/SmoothScroll";
import { MusicToggle } from "@/components/MusicToggle";
import { ScrollGuide } from "@/components/ScrollGuide";
import { StyleOverrides } from "@/components/StyleOverrides";
import { TextOffsets } from "@/templates/TextOffsets";
import { DirectionsLink } from "@/components/DirectionsLink";
import { hasDressCode } from "@/blocks/DressCode";
import { MEALS, useRsvp } from "@/blocks/useRsvp";
import { hasMapTarget, targetFromEvent } from "@/lib/maps";
import { Plate, Zone, u } from "./stage";
import {
  Body,
  Caps,
  DateCartouche,
  Flourish,
  Heading,
  OvalSwatch,
  Pill,
  Pip,
  SCRIPT,
  SERIF,
  Script,
  SealMonogram,
  TimelineStop,
  pillStyle,
} from "./kit";

/**
 * "Secret Garden" — an old-master garden at dusk and engraved magnolias on olive.
 *
 * Seven painted and engraved plates carry the look; this file composes the
 * Garden kit (`kit.tsx`) onto them. Every box below was measured off the
 * plates — the heart's sage face, the lace oval, the empty arch under each
 * garland, the blank wax seal — so the words sit inside the drawing rather
 * than beside it.
 *
 * The timeline icons were lifted off their plate and are laid out here, which
 * is why any number of events fits.
 */

const A = (f: string) => `/assets/templates/garden/${f}`;
const ICONS = ["icon-guests.png", "icon-swans.png", "icon-cake.png", "icon-glasses.png"];

const PALETTE = {
  "--g-olive": "#545738",
  "--g-dusk": "#2a2316", // the paintings' own edge colour
  "--g-cream": "#f1eada",
  "--g-ink": "#4f5337",
  "--g-soft": "#6f7156",
  "--g-paper": "#efe9d6", // type on the olive and on the paintings
  // the floating music / scroll buttons: the antique gold of the cover's
  // sunlit sky — olive would vanish into the olive pages
  "--chrome-bg": "#9c844f",
  "--chrome-fg": "#f8f3e6",
  "--chrome-ring": "rgba(248,243,230,0.6)",
} as CSSProperties;

const PAPER_SOFT = "color-mix(in srgb, var(--g-paper) 84%, transparent)";

function monogram(a?: string, b?: string) {
  return [a, b]
    .map((n) => n?.trim().charAt(0).toUpperCase())
    .filter(Boolean)
    .join("·");
}

function useCountdown(target?: string) {
  const [left, setLeft] = useState<{ d: number; h: number; m: number } | null>(null);
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const ms = new Date(target).getTime() - Date.now();
      if (Number.isNaN(ms) || ms <= 0) return setLeft(null);
      setLeft({ d: Math.floor(ms / 864e5), h: Math.floor((ms % 864e5) / 36e5), m: Math.floor((ms % 36e5) / 6e4) });
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [target]);
  return left;
}

/* ----------------------------- RSVP ----------------------------- */

/**
 * The guest questionnaire, opened from the details page (and the cover's
 * RSVP link) the way the reference's "fill in the form" button does. It
 * slides up as a cream sheet wearing the set's own garlands; behaviour is the
 * shared `useRsvp`, so the meal keys and decline rules match every design.
 */
function RsvpSheet({
  content,
  live,
  onClose,
}: {
  content: InvitationContent;
  live: boolean;
  onClose: () => void;
}) {
  const { editing } = usePreview();
  const form = useRsvp({ content, live, editing });
  const rsvp = content.rsvp;
  const askGuests = rsvp?.askGuests !== false;
  const askMeal = rsvp?.askMeal !== false;

  // the sheet uses real units, not cqw: it's a form a guest types into
  const label: CSSProperties = { fontFamily: SCRIPT, fontSize: 23, color: "var(--g-ink)", lineHeight: 1.2 };
  const field: CSSProperties = {
    fontFamily: SERIF,
    fontSize: 17,
    color: "var(--g-ink)",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid color-mix(in srgb, var(--g-ink) 35%, transparent)",
    outline: "none",
    width: "100%",
    padding: "6px 0",
  };
  const choice = (on: boolean): CSSProperties => ({
    fontFamily: SERIF,
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    padding: "10px 16px",
    borderRadius: 999,
    background: on ? "var(--g-ink)" : "transparent",
    color: on ? "var(--g-cream)" : "var(--g-ink)",
    border: "1px solid color-mix(in srgb, var(--g-ink) 45%, transparent)",
    // the same engraved inner line as the plates' buttons, once chosen
    boxShadow: on ? "inset 0 0 0 2px var(--g-ink), inset 0 0 0 3px rgba(241,234,218,0.5)" : undefined,
  });
  const rule = (
    <svg viewBox="0 0 240 24" className="mx-auto mt-1 block w-40" aria-hidden style={{ color: "var(--g-ink)" }}>
      <path d="M20 12 H 220" stroke="currentColor" strokeWidth="0.6" opacity="0.45" />
      <path d="M120 5.5 L 126.5 12 L 120 18.5 L 113.5 12 Z" fill="var(--g-cream)" stroke="currentColor" strokeWidth="0.9" />
      <path d="M120 9 L 123 12 L 120 15 L 117 12 Z" fill="currentColor" fillOpacity="0.55" />
    </svg>
  );

  return (
    <motion.div
      className="fixed inset-0 z-[80] overflow-y-auto"
      style={{ background: "color-mix(in srgb, var(--g-olive) 94%, transparent)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative mx-auto my-8 w-[92%] max-w-md px-7 pb-10 pt-6 text-center"
        style={{
          background: "var(--g-cream)",
          borderRadius: "220px 220px 220px 220px / 140px 140px 140px 140px",
          boxShadow: "0 24px 60px rgba(20,22,10,0.35)",
        }}
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-7 top-6"
          style={{ fontFamily: SERIF, fontSize: 22, color: "var(--g-soft)" }}
        >
          ✕
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={A("garland-top.png")} alt="" className="mx-auto w-[86%]" />

        {form.submitted ? (
          <div className="py-8">
            <p style={{ fontFamily: SCRIPT, fontSize: 42, color: "var(--g-ink)" }}>
              {form.attending === "accept" ? "Thank you!" : "We will miss you"}
            </p>
            {rule}
            <p className="mx-auto mt-3 max-w-[30ch]" style={{ fontFamily: SERIF, fontSize: 17, color: "var(--g-soft)" }}>
              {form.attending === "accept"
                ? `${form.guests > 1 ? `${form.guests} seats are` : "Your seat is"} saved — we cannot wait to see you.`
                : "Thank you for letting us know."}
            </p>
            <button type="button" onClick={form.reopen} className="mt-6" style={choice(false)}>
              Change my answer
            </button>
          </div>
        ) : (
          <form onSubmit={editing ? (e) => e.preventDefault() : form.submit} className="text-left">
            <p className="text-center" style={{ fontFamily: SCRIPT, fontSize: 44, color: "var(--g-ink)", lineHeight: 1.1 }}>
              {rsvp?.heading}
            </p>
            {rule}
            <p
              className="mx-auto mt-2 max-w-[28ch] text-center"
              style={{ fontFamily: SERIF, fontSize: 15, fontStyle: "italic", color: "var(--g-soft)" }}
            >
              Please reply so we can prepare for your arrival with care.
            </p>

            <label className="mt-6 block">
              <span style={label}>Your name</span>
              <input style={field} value={form.name} onChange={(e) => form.setName(e.target.value)} autoComplete="name" />
            </label>
            <label className="mt-5 block">
              <span style={label}>Email (optional)</span>
              <input
                style={field}
                type="email"
                value={form.email}
                onChange={(e) => form.setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>

            <p className="mt-6" style={label}>
              {rsvp?.prompt}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" style={choice(form.attending === "accept")} onClick={() => form.setAttending("accept")}>
                {rsvp?.acceptLabel}
              </button>
              <button type="button" style={choice(form.attending === "decline")} onClick={() => form.setAttending("decline")}>
                {rsvp?.declineLabel}
              </button>
            </div>

            {form.showExtras && askGuests ? (
              <div className="mt-6">
                <p style={label}>How many of you</p>
                <div className="mt-2 flex items-center gap-4">
                  <button type="button" style={choice(false)} disabled={form.guests <= 1} onClick={() => form.stepGuests(-1)}>
                    −
                  </button>
                  <span style={{ fontFamily: SERIF, fontSize: 22, color: "var(--g-ink)", minWidth: 18, textAlign: "center" }}>
                    {form.guests}
                  </span>
                  <button type="button" style={choice(false)} disabled={form.guests >= 50} onClick={() => form.stepGuests(1)}>
                    +
                  </button>
                </div>
              </div>
            ) : null}

            {form.showExtras && askMeal ? (
              <div className="mt-6">
                <p style={label}>At the table</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {MEALS.map((m) => (
                    <button key={m.key} type="button" style={choice(form.meal === m.key)} onClick={() => form.pickMeal(m.key)}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <label className="mt-6 block">
              <span style={label}>A note for the couple</span>
              <textarea
                style={{ ...field, resize: "none", minHeight: 52 }}
                rows={2}
                maxLength={500}
                value={form.note}
                onChange={(e) => form.setNote(e.target.value)}
              />
            </label>

            {form.error ? (
              <p className="mt-3" style={{ fontFamily: SERIF, fontSize: 15, color: "#9b2c22" }}>
                {form.error}
              </p>
            ) : null}

            <div className="mt-8 text-center">
              <button
                type="submit"
                disabled={form.busy}
                className="disabled:opacity-60"
                style={{
                  fontFamily: SERIF,
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  padding: "14px 38px",
                  borderRadius: 999,
                  background: "var(--g-ink)",
                  color: "var(--g-cream)",
                  boxShadow:
                    "inset 0 0 0 3px var(--g-ink), inset 0 0 0 4px rgba(241,234,218,0.55), 0 6px 18px rgba(30,32,18,0.2)",
                }}
              >
                {form.busy ? "Sending…" : rsvp?.submitLabel}
              </button>
            </div>
          </form>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={A("garland-bottom.png")} alt="" className="mx-auto mt-6 w-[86%]" />
      </motion.div>
    </motion.div>
  );
}

/* ---------------------------- details ---------------------------- */

/** One of the small cards under the RSVP: a script title, a line, a button.
 *  Two sit side by side, so the line is clamped rather than left to run. */
function ContactCard({ title, line, action }: { title: string; line: ReactNode; action: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center text-center">
      <Script size={54}>{title}</Script>
      <Body size={27} className="line-clamp-2 max-w-[94%] leading-snug">
        {line}
      </Body>
      {/* pinned to the foot so both buttons line up whatever the line above */}
      <div style={{ marginTop: "auto", paddingTop: u(18) }}>{action}</div>
    </div>
  );
}

/* --------------------------- the template --------------------------- */

export function GardenTemplate({
  content,
  theme,
  live = false,
  snap = false,
  compact = false,
  editing = false,
}: RenderProps & {
  intro?: boolean;
  live?: boolean;
  snap?: boolean;
  compact?: boolean;
  editing?: boolean;
}) {
  const [sheet, setSheet] = useState(false);
  const { couple, families, hero, schedule, countdown, rsvp, story, map, dateReveal } = content;
  const names = [couple.partner1?.name, couple.partner2?.name].filter(Boolean);
  const firstEv = schedule?.events?.[0];
  const photo = story?.items?.find((s) => s.photo)?.photo;
  const hidden = content.hiddenSections ?? [];
  const dress = content.dressCode;
  const wishes = content.wishes ?? [];
  const contacts = content.contacts ?? {};
  const left = useCountdown(countdown?.targetDate);
  // the plate leaves room for five rows at most before they crowd the garland
  const events = (schedule?.events ?? []).slice(0, 5);
  const showDress = !hidden.includes("dresscode") && (hasDressCode(content) || wishes.length > 0);
  const showRsvp = !hidden.includes("rsvp");
  const date = { iso: countdown?.targetDate, fallback: dateReveal?.eventDate };

  const target = firstEv ? targetFromEvent(firstEv) : {};
  if (map?.directionsQuery?.trim()) {
    target.query = map.directionsQuery.trim();
    target.url = undefined;
  }
  if (map?.directionsUrl?.trim()) target.url = map.directionsUrl.trim();

  const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const openSheet = () => {
    if (!editing) setSheet(true);
  };

  // under the RSVP on the details plate: the group chat and a day-of
  // contact, side by side, each only when the couple has set it
  const cards: { key: string; title: string; line: ReactNode; action: ReactNode }[] = [];
  if (contacts.chatUrl?.trim()) {
    cards.push({
      key: "chat",
      title: "Our chat",
      line: contacts.chatNote?.trim() || "Photos and wishes, all in one place",
      action: (
        <Pill href={contacts.chatUrl.trim()} size={19}>
          Join
        </Pill>
      ),
    });
  }
  if (contacts.phone?.trim()) {
    cards.push({
      key: "day",
      title: "On the day",
      line: contacts.contactName?.trim() ? `Ask for ${contacts.contactName.trim()}` : contacts.phone.trim(),
      action: (
        <Pill href={`tel:${contacts.phone.replace(/[^\d+]/g, "")}`} size={19}>
          Call
        </Pill>
      ),
    });
  }

  const attireCols = (
    [
      ["For her", dress?.her],
      ["For him", dress?.him],
      ["Children", dress?.kids],
    ] as [string, string | undefined][]
  ).filter(([, v]) => v?.trim());

  return (
    <PreviewContext.Provider value={{ compact, editing }}>
      <ThemeProvider
        theme={theme}
        className={`relative overflow-x-hidden ${snap ? "h-svh snap-y snap-mandatory overflow-y-auto" : "min-h-screen"}`}
      >
        <div style={PALETTE}>
          {snap ? null : <SmoothScroll />}
          <StyleOverrides content={content} />
          <TextOffsets offsets={content.offsets} />

          <main>
            {/* ------------------------------ 1 · cover ------------------------------ */}
            <Plate id="frame-couple" art={A("01-cover.jpg")} field="var(--g-dusk)">
              <Zone box={{ x0: 0.04, y0: 0.016, x1: 0.96, y1: 0.052 }} className="flex-row items-center justify-center">
                {(
                  [
                    ["Venue", () => goTo("frame-venue")],
                    ["Timing", () => goTo("frame-schedule")],
                    ["Details", () => goTo(showDress ? "frame-dresscode" : "frame-rsvp")],
                    ...(showRsvp ? ([["RSVP", openSheet]] as [string, () => void][]) : []),
                  ] as [string, () => void][]
                ).map(([label, act], i) => (
                  <span key={label} className="flex items-center">
                    {i > 0 ? (
                      <span
                        aria-hidden
                        style={{ color: "var(--g-paper)", opacity: 0.6, fontSize: u(13), margin: `0 ${u(24)}` }}
                      >
                        ◆
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={act}
                      className="uppercase"
                      style={{
                        fontFamily: SERIF,
                        fontSize: u(25),
                        fontWeight: 600,
                        letterSpacing: "0.2em",
                        color: "var(--g-paper)",
                        textShadow: "0 1px 8px rgba(0,0,0,0.6)",
                      }}
                    >
                      {label}
                    </button>
                  </span>
                ))}
              </Zone>

              {/* On the sage face of the heart, one line per band. Measured: the
                  lobes join at .65 where it is .31–.69 wide; .70 → .32–.68;
                  .74 → .37–.63; then it closes fast. */}
              <Zone box={{ x0: 0.3, y0: 0.627, x1: 0.7, y1: 0.684 }} className="items-center justify-end">
                <Script size={74} color="#fbf8f0" className="whitespace-nowrap drop-shadow-[0_1px_2px_rgba(40,48,30,0.35)]">
                  Wedding Day
                </Script>
              </Zone>
              <Zone box={{ x0: 0.33, y0: 0.686, x1: 0.67, y1: 0.712 }} className="items-center justify-center text-center">
                <Caps size={names.join(" & ").length > 18 ? 21 : 26} color="#fbf8f0" track={0.2} className="leading-tight">
                  {names.join(" & ")}
                </Caps>
              </Zone>
              <Zone box={{ x0: 0.35, y0: 0.714, x1: 0.65, y1: 0.742 }} className="items-center justify-center">
                <DateCartouche {...date} color="#f6f2e6" size={19} />
              </Zone>

              {/* the blank wax seal, pressed with their initials */}
              <Zone box={{ x0: 0.475, y0: 0.7936, x1: 0.525, y1: 0.8215 }}>
                <SealMonogram initials={monogram(couple.partner1?.name, couple.partner2?.name)} />
              </Zone>
            </Plate>

            {/* ----------------------------- 2 · welcome ----------------------------- */}
            {hidden.includes("families") ? null : (
              <Plate id="frame-families" art={A("02-welcome.jpg")}>
                {photo ? (
                  <Zone box={{ x0: 0.383, y0: 0.174, x1: 0.616, y1: 0.348 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt="" className="h-full w-full object-cover" style={{ borderRadius: "50%" }} />
                  </Zone>
                ) : null}
                <Zone box={{ x0: 0.11, y0: 0.376, x1: 0.89, y1: 0.608 }} className="items-center justify-center text-center">
                  <Heading size={76} flourish={250} edit="families.heading">
                    {families?.heading}
                  </Heading>
                  <Body className="mt-[3%] max-w-[88%]" edit="families.footer">
                    {families?.footer || hero?.tagline}
                  </Body>
                  <Script size={66} className="mt-[5%]">
                    Save the Date
                  </Script>
                  {countdown?.subtext ? (
                    <Caps size={20} color="var(--g-soft)" track={0.26} edit="countdown.subtext">
                      {countdown.subtext}
                    </Caps>
                  ) : null}
                  <div className="mt-[3%]">
                    <DateCartouche {...date} size={26} />
                  </div>
                </Zone>
              </Plate>
            )}

            {/* ------------------------------ 3 · venue ------------------------------ */}
            <Plate id="frame-venue" art={A("03-venue.jpg")}>
              <Zone box={{ x0: 0.08, y0: 0.07, x1: 0.92, y1: 0.465 }} className="items-center justify-center text-center">
                <Heading size={92} color="var(--g-paper)" flourish={300}>
                  Venue
                </Heading>
                <div className="mt-[5%]">
                  <DateCartouche {...date} color="var(--g-paper)" size={28} />
                </div>
                {firstEv?.venue ? (
                  <Caps size={36} color="var(--g-paper)" track={0.18} className="mt-[7%]">
                    “{firstEv.venue}”
                  </Caps>
                ) : null}
                {firstEv?.address ? (
                  <Body color={PAPER_SOFT} className="mt-[1.5%] max-w-[86%]">
                    {firstEv.address}
                  </Body>
                ) : null}
              </Zone>
              {hasMapTarget(target) ? (
                <Zone box={{ x0: 0.1, y0: 0.83, x1: 0.9, y1: 0.94 }} className="items-center justify-center">
                  <DirectionsLink target={target} style={pillStyle("cream")}>
                    {map?.directionsLabel ?? "View on map"}
                  </DirectionsLink>
                </Zone>
              ) : null}
            </Plate>

            {/* ------------------------------ 4 · timing ----------------------------- */}
            {hidden.includes("schedule") || !events.length ? null : (
              <Plate id="frame-schedule" art={A("04-timing.jpg")}>
                {/* the empty arch under the garland's crown */}
                <Zone box={{ x0: 0.3, y0: 0.224, x1: 0.7, y1: 0.28 }} className="items-center justify-center">
                  <Script size={64} edit="schedule.heading">
                    {schedule.heading}
                  </Script>
                </Zone>
                <Zone box={{ x0: 0.17, y0: 0.288, x1: 0.83, y1: 0.724 }} className="items-center justify-around text-center">
                  {events.map((ev, i) => (
                    <div key={ev.id} className="flex w-full flex-col items-center">
                      {i > 0 ? (
                        <div className="w-full" style={{ marginBottom: u(events.length > 3 ? 6 : 14) }}>
                          <Pip width={140} color="var(--g-ink)" />
                        </div>
                      ) : null}
                      <TimelineStop
                        icon={A(ICONS[i % ICONS.length])}
                        time={ev.time}
                        name={ev.name}
                        note={ev.venue}
                        iconSize={events.length > 4 ? 62 : events.length > 3 ? 80 : 100}
                        compact={events.length > 3}
                      />
                    </div>
                  ))}
                </Zone>
              </Plate>
            )}

            {/* --------------------------- 5 · dress code ---------------------------- */}
            {showDress ? (
              <Plate id="frame-dresscode" art={A("05-dresscode.jpg")}>
                {/* the column the calla lilies leave free, top to bottom */}
                <Zone box={{ x0: 0.215, y0: 0.05, x1: 0.715, y1: 0.955 }} className="items-center justify-center text-center">
                  {hasDressCode(content) ? (
                    <>
                      <Heading size={94} color="var(--g-paper)" flourish={260} edit="dressCode.heading">
                        {dress?.heading?.trim() || "Dress Code"}
                      </Heading>
                      {dress?.attire?.trim() ? (
                        <span
                          className="mt-[6%] inline-block uppercase"
                          style={{
                            fontFamily: SERIF,
                            fontSize: u(20),
                            fontWeight: 600,
                            letterSpacing: "0.26em",
                            color: "var(--g-paper)",
                            padding: `${u(10)} ${u(30)}`,
                            borderRadius: 999,
                            border: "1px solid color-mix(in srgb, var(--g-paper) 55%, transparent)",
                            boxShadow: `inset 0 0 0 ${u(4)} var(--g-olive), inset 0 0 0 ${u(5)} color-mix(in srgb, var(--g-paper) 30%, transparent)`,
                          }}
                        >
                          {dress.attire}
                        </span>
                      ) : null}
                      {dress?.note?.trim() ? (
                        <Body size={40} color={PAPER_SOFT} className="mt-[5%]" edit="dressCode.note">
                          {dress.note}
                        </Body>
                      ) : null}
                      {dress?.swatches?.length ? (
                        <div className="mt-[7%] flex flex-wrap justify-center" style={{ gap: `${u(30)} ${u(26)}` }}>
                          {dress.swatches.slice(0, 6).map((s, i) => (
                            <OvalSwatch
                              key={`${s.hex}-${i}`}
                              hex={s.hex}
                              label={dress.swatchLabels === false ? undefined : s.label}
                            />
                          ))}
                        </div>
                      ) : null}
                      {attireCols.length ? (
                        <div
                          className="mt-[8%] grid w-full"
                          style={{ gridTemplateColumns: `repeat(${Math.min(attireCols.length, 2)}, 1fr)`, gap: u(30) }}
                        >
                          {attireCols.map(([k, v]) => (
                            <div key={k} className="flex flex-col items-center">
                              <Caps size={22} color="var(--g-paper)" track={0.26}>
                                {k}
                              </Caps>
                              <span
                                aria-hidden
                                className="my-[4%] block"
                                style={{ width: u(46), height: 1, background: "var(--g-paper)", opacity: 0.4 }}
                              />
                              <Body size={33} color={PAPER_SOFT} className="leading-snug">
                                {v}
                              </Body>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {dress?.avoid?.trim() ? (
                        <Body size={32} italic color="color-mix(in srgb, var(--g-paper) 70%, transparent)" className="mt-[7%]">
                          Kindly avoid {dress.avoid}
                        </Body>
                      ) : null}
                    </>
                  ) : null}

                  {wishes.length ? (
                    <div className={`flex flex-col items-center ${hasDressCode(content) ? "mt-[10%]" : ""}`}>
                      <Heading size={72} color="var(--g-paper)" flourish={220}>
                        Our wishes
                      </Heading>
                      {wishes.slice(0, 3).map((w, i) => (
                        <div key={i} className="mt-[6%] flex flex-col items-center">
                          <Caps size={22} color="var(--g-paper)" track={0.24}>
                            {w.title}
                          </Caps>
                          <Body size={30} color={PAPER_SOFT}>
                            {w.body}
                          </Body>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </Zone>
              </Plate>
            ) : null}

            {/* ----------------------------- 6 · details ----------------------------- */}
            {showRsvp ? (
              <Plate id="frame-rsvp" art={A("06-details.jpg")}>
                <Zone box={{ x0: 0.3, y0: 0.232, x1: 0.7, y1: 0.285 }} className="items-center justify-center">
                  <Script size={76} edit="rsvp.heading">
                    {rsvp?.heading}
                  </Script>
                </Zone>
                {/* the plate's wide band: .29–.587 */}
                <Zone box={{ x0: 0.16, y0: 0.29, x1: 0.84, y1: 0.587 }} className="items-center justify-center text-center">
                  <Body size={cards.length ? 32 : 36} className="max-w-[90%]" edit="rsvp.footer">
                    {rsvp?.footer?.trim() || "Please let us know whether you can join us, so we can prepare for your arrival with care."}
                  </Body>
                  <div style={{ marginTop: u(cards.length ? 26 : 40) }}>
                    <Pill onClick={openSheet} size={cards.length ? 23 : 26}>
                      Fill in the RSVP
                    </Pill>
                  </div>
                  {cards.length ? (
                    <>
                      <div className="w-full" style={{ margin: `${u(34)} 0 ${u(16)}` }}>
                        <Flourish width={200} color="var(--g-ink)" className="opacity-60" />
                      </div>
                      <div className="flex w-full items-stretch justify-center" style={{ gap: u(24) }}>
                        {cards.map((c, i) => (
                          <div key={c.key} className="flex min-w-0 flex-1 items-stretch" style={{ gap: u(24) }}>
                            {i > 0 ? (
                              <span
                                aria-hidden
                                style={{ width: 1, background: "linear-gradient(transparent, var(--g-ink), transparent)", opacity: 0.35 }}
                              />
                            ) : null}
                            <ContactCard title={c.title} line={c.line} action={c.action} />
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}
                </Zone>
              </Plate>
            ) : null}

            {/* ----------------------------- 7 · closing ----------------------------- */}
            <Plate art={A("07-closing.jpg")} field="var(--g-dusk)">
              <Zone box={{ x0: 0.09, y0: 0.625, x1: 0.91, y1: 0.955 }} className="items-center justify-center text-center">
                {left ? (
                  <div className="flex items-start" style={{ gap: u(34), color: "var(--g-paper)" }}>
                    {(
                      [
                        [left.d, "days"],
                        [left.h, "hours"],
                        [left.m, "minutes"],
                      ] as [number, string][]
                    ).map(([n, l], i) => (
                      <div key={l} className="flex items-start" style={{ gap: u(34) }}>
                        {i > 0 ? (
                          <span aria-hidden className="self-stretch" style={{ width: 1, background: "var(--g-paper)", opacity: 0.3 }} />
                        ) : null}
                        <div className="flex flex-col items-center">
                          <span style={{ fontFamily: SERIF, fontSize: u(60), lineHeight: 1 }}>{String(n).padStart(2, "0")}</span>
                          <span
                            className="uppercase"
                            style={{ fontFamily: SERIF, fontSize: u(17), letterSpacing: "0.26em", opacity: 0.75, marginTop: u(10) }}
                          >
                            {l}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                <Flourish width={260} color="var(--g-paper)" className="mt-[5%] opacity-70" />
                <Body color={PAPER_SOFT} className="mt-[4%] max-w-[86%]" edit="hero.closingLine">
                  {hero?.closingLine}
                </Body>
                <Script size={98} color="var(--g-paper)" className="mt-[4%]">
                  We await you!
                </Script>
                <Caps size={26} color="color-mix(in srgb, var(--g-paper) 75%, transparent)" track={0.24} className="mt-[2%]">
                  {names.join(" & ")}
                </Caps>
              </Zone>
            </Plate>
          </main>

          <AnimatePresence>
            {sheet ? <RsvpSheet key="rsvp" content={content} live={live} onClose={() => setSheet(false)} /> : null}
          </AnimatePresence>

          <MusicToggle trackUrl={content.music?.trackUrl} />
          <ScrollGuide active hasMusic={!!content.music?.trackUrl} />
        </div>
      </ThemeProvider>
    </PreviewContext.Provider>
  );
}
