"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import type { InvitationContent, RenderProps } from "@/engine/types";
import { PreviewContext } from "@/components/PreviewContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SmoothScroll } from "@/components/SmoothScroll";
import { MusicToggle } from "@/components/MusicToggle";
import { ScrollGuide } from "@/components/ScrollGuide";
import { StyleOverrides } from "@/components/StyleOverrides";
import { TextOffsets } from "@/templates/TextOffsets";
import { VideoIntro } from "@/blocks/VideoIntro";
import { DirectionsLink } from "@/components/DirectionsLink";
import { hasMapTarget, targetFromEvent } from "@/lib/maps";
import { Stage, Zone, Label, Value, Heading, Body, Rule, Postmark, u } from "./parts";
import {
  DressCode,
  FlightCountdown,
  GateIntro,
  MonthCalendar,
  StubButton,
  TicketRsvp,
  TimelineRail,
} from "./elements";

/**
 * "Kerala Voyage" — a destination-wedding boarding pass.
 *
 * This design shares no elements with the other templates. The countdown is a
 * departures board, the schedule is a dashed route with stops, the RSVP is the
 * pass's tear-off stub and the opening is a boarding gate — all in ./elements.
 * What it shares is behaviour: the RSVP stub and the brand card run off the
 * same `useRsvp` controller so the two can't disagree about what a decline
 * sends or which meal keys the backend accepts.
 *
 * The seven navy plates are stationery, not decoration: type is positioned
 * INTO their cards, so each slide is a measured layout (see ./parts). To
 * re-cut the deck, change ART below.
 */

const ART_BASE = "/assets/templates/voyage";

/** Which plate carries which slide. Swap the filenames to re-order the deck. */
const ART = {
  ticket: `${ART_BASE}/01-ticket.jpg`,
  letter: `${ART_BASE}/07-letter.jpg`,
  photo: `${ART_BASE}/03-photo-card.jpg`,
  date: `${ART_BASE}/04-wide-stamp.jpg`,
  venue: `${ART_BASE}/05-arch.jpg`,
  timeline: `${ART_BASE}/06-timeline.jpg`,
  closing: `${ART_BASE}/02-lamp-stamp.jpg`,
} as const;

/** The plates' own colours, so the field around the art matches its border. */
const PALETTE = {
  "--v-navy": "#1a2745",
  "--v-cream": "#f5f1e4",
  "--v-gold": "#b8935a",
  "--v-ink": "#24324f",
  "--v-body": "#4a5570",
  /* this design's voice: serif caps, mono ticket data, script for "and" */
  "--f-display": "var(--font-cinzel)",
  "--f-body": "var(--font-karla)",
  "--f-script": "var(--font-parisienne)",
} as CSSProperties;

/** 21.06.2025 — the boarding-pass way to write a date. */
function dotDate(iso?: string, fallback?: string): string {
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      const p = (n: number) => String(n).padStart(2, "0");
      return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
    }
  }
  return fallback ?? "";
}

function initialsOf(a?: string, b?: string): string {
  return [a, b]
    .filter(Boolean)
    .map((n) => n!.trim().charAt(0).toUpperCase())
    .join(" · ");
}

/**
 * A slide with no printed plate — its element brings its own stationery. The
 * flight path is drawn here so the gold thread doesn't break where the deck
 * steps off the artwork.
 */
function PlainSlide({
  id,
  children,
  compact,
  path = "M22,-4 C22,26 52,40 56,60 C60,80 38,92 30,108",
}: {
  id?: string;
  children: ReactNode;
  compact: boolean;
  path?: string;
}) {
  return (
    <section
      id={id}
      className={`relative snap-start overflow-hidden ${
        compact ? "py-10" : "flex min-h-svh flex-col justify-center py-14"
      }`}
      style={{ background: "var(--v-navy)" }}
    >
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <path
          d={path}
          fill="none"
          stroke="var(--v-gold)"
          strokeWidth="0.3"
          strokeDasharray="1.5 1.3"
          opacity="0.45"
        />
      </svg>
      <div className="relative">{children}</div>
    </section>
  );
}

