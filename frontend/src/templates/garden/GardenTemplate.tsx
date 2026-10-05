"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { EventItem, InvitationContent, Person, RenderProps } from "@/engine/types";
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
import { calendarEvent, downloadIcs } from "@/lib/calendar";
import { initialOf } from "@/lib/initials";
import { FlowPlate, Plate, Zone, u } from "./stage";
import type { Slices } from "./stage";
import { Cover } from "./cover";
import {
  ActionButton,
  Body,
  Caps,
  CountdownTiles,
  DateCartouche,
  Flourish,
  Heading,
  Icon,
  OvalSwatch,
  PenReveal,
  PhotoOval,
  PhotoViewer,
  Pip,
  Rise,
  SERIF,
  Script,
  actionStyle,
} from "./kit";

/**
 * "Secret Garden" — an old-master garden at dusk and engraved magnolias on olive.
 *
 * Seven painted and engraved plates carry the look; this file composes the
 * Garden kit onto them. Written for every guest, including the ones who have
 * never opened a web invitation: large type, one obvious thing to tap on each
 * page, plain words on the buttons, and the reply form right there on the page
 * rather than behind a button.
 *
 * Two kinds of page. The paintings and the venue engraving fill the screen
 * (`Plate fill`). The three arch panels — welcome, timing, RSVP — are cut into
 * slices whose plain middle grows with their content (`FlowPlate`), so a phone
 * taller than the art shows no empty bands and a long form always fits.
 */

const A = (f: string) => `/assets/templates/garden/${f}`;
const ICONS = ["icon-guests.png", "icon-swans.png", "icon-cake.png", "icon-glasses.png"];

// slice heights in art pixels. Cut where each panel's sides run straight and
// its face is plain: welcome .38/.56, timing .285/.715, details .29/.575.
const WELCOME: Slices = { top: A("02-welcome-top.jpg"), mid: A("02-welcome-mid.jpg"), bot: A("02-welcome-bot.jpg"), topH: 760, midH: 360, botH: 540 };
const TIMING: Slices = { top: A("04-timing-top.jpg"), mid: A("04-timing-mid.jpg"), bot: A("04-timing-bot.jpg"), topH: 510, midH: 860, botH: 480 };
const DETAILS: Slices = { top: A("06-details-top.jpg"), mid: A("06-details-mid.jpg"), bot: A("06-details-bot.jpg"), topH: 520, midH: 570, botH: 530 };

const PALETTE = {
  "--g-olive": "#545738",
  "--g-dusk": "#2a2316", // the paintings' own edge colour
  "--g-cream": "#f1eada",
  "--g-ink": "#4f5337",
  "--g-soft": "#5f6147", // body text on cream: darker than the art's grey, for older eyes
  "--g-paper": "#efe9d6", // type on the olive and on the paintings
  // the floating music / scroll buttons: the antique gold of the cover's
  // sunlit sky — olive would vanish into the olive pages
  "--chrome-bg": "#9c844f",
  "--chrome-fg": "#f8f3e6",
  "--chrome-ring": "rgba(248,243,230,0.6)",
} as CSSProperties;

const PAPER_SOFT = "color-mix(in srgb, var(--g-paper) 88%, transparent)";

const longDate = (iso?: string) => {
  const d = new Date(iso ?? "");
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};
const titleCase = (s?: string) => (s ?? "").replace(/\b\p{L}/gu, (c) => c.toUpperCase());

/* ------------------------------ welcome ------------------------------ */