export function VoyageTemplate({
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
  const [opened, setOpened] = useState(!intro);
  const [revealing, setRevealing] = useState(!intro);

  const { couple, hero, families, story, schedule, dateReveal, countdown, rsvp, map } = content;
  const firstEv = schedule?.events?.[0];
  const names = [couple.partner1?.name, couple.partner2?.name].filter(Boolean);
  const ticketDate = dotDate(countdown?.targetDate, dateReveal?.eventDate || firstEv?.date);

  // directions for the venue plate — a pasted link wins over the venue text
  const target = firstEv ? targetFromEvent(firstEv) : {};
  if (map?.directionsQuery?.trim()) {
    target.query = map.directionsQuery.trim();
    target.url = undefined;
  }
  if (map?.directionsUrl?.trim()) target.url = map.directionsUrl.trim();
  const canRoute = hasMapTarget(target);

  const hidden = content.hiddenSections ?? [];
  const photo = story?.items?.find((s) => s.photo)?.photo;
  const stops = schedule?.events ?? [];
  const dress = content.dressCode;

  return (
    <PreviewContext.Provider value={{ compact, editing }}>
      <ThemeProvider
        theme={theme}
        className={`relative overflow-x-hidden ${
          snap ? "h-svh snap-y snap-mandatory overflow-y-auto" : "min-h-screen"
        }`}
      >
        <div style={PALETTE}>
          {snap ? null : <SmoothScroll />}
          <StyleOverrides content={content} />
          <TextOffsets offsets={content.offsets} />

          <AnimatePresence>
            {!opened ? (
              content.envelope?.videoUrl ? (
                <VideoIntro
                  key="intro"
                  videoUrl={content.envelope.videoUrl}
                  tagline={content.envelope.tagline}
                  onOpening={() => setRevealing(true)}
                  onOpen={() => setOpened(true)}
                />
              ) : (
                <GateIntro
                  key="intro"
                  names={names.join(" & ")}
                  from={dateReveal?.location}
                  date={ticketDate}
                  tagline={content.envelope?.tagline}
                  onOpening={() => setRevealing(true)}
                  onOpen={() => setOpened(true)}
                />
              )
            ) : null}
          </AnimatePresence>

          <main style={{ opacity: revealing ? 1 : 0, transition: "opacity 1.2s ease" }}>
            {/* ------------------------- 1 · the pass -------------------------- */}
            <Stage id="frame-couple" art={ART.ticket}>
              <Zone box={{ x0: 0.25, y0: 0.126, x1: 0.75, y1: 0.176 }} className="items-center justify-start">
                <Label data-edit="hero.marriageText" size={16}>
                  {hero?.marriageText}
                </Label>
              </Zone>

              <Zone box={{ x0: 0.235, y0: 0.425, x1: 0.765, y1: 0.565 }} className="items-center justify-center">
                <Heading data-edit="couple.partner1.name" size={54} className="text-center">
                  {couple.partner1?.name}
                </Heading>
                <span
                  data-edit="couple.connector"
                  style={{
                    fontFamily: "var(--font-parisienne)",
                    fontSize: u(34),
                    color: "var(--v-gold)",
                    lineHeight: 1,
                    margin: `${u(6)} 0`,
                  }}
                >
                  {couple.connector ?? "and"}
                </span>
                <Heading data-edit="couple.partner2.name" size={54} className="text-center">
                  {couple.partner2?.name}
                </Heading>
              </Zone>

              {/* the plate draws a 2 × 2 grid here — these are its four cells */}
              <Zone box={{ x0: 0.262, y0: 0.578, x1: 0.742, y1: 0.648 }}>
                <div className="grid h-full grid-cols-2 grid-rows-2">
                  <TicketCell label="Flight / date" value={ticketDate} />
                  <TicketCell label="Boarding" value={firstEv?.time} />
                  <TicketCell label="Destination" value={dateReveal?.location} edit="dateReveal.location" />
                  <TicketCell label="Venue" value={firstEv?.venue} />
                </div>
              </Zone>

              {/* lower stub — the plate already carries a seal on its right */}
              <Zone box={{ x0: 0.248, y0: 0.735, x1: 0.56, y1: 0.85 }} className="justify-center">
                <Label size={15}>Departure</Label>
                <Value size={26} className="mt-[2%]">
                  {ticketDate}
                </Value>
                <Rule className="mt-[6%]" width="70%" />
                <Label size={13} className="mt-[6%]">
                  Boarding for love
                </Label>
              </Zone>
            </Stage>

            {/* ------------------------- 2 · the letter ------------------------ */}
            {hidden.includes("families") ? null : (
              <Stage id="frame-families" art={ART.letter}>
                <Zone box={{ x0: 0.105, y0: 0.178, x1: 0.68, y1: 0.28 }} className="justify-center">
                  {families?.subheading ? (
                    <Label data-edit="families.subheading" size={15}>
                      {families.subheading}
                    </Label>
                  ) : null}
                  <Heading data-edit="families.heading" size={40} className="mt-[3%]">
                    {families?.heading}
                  </Heading>
                </Zone>

                {/* The plate is a ruled ledger with a column divider a third of
                    the way in, so the letter is written as label → entry rows
                    and every line-height is the rule pitch. */}
                <Zone box={{ x0: 0.108, y0: 0.292, x1: 0.872, y1: 0.86 }}>
                  {hero?.tagline || families?.footer ? (
                    <LedgerRow label="Invitation">
                      <span data-edit="hero.tagline">{hero?.tagline || families?.footer}</span>
                    </LedgerRow>
                  ) : null}
                  <LedgerRow label="The families">
                    <FamilyEntry person={couple.partner1} path="couple.partner1" />
                    <FamilyEntry person={couple.partner2} path="couple.partner2" />
                  </LedgerRow>

                  <div className="mt-auto flex items-end justify-between">
                    <div>
                      <Label size={13}>With love</Label>
                      <span
                        style={{
                          fontFamily: "var(--font-parisienne)",
                          fontSize: u(30),
                          color: "var(--v-ink)",
                        }}
                      >
                        {names.join(" & ")}
                      </span>
                    </div>
                    <Postmark
                      initials={initialsOf(couple.partner1?.name, couple.partner2?.name)}
                      date={ticketDate}
                      size={120}
                    />
                  </div>
                </Zone>
              </Stage>
            )}

            {/* -------------------------- 3 · the photo ------------------------ */}
            {hidden.includes("story") ? null : (
              <Stage id="frame-story" art={ART.photo}>
                <Zone box={{ x0: 0.14, y0: 0.168, x1: 0.62, y1: 0.228 }} className="justify-center">
                  <Heading data-edit="story.heading" size={30}>
                    {story?.heading}
                  </Heading>
                </Zone>
                {/* starts below the plate's corner postmark so the two don't
                    sit on top of each other */}
                <Zone box={{ x0: 0.138, y0: 0.3, x1: 0.865, y1: 0.618 }}>
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center"
                      style={{ border: "1px dashed color-mix(in srgb, var(--v-gold) 50%, transparent)" }}
                    >
                      <Label size={15}>Your photo</Label>
                    </div>
                  )}
                </Zone>
                {story?.subtext ? (
                  <Zone box={{ x0: 0.12, y0: 0.7, x1: 0.88, y1: 0.78 }} className="items-center justify-start">
                    <Body data-edit="story.subtext" size={20} tone="cream" className="text-center">
                      {story.subtext}
                    </Body>
                  </Zone>
                ) : null}
              </Stage>
            )}

            {/* ------------------ 4 · the countdown + the month ----------------- */}
            <Stage art={ART.date}>
              <Zone box={{ x0: 0.1, y0: 0.17, x1: 0.9, y1: 0.26 }} className="items-center justify-center">
                <Heading data-edit="countdown.headline" size={34} tone="cream" className="text-center">
                  {countdown?.headline}
                </Heading>
              </Zone>
              <Zone box={{ x0: 0.1, y0: 0.3, x1: 0.9, y1: 0.42 }} className="justify-center">
                <FlightCountdown targetDate={countdown?.targetDate} />
              </Zone>
              {countdown?.subtext ? (
                <Zone box={{ x0: 0.12, y0: 0.45, x1: 0.88, y1: 0.52 }} className="items-center justify-start">
                  <Label data-edit="countdown.subtext" size={14}>
                    {countdown.subtext}
                  </Label>
                </Zone>
              ) : null}

              {/* the wide stamp is exactly a month grid's shape */}
              <Zone box={{ x0: 0.1, y0: 0.625, x1: 0.9, y1: 0.86 }} className="justify-center">
                <MonthCalendar targetDate={countdown?.targetDate} />
                <p
                  data-edit="dateReveal.eventDate"
                  className="mt-[3%] text-center uppercase"
                  style={{
                    fontFamily: "var(--font-space-mono)",
                    fontSize: u(17),
                    letterSpacing: "0.2em",
                    color: "var(--v-gold)",
                  }}
                >
                  {ticketDate || dateReveal?.eventDate} · {dateReveal?.location}
                </p>
              </Zone>
            </Stage>

            {/* --------------------------- 5 · the venue ----------------------- */}
            <Stage art={ART.venue}>
              <Zone box={{ x0: 0.16, y0: 0.168, x1: 0.82, y1: 0.216 }} className="items-center justify-center">
                <Label size={16}>Venue</Label>
              </Zone>
              <Zone box={{ x0: 0.16, y0: 0.575, x1: 0.82, y1: 0.82 }} className="items-center">
                <Heading size={36} className="text-center">
                  {firstEv?.venue}
                </Heading>
                {firstEv?.address ? (
                  <Body size={19} className="mt-[3%] text-center">
                    {firstEv.address}
                  </Body>
                ) : null}
                {canRoute ? (
                  <DirectionsLink
                    target={target}
                    className="mt-[7%] inline-block uppercase"
                    style={{
                      fontFamily: "var(--font-space-mono)",
                      fontSize: u(17),
                      letterSpacing: "0.16em",
                      color: "var(--v-cream)",
                      background: "var(--v-navy)",
                      padding: `${u(14)} ${u(30)}`,
                    }}
                  >
                    How to get there
                  </DirectionsLink>
                ) : null}
              </Zone>
            </Stage>

            {/* --------------------------- 6 · the route ----------------------- */}
            {hidden.includes("schedule") || stops.length === 0 ? null : (
              <Stage id="frame-schedule" art={ART.timeline}>
                <Zone
                  box={{ x0: 0.215, y0: 0.238, x1: 0.775, y1: 0.295 }}
                  className="items-center justify-center overflow-hidden"
                >
                  <Heading data-edit="schedule.heading" size={24} className="text-center">
                    {schedule?.heading}
                  </Heading>
                </Zone>
                <Zone box={{ x0: 0.235, y0: 0.325, x1: 0.78, y1: 0.73 }}>
                  <TimelineRail events={stops} />
                </Zone>
              </Stage>
            )}

            {/* ------------------------- 7 · the dress code -------------------- */}
            <PlainSlide compact={compact}>
              <DressCode
                heading={dress?.heading ?? "Dress code"}
                note={
                  dress?.note ??
                  "We'd love to see you in something elegant and timeless — our palette for the day:"
                }
                swatches={dress?.swatches}
              />
            </PlainSlide>

            {/* ---------------------------- 8 · the stub ----------------------- */}
            {hidden.includes("rsvp") ? null : (
              <PlainSlide
                id="frame-rsvp"
                compact={compact}
                path="M14,-4 C14,34 70,44 74,66 C78,86 52,96 46,108"
              >
                <TicketRsvp content={content} live={live} />
                {canRoute ? (
                  <div className="mt-7 text-center">
                    <DirectionsLink target={target}>
                      <StubButton tone="ghost" className="!border-[rgba(245,241,228,0.35)] !text-[var(--v-cream)]">
                        {map?.directionsLabel ?? "Get directions"}
                      </StubButton>
                    </DirectionsLink>
                  </div>
                ) : null}
              </PlainSlide>
            )}

            {/* --------------------------- 9 · the arrival --------------------- */}
            <Stage art={ART.closing}>
              <Zone box={{ x0: 0.07, y0: 0.34, x1: 0.5, y1: 0.63 }} className="justify-center">
                <Label size={15}>Arrivals</Label>
                <span
                  style={{
                    fontFamily: "var(--font-parisienne)",
                    fontSize: u(46),
                    color: "var(--v-cream)",
                    lineHeight: 1.25,
                  }}
                >
                  {names.join(" & ")}
                </span>
                <Rule className="my-[8%]" width="60%" />
                <Body data-edit="hero.closingLine" size={18} tone="cream">
                  {hero?.closingLine || rsvp?.footer}
                </Body>
              </Zone>
            </Stage>
          </main>

          <MusicToggle trackUrl={content.music?.trackUrl} />
          <ScrollGuide active={opened} hasMusic={!!content.music?.trackUrl} />
        </div>
      </ThemeProvider>
    </PreviewContext.Provider>
  );
}

/** One cell of the boarding pass's details grid. */
function TicketCell({ label, value, edit }: { label: string; value?: string; edit?: string }) {
  return (
    <div className="flex flex-col justify-center overflow-hidden pl-[4%] pr-[2%]">
      <Label size={12}>{label}</Label>
      {/* a long venue or district wraps to a second line rather than being
          cut off — the cells on the plate are shallow but not that shallow */}
      <Value size={16} className="line-clamp-2" data-edit={edit}>
        {value || "—"}
      </Value>
    </div>
  );
}

/**
 * A row of the letter plate's ledger: a gold label in the narrow left column,
 * the entry in the wide one. The divider drawn on the plate sits about 27% in.
 */
function LedgerRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex" style={{ minHeight: u(62) }}>
      <div style={{ width: "26.5%", flexShrink: 0, paddingTop: u(10) }}>
        <Label size={13}>{label}</Label>
      </div>
      <div
        className="flex-1"
        style={{
          fontFamily: "var(--font-karla)",
          fontSize: u(20),
          color: "var(--v-body)",
          // the rules are 62 art-px apart; matching it writes ON the lines
          lineHeight: u(62),
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** "Libina · D/o Scaria & Bindu" — one family, one ruled line. */
function FamilyEntry({
  person,
  path,
}: {
  person?: InvitationContent["couple"]["partner1"];
  path: string;
}) {
  if (!person?.name) return null;
  const parents = [person.father, person.mother].filter(Boolean).join(" & ");
  return (
    <p className="truncate">
      <span data-edit={`${path}.name`} style={{ color: "var(--v-ink)", fontWeight: 600 }}>
        {person.name}
      </span>
      {parents ? (
        <span style={{ color: "var(--v-body)" }}>
          {` · ${person.parentsPrefix ?? "S/D of"} ${parents}`}
        </span>
      ) : null}
    </p>
  );
}