/** A partner and their parents, the way a printed card sets it. */
function FamilyBlock({ person }: { person?: Person }) {
  if (!person?.name) return null;
  const parents = [person.father, person.mother].filter((p) => p?.trim()).join(" & ");
  return (
    <div className="flex flex-col items-center">
      <PenReveal delay={0.2}>
        <Script size={100}>{person.name}</Script>
      </PenReveal>
      {parents ? (
        <>
          {person.parentsPrefix?.trim() ? (
            <Body size={42} italic className="mt-[1%]">
              {person.parentsPrefix}
            </Body>
          ) : null}
          <Caps size={34} track={0.08} className="max-w-[96%] leading-snug">
            {parents}
          </Caps>
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------ timing ------------------------------ */

/** One stop of the day. A day with a single event gets it large, with the
 *  full date; several share the panel and step down in size. */
function Stop({ ev, icon, scale, dateLine }: { ev: EventItem; icon: string; scale: number; dateLine?: string }) {
  const { compact, editing } = usePreview();
  const target = targetFromEvent(ev);
  return (
    <div className="flex w-full flex-col items-center text-center">
      {/* the engraving springs up as the stop comes into view */}
      <motion.img
        src={icon}
        alt=""
        style={{ height: u(150 * scale) }}
        initial={compact || editing ? false : { opacity: 0, scale: 0.6, y: 14 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ type: "spring", stiffness: 180, damping: 14 }}
      />
      {dateLine ? (
        <Caps size={32} track={0.12} className="mt-[3%]">
          {dateLine}
        </Caps>
      ) : null}
      <div className="flex items-center" style={{ gap: u(16), marginTop: u(10) }}>
        <span aria-hidden style={{ width: u(60), height: 1, background: "linear-gradient(90deg, transparent, var(--g-ink))", opacity: 0.5 }} />
        <span style={{ fontFamily: SERIF, fontSize: u(72 * scale), lineHeight: 1.05, color: "var(--g-ink)", fontWeight: 600 }}>{ev.time}</span>
        <span aria-hidden style={{ width: u(60), height: 1, background: "linear-gradient(270deg, transparent, var(--g-ink))", opacity: 0.5 }} />
      </div>
      <Caps size={44 * Math.max(scale, 0.85)} track={0.14} className="mt-[1%]">
        {ev.name}
      </Caps>
      {ev.venue ? (
        <Body size={44 * Math.max(scale, 0.85)} italic className="leading-snug">
          {ev.venue}
        </Body>
      ) : null}
      {ev.address && scale >= 1 ? (
        <Body size={38} className="leading-snug">
          {ev.address}
        </Body>
      ) : null}
      {hasMapTarget(target) ? (
        <div style={{ marginTop: u(16) }}>
          <DirectionsLink target={target} style={{ ...actionStyle("olive"), minHeight: 44, fontSize: 16, padding: "0 18px" }}>
            <Icon name="pin" size={18} />
            Directions
          </DirectionsLink>
        </div>
      ) : null}
    </div>
  );
}

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
function ReplyForm({ content, live }: { content: InvitationContent; live: boolean }) {
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

/* --------------------------- the template --------------------------- */

export function GardenTemplate({
  content,
  theme,
  intro = true,
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
  // guests open the envelope; the Studio, gallery and thumbnails don't
  const gated = intro && !editing && !compact;
  const [opened, setOpened] = useState(!gated);
  // the scroll arrow waits until the card has been written
  const [guide, setGuide] = useState(!gated);
  useEffect(() => {
    if (!opened || guide) return;
    const t = window.setTimeout(() => setGuide(true), 4500);
    return () => window.clearTimeout(t);
  }, [opened, guide]);
  const pages = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const [viewer, setViewer] = useState<number | null>(null);

  /* The tour: after the card is written the invitation plays itself, a page
     every few seconds (a tall page shows its top, then its foot), and stops at
     the RSVP so the guest can reply. Any touch, scroll or key ends it at once —
     the guest is then in charge. A thin gold line at the top shows it's on. */
  const DWELL = 7000;
  const [touring, setTouring] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!touring) return;
    const root = pages.current;
    if (!root) return;
    const stops: { el: HTMLElement; block: ScrollLogicalPosition }[] = [];
    for (const el of Array.from(root.querySelectorAll<HTMLElement>(":scope > section"))) {
      stops.push({ el, block: "start" });
      if (el.id === "frame-rsvp") break;
      if (el.offsetHeight > window.innerHeight + 60) stops.push({ el, block: "end" });
    }
    let i = 0; // the first stop is where `onward` has just taken them
    let timer = 0;
    const end = () => setTouring(false);
    const next = () => {
      i += 1;
      if (i >= stops.length) return end();
      stops[i].el.scrollIntoView({ behavior: "smooth", block: stops[i].block });
      setStep(i);
      if (stops[i].el.id === "frame-rsvp") return end();
      timer = window.setTimeout(next, DWELL);
    };
    timer = window.setTimeout(next, DWELL);
    const kinds = ["pointerdown", "wheel", "touchstart", "keydown"] as const;
    kinds.forEach((k) => window.addEventListener(k, end, { passive: true, capture: true }));
    return () => {
      window.clearTimeout(timer);
      kinds.forEach((k) => window.removeEventListener(k, end, { capture: true }));
    };
  }, [touring]);

  const { couple, families, hero, schedule, countdown, rsvp, story, map, dateReveal } = content;
  const names = [couple.partner1?.name, couple.partner2?.name].filter(Boolean);
  const letters = [initialOf(couple.partner1?.name), initialOf(couple.partner2?.name)].filter(Boolean);
  const firstEv = schedule?.events?.[0];
  const photos = (story?.items ?? []).map((s) => s.photo).filter((p): p is string => Boolean(p));
  const hidden = content.hiddenSections ?? [];
  const dress = content.dressCode;
  const wishes = content.wishes ?? [];
  const contacts = content.contacts ?? {};
  const events = (schedule?.events ?? []).slice(0, 5);
  const showDress = !hidden.includes("dresscode") && (hasDressCode(content) || wishes.length > 0);
  const showRsvp = !hidden.includes("rsvp");
  const date = { iso: countdown?.targetDate, fallback: dateReveal?.eventDate };
  const cal = calendarEvent(content);

  const target = firstEv ? targetFromEvent(firstEv) : {};
  if (map?.directionsQuery?.trim()) {
    target.query = map.directionsQuery.trim();
    target.url = undefined;
  }
  if (map?.directionsUrl?.trim()) target.url = map.directionsUrl.trim();

  const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  // after the card is written, take the guest on to the first page — unless
  // they have already scrolled away from the cover themselves
  const onward = () => {
    const cover = document.getElementById("frame-couple");
    if (cover && Math.abs(cover.getBoundingClientRect().top) > 40) return;
    pages.current?.querySelector("section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (!reduce) setTouring(true);
  };

  const nav: [string, () => void][] = [
    ["Venue", () => goTo("frame-venue")],
    ...(events.length && !hidden.includes("schedule") ? ([["Timing", () => goTo("frame-schedule")]] as [string, () => void][]) : []),
    ...(showDress ? ([["Details", () => goTo("frame-dresscode")]] as [string, () => void][]) : []),
    ...(showRsvp ? ([["RSVP", () => goTo("frame-rsvp")]] as [string, () => void][]) : []),
  ];

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
            <Cover
              gated={gated}
              names={names.join(" & ")}
              letters={letters}
              seal={content.envelope?.seal?.trim() || letters.join("·")}
              date={date}
              nav={nav}
              onOpen={() => setOpened(true)}
              onDone={onward}
            />

            {/* the rest waits until the envelope has been opened */}
            <div hidden={!opened} ref={pages}>
              {/* ----------------------------- 2 · welcome ----------------------------- */}
              {hidden.includes("families") ? null : (
                <FlowPlate
                  id="frame-families"
                  slices={WELCOME}
                  pad={150}
                  head={
                    photos.length ? (
                      <>
                        {/* the lace oval: art .383–.616 × .174–.348, here as fractions of the top slice */}
                        <Zone box={{ x0: 0.383, y0: 0.458, x1: 0.616, y1: 0.916 }}>
                          <PhotoOval photos={photos} onOpen={editing || compact ? undefined : setViewer} />
                        </Zone>
                      </>
                    ) : null
                  }
                >
                  {photos.length > 1 && !editing && !compact ? (
                    <Rise style={{ marginBottom: u(30) }}>
                      <button
                        type="button"
                        onClick={() => setViewer(0)}
                        className="inline-flex items-center"
                        style={{
                          gap: 8,
                          minHeight: 40,
                          padding: "0 16px",
                          borderRadius: 999,
                          fontFamily: SERIF,
                          fontSize: 17,
                          fontWeight: 600,
                          color: "var(--g-ink)",
                          border: "1px solid color-mix(in srgb, var(--g-ink) 35%, transparent)",
                          background: "rgba(255,255,255,0.45)",
                        }}
                      >
                        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" aria-hidden>
                          <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
                          <path d="M3.5 15l4.5-4 4 3.5 3-2.5 5 4" />
                        </svg>
                        See all {photos.length} photos
                      </button>
                    </Rise>
                  ) : null}
                  <Rise>
                    <Heading size={100} flourish={300} edit="families.heading">
                      {families?.heading}
                    </Heading>
                  </Rise>
                  <Rise delay={0.1} className="w-full" style={{ marginTop: u(40) }}>
                    <FamilyBlock person={couple.partner1} />
                  </Rise>
                  <Rise delay={0.2}>
                    <Script size={80} color="var(--g-soft)" className="my-[5%]">
                      &amp;
                    </Script>
                  </Rise>
                  <Rise delay={0.3} className="w-full">
                    <FamilyBlock person={couple.partner2} />
                  </Rise>
                  {families?.footer || hero?.tagline ? (
                    <Rise delay={0.1} style={{ marginTop: u(44) }}>
                      <Body size={46} italic edit="families.footer">
                        {families?.footer || hero?.tagline}
                      </Body>
                    </Rise>
                  ) : null}
                  <Rise className="w-full" style={{ marginTop: u(50) }}>
                    <Pip width={180} color="var(--g-ink)" />
                  </Rise>
                  <Rise className="flex flex-col items-center" style={{ marginTop: u(30) }}>
                    {hero?.marriageText ? (
                      <Caps size={30} track={0.2} color="var(--g-soft)">
                        {hero.marriageText}
                      </Caps>
                    ) : null}
                    <PenReveal delay={0.3} className="mt-[1%]">
                      <Script size={96}>Save the Date</Script>
                    </PenReveal>
                    <div style={{ marginTop: u(18) }}>
                      <DateCartouche {...date} size={40} />
                    </div>
                    {longDate(countdown?.targetDate) ? (
                      <Body size={42} className="mt-[3%]">
                        {longDate(countdown?.targetDate)}
                        {firstEv?.time ? ` · ${firstEv.time}` : ""}
                      </Body>
                    ) : null}
                    {cal ? (
                      <div style={{ marginTop: u(40), marginBottom: u(20) }}>
                        <ActionButton icon="calendar" onClick={() => downloadIcs(cal, "invitation.ics")}>
                          Add to my calendar
                        </ActionButton>
                      </div>
                    ) : null}
                  </Rise>
                </FlowPlate>
              )}

              {/* ------------------------------ 3 · venue ------------------------------ */}
              <Plate id="frame-venue" art={A("03-venue.jpg")} fill>
                {/* the flat olive above the engraving; inside what a phone keeps */}
                <Zone box={{ x0: 0.12, y0: 0.05, x1: 0.88, y1: 0.475 }} className="items-center justify-center text-center">
                  <Rise className="flex flex-col items-center">
                    <Heading size={104} color="var(--g-paper)" flourish={300}>
                      Venue
                    </Heading>
                  </Rise>
                  <Rise delay={0.1} className="flex flex-col items-center" style={{ marginTop: u(40) }}>
                    <DateCartouche {...date} color="var(--g-paper)" size={34} />
                    {firstEv?.time ? (
                      <Body size={44} color={PAPER_SOFT} className="mt-[4%]">
                        at {firstEv.time}
                      </Body>
                    ) : null}
                  </Rise>
                  {firstEv?.venue ? (
                    <Rise delay={0.2} style={{ marginTop: u(50) }}>
                      <Caps size={46} color="var(--g-paper)" track={0.1} className="leading-snug">
                        {firstEv.venue}
                      </Caps>
                      {firstEv.address ? (
                        <Body size={44} color={PAPER_SOFT} className="mt-[2%] leading-snug">
                          {firstEv.address}
                        </Body>
                      ) : null}
                    </Rise>
                  ) : null}
                </Zone>
                {hasMapTarget(target) ? (
                  <Zone box={{ x0: 0.1, y0: 0.83, x1: 0.9, y1: 0.95 }} className="items-center justify-center">
                    <DirectionsLink target={target} style={actionStyle("cream")}>
                      <Icon name="pin" />
                      {map?.directionsLabel?.trim() || "Get directions"}
                    </DirectionsLink>
                  </Zone>
                ) : null}
              </Plate>

              {/* ------------------------------ 4 · timing ----------------------------- */}
              {hidden.includes("schedule") || !events.length ? null : (
                <FlowPlate id="frame-schedule" slices={TIMING} pad={200}>
                  <Rise className="flex flex-col items-center">
                    <Script size={96} edit="schedule.heading">
                      {schedule.heading}
                    </Script>
                    {schedule.subtext ? (
                      <Body size={42} italic className="mt-[2%]" edit="schedule.subtext">
                        {schedule.subtext}
                      </Body>
                    ) : null}
                    <Flourish width={260} color="var(--g-ink)" className="mt-[4%] opacity-70" />
                  </Rise>
                  <div className="flex w-full flex-col items-center" style={{ marginTop: u(50), gap: u(events.length > 1 ? 30 : 0) }}>
                    {events.map((ev, i) => (
                      <Rise key={ev.id} delay={0.12 * i} className="flex w-full flex-col items-center">
                        {i > 0 ? (
                          <div className="w-full" style={{ marginBottom: u(30) }}>
                            <Pip width={160} color="var(--g-ink)" />
                          </div>
                        ) : null}
                        <Stop
                          ev={ev}
                          icon={A(ICONS[i % ICONS.length])}
                          scale={events.length === 1 ? 1.4 : events.length > 3 ? 0.75 : 0.9}
                          dateLine={events.length === 1 ? longDate(countdown?.targetDate) || titleCase(ev.date) : titleCase(ev.date)}
                        />
                      </Rise>
                    ))}
                  </div>
                </FlowPlate>
              )}

              {/* --------------------------- 5 · dress code ---------------------------- */}
              {showDress ? (
                <Plate id="frame-dresscode" art={A("05-dresscode.jpg")} fill>
                  {/* the column the calla lilies leave free, top to bottom */}
                  <Zone box={{ x0: 0.215, y0: 0.05, x1: 0.715, y1: 0.955 }} className="items-center justify-center text-center">
                    {hasDressCode(content) ? (
                      <Rise className="flex flex-col items-center">
                        <Heading size={96} color="var(--g-paper)" flourish={260} edit="dressCode.heading">
                          {dress?.heading?.trim() || "Dress Code"}
                        </Heading>
                        {dress?.attire?.trim() ? (
                          <span
                            className="mt-[6%] inline-block"
                            style={{
                              fontFamily: SERIF,
                              fontSize: u(34),
                              fontWeight: 600,
                              letterSpacing: "0.08em",
                              color: "var(--g-paper)",
                              padding: `${u(12)} ${u(34)}`,
                              borderRadius: 999,
                              border: "1px solid color-mix(in srgb, var(--g-paper) 60%, transparent)",
                            }}
                          >
                            {dress.attire}
                          </span>
                        ) : null}
                        {dress?.note?.trim() ? (
                          <Body size={44} color={PAPER_SOFT} className="mt-[5%]" edit="dressCode.note">
                            {dress.note}
                          </Body>
                        ) : null}
                        {dress?.swatches?.length ? (
                          <div className="mt-[7%] flex flex-wrap justify-center" style={{ gap: `${u(30)} ${u(26)}` }}>
                            {dress.swatches.slice(0, 6).map((s, i) => (
                              <OvalSwatch key={`${s.hex}-${i}`} hex={s.hex} label={dress.swatchLabels === false ? undefined : s.label} />
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
                                <Caps size={28} color="var(--g-paper)" track={0.14}>
                                  {k}
                                </Caps>
                                <Body size={38} color={PAPER_SOFT} className="leading-snug">
                                  {v}
                                </Body>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {dress?.avoid?.trim() ? (
                          <Body size={38} italic color={PAPER_SOFT} className="mt-[7%]">
                            Kindly avoid {dress.avoid}
                          </Body>
                        ) : null}
                      </Rise>
                    ) : null}

                    {wishes.length ? (
                      <Rise className={`flex flex-col items-center ${hasDressCode(content) ? "mt-[10%]" : ""}`}>
                        <Heading size={84} color="var(--g-paper)" flourish={220}>
                          Our wishes
                        </Heading>
                        {wishes.slice(0, 3).map((w, i) => (
                          <div key={i} className="mt-[6%] flex flex-col items-center">
                            <Caps size={30} color="var(--g-paper)" track={0.14}>
                              {w.title}
                            </Caps>
                            <Body size={38} color={PAPER_SOFT}>
                              {w.body}
                            </Body>
                          </div>
                        ))}
                      </Rise>
                    ) : null}
                  </Zone>
                </Plate>
              ) : null}

              {/* ------------------------------ 6 · RSVP ------------------------------- */}
              {showRsvp ? (
                <FlowPlate id="frame-rsvp" slices={DETAILS} pad={170}>
                  <Rise className="flex flex-col items-center">
                    <Heading size={104} flourish={260} edit="rsvp.heading">
                      {rsvp?.heading || "RSVP"}
                    </Heading>
                    {rsvp?.footer?.trim() ? (
                      <Body size={44} italic className="mt-[3%]" edit="rsvp.footer">
                        {rsvp.footer}
                      </Body>
                    ) : null}
                  </Rise>
                  <div className="flex w-full justify-center" style={{ marginTop: u(50), marginBottom: u(30) }}>
                    <ReplyForm content={content} live={live} />
                  </div>
                  {contacts.chatUrl?.trim() || contacts.phone?.trim() ? (
                    <Rise className="flex w-full flex-col items-center" style={{ marginBottom: u(30) }}>
                      <div className="w-full" style={{ margin: `${u(20)} 0 ${u(36)}` }}>
                        <Flourish width={200} color="var(--g-ink)" className="opacity-60" />
                      </div>
                      <p style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 700, color: "var(--g-ink)", marginBottom: 12 }}>
                        Questions on the day?
                      </p>
                      <div className="flex w-full flex-col items-center" style={{ gap: 12, maxWidth: 420 }}>
                        {contacts.phone?.trim() ? (
                          <ActionButton icon="phone" wide href={`tel:${contacts.phone.replace(/[^\d+]/g, "")}`}>
                            Call {contacts.contactName?.trim() || "us"}
                          </ActionButton>
                        ) : null}
                        {contacts.chatUrl?.trim() ? (
                          <ActionButton icon="chat" wide tone="cream" href={contacts.chatUrl.trim()}>
                            Join our chat group
                          </ActionButton>
                        ) : null}
                        {contacts.chatNote?.trim() ? (
                          <Body size={38} italic>
                            {contacts.chatNote}
                          </Body>
                        ) : null}
                      </div>
                    </Rise>
                  ) : null}
                </FlowPlate>
              ) : null}

              {/* ----------------------------- 7 · closing ----------------------------- */}
              <Plate art={A("07-closing.jpg")} field="var(--g-dusk)" fill>
                <Zone box={{ x0: 0.12, y0: 0.6, x1: 0.88, y1: 0.965 }} className="items-center justify-center text-center">
                  <Rise className="flex flex-col items-center">
                    {countdown?.headline ? (
                      <Caps size={30} color={PAPER_SOFT} track={0.18} className="mb-[4%]">
                        {countdown.headline}
                      </Caps>
                    ) : null}
                    <CountdownTiles target={countdown?.targetDate} size={60} />
                  </Rise>
                  <Rise delay={0.15} className="flex flex-col items-center" style={{ marginTop: u(40) }}>
                    <Flourish width={260} color="var(--g-paper)" className="opacity-70" />
                    {hero?.closingLine ? (
                      <Body size={46} color={PAPER_SOFT} className="mt-[4%]" edit="hero.closingLine">
                        {hero.closingLine}
                      </Body>
                    ) : null}
                    <Script size={110} color="var(--g-paper)" className="mt-[3%]">
                      We await you!
                    </Script>
                    <Caps size={32} color={PAPER_SOFT} track={0.16} className="mt-[1%]">
                      {names.join(" & ")}
                    </Caps>
                  </Rise>
                </Zone>
              </Plate>
            </div>
          </main>

          <AnimatePresence>
            {viewer !== null ? <PhotoViewer key="viewer" photos={photos} start={viewer} onClose={() => setViewer(null)} /> : null}
          </AnimatePresence>

          {touring ? (
            <motion.div
              key={step}
              aria-hidden
              className="pointer-events-none fixed left-0 top-0 z-[70] h-[3px]"
              style={{ background: "var(--chrome-bg)" }}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: DWELL / 1000, ease: "linear" }}
            />
          ) : null}

          <MusicToggle trackUrl={content.music?.trackUrl} />
          {guide ? <ScrollGuide active hasMusic={!!content.music?.trackUrl} /> : null}
        </div>
      </ThemeProvider>
    </PreviewContext.Provider>
  );
}
