"use client";

import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { RenderProps } from "@/engine/types";
import { PreviewContext } from "@/components/PreviewContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { MusicToggle } from "@/components/MusicToggle";
import { ScrollGuide } from "@/components/ScrollGuide";
import { StyleOverrides } from "@/components/StyleOverrides";
import { TextOffsets } from "@/templates/TextOffsets";
import { DirectionsLink } from "@/components/DirectionsLink";
import { hasDressCode } from "@/blocks/DressCode";
import { hasMapTarget, targetFromEvent } from "@/lib/maps";
import { calendarEvent, downloadIcs } from "@/lib/calendar";
import { keepTitles } from "@/lib/titles";
import { ActionButton, Rise } from "@/templates/garden/kit";
import { ReplyForm } from "@/templates/garden/reply";
import { useTour } from "@/templates/garden/tour";
import { useAutoBegin, useFirstTapMusic } from "@/templates/garden/autostart";
import { Tear } from "@/templates/emerald/parts";
import { ART as VELVET, iconFor } from "@/templates/velvet/parts";
import { ART, GREEN, INK, MonthCalendar, ON_GREEN, ON_GREEN_SOFT, SCRIPT, SERIF, SOFT, SatinSwatch, VenueMap, WHITE, v } from "./parts";

/**
 * "Forest Letter" — white pages and forest-green pages torn from one another,
 * calligraphy headings and a plain book serif.
 *
 * One long card: the names over a still-life photograph and the date between
 * fine rules; a letter to family and friends with the whole month and the day
 * in a heart; the venue with its live map; the day's timeline, a drawing
 * beside each stop; who to ask; the wishes; the dress code in circles of
 * satin; the reply; and "We can do anything when we're together" over a
 * black-and-white photograph. No pictures of the couple anywhere.
 *
 * For every guest: large type and buttons, the reply form open on the page,
 * and the card begins to play itself after a few seconds (useAutoBegin).
 */

const PALETTE = {
  // the shared pieces (the reply form, the buttons) draw in these
  "--g-ink": GREEN,
  "--g-cream": WHITE,
  "--g-soft": SOFT,
  "--chrome-bg": GREEN,
  "--chrome-fg": WHITE,
  "--chrome-ring": "rgba(251,250,247,0.6)",
} as CSSProperties;

/* -------------------------------- type -------------------------------- */

function Heading({ children, color = INK, size = 34 }: { children: ReactNode; color?: string; size?: number }) {
  return <p style={{ fontFamily: SCRIPT, fontSize: v(size), lineHeight: 1.15, color, textWrap: "balance" }}>{children}</p>;
}

function Body({ children, color = INK, size = 17, style }: { children: ReactNode; color?: string; size?: number; style?: CSSProperties }) {
  return (
    <p style={{ fontFamily: SERIF, fontSize: `max(16px, ${v(size)})`, lineHeight: 1.5, color, textWrap: "balance", ...style }}>
      {children}
    </p>
  );
}

/** A Velvet Lily line drawing for an event, in white on the green or dark on white. */
function Drawing({ name, i, all, onGreen = true, size = 46 }: { name?: string; i: number; all?: string[]; onGreen?: boolean; size?: number }) {
  const src = VELVET.icons[iconFor(name, i, all)];
  if (!src) return <span style={{ width: v(size), height: v(size) }} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden
      style={{ width: v(size), height: v(size), objectFit: "contain", filter: onGreen ? "brightness(0) invert(0.95)" : "brightness(0) opacity(0.75)" }}
    />
  );
}

type Page = { key: string; bg: string; node: ReactNode };

/* ----------------------------- the template ----------------------------- */

export function ForestTemplate({
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
  const reduce = useReducedMotion();
  const guided = intro && !compact && !editing;
  const main = useRef<HTMLElement | null>(null);
  const [begun, setBegun] = useState(!guided);

  const { couple, schedule, countdown, rsvp, map, hero } = content;
  const hidden = content.hiddenSections ?? [];
  const p1 = couple.partner1?.name;
  const p2 = couple.partner2?.name;
  const events = (schedule?.events ?? []).slice(0, 8);
  const firstEv = events[0];
  const manyVenues = new Set(events.map((e) => e.venue?.trim()).filter(Boolean)).size > 1;
  const dress = content.dressCode;
  const wishes = content.wishes ?? [];
  const contacts = content.contacts ?? {};
  const cal = calendarEvent(content);
  const when = new Date(countdown?.targetDate ?? "");
  const hasWhen = !Number.isNaN(when.getTime());

  const target = firstEv ? targetFromEvent(firstEv) : {};
  if (map?.directionsQuery?.trim()) {
    target.query = map.directionsQuery.trim();
    target.url = undefined;
  }
  if (map?.directionsUrl?.trim()) target.url = map.directionsUrl.trim();
  // a map only with an address (or a place typed for it): a venue's name alone
  // can match a namesake anywhere in the world
  const mapQuery = map?.directionsQuery?.trim() || (firstEv?.address?.trim() ? [firstEv.venue, firstEv.address].filter((x) => x?.trim()).join(", ") : "");

  /* "Tap here to begin" plays the music and the card walks itself through,
     page by page to the end (useTour). If nobody taps, it begins by itself
     after four seconds, and the music starts with their first tap anywhere. */
  const tour = useTour(main);
  const begin = (withSound: boolean) => {
    if (begun) return;
    setBegun(true);
    if (withSound) {
      try {
        window.dispatchEvent(new Event("invite:open"));
      } catch {
        /* no window */
      }
    }
    if (!reduce) tour.start(1500);
  };
  // it begins by itself in a few seconds; the music starts on the first tap
  useAutoBegin(begun, begin);
  useFirstTapMusic();

  // "Rejin, son of Mr. & Mrs. Mathew" — or "Rejin: Mr. & Mrs. Mathew" with no prefix
  const parents = (p?: typeof couple.partner1) => {
    const names = [p?.father, p?.mother].filter((x) => x?.trim()).join(" & ");
    if (hidden.includes("families") || !p || !names) return "";
    const prefix = p.parentsPrefix?.trim();
    return keepTitles(`${p.name ?? ""}${prefix ? `, ${prefix.charAt(0).toLowerCase()}${prefix.slice(1)} ` : ": "}${names}`);
  };

  /* The pages in order, each white or green; where the colour changes, the
     page below tears into the next. */
  const pages: Page[] = [];

  pages.push({
    key: "frame-couple",
    bg: WHITE,
    node: (
      <>
        {guided && !begun ? (
          <div className="absolute inset-x-0 z-[3] flex justify-center" style={{ top: v(14) }}>
            <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>
              <ActionButton icon="hand" onClick={() => begin(true)}>
                Tap here to begin
              </ActionButton>
            </motion.div>
          </div>
        ) : null}
        <Rise className="w-full" style={{ marginTop: v(76) }}>
          <p style={{ fontFamily: SCRIPT, fontSize: v(50), lineHeight: 1.05, color: INK, textAlign: "left", paddingLeft: v(6) }}>{keepTitles(p1 ?? "")}</p>
          <p style={{ fontFamily: SCRIPT, fontSize: v(50), lineHeight: 1.05, color: INK, textAlign: "right", paddingRight: v(6), marginTop: v(-4) }}>{keepTitles(p2 ?? "")}</p>
        </Rise>
        <Rise className="w-full" style={{ marginTop: v(16) }}>
          {ART.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ART.cover} alt="" aria-hidden className="block w-full object-cover" style={{ aspectRatio: "4 / 5" }} />
          ) : (
            <div aria-hidden className="w-full" style={{ aspectRatio: "4 / 5", background: "radial-gradient(circle at 55% 40%, #f4f1e8, #c9c8b8 55%, #7d8571)" }} />
          )}
        </Rise>
        {hasWhen ? (
          <Rise className="flex w-full items-center justify-center" style={{ marginTop: v(20), gap: v(12) }}>
            <span style={{ borderTop: `1px solid ${INK}`, borderBottom: `1px solid ${INK}`, padding: `${v(2)} ${v(10)}`, fontFamily: SCRIPT, fontSize: v(26), color: INK }}>
              {when.toLocaleDateString("en-GB", { month: "long" })}
            </span>
            <span style={{ fontFamily: SCRIPT, fontSize: v(58), lineHeight: 1, color: INK }}>{when.getDate()}</span>
            <span style={{ borderTop: `1px solid ${INK}`, borderBottom: `1px solid ${INK}`, padding: `${v(2)} ${v(10)}`, fontFamily: SCRIPT, fontSize: v(26), color: INK }}>
              {when.getFullYear()}
            </span>
          </Rise>
        ) : null}
        {firstEv?.time ? (
          <Rise style={{ marginTop: v(6) }}>
            <Body size={17} color={SOFT}>
              at {firstEv.time}
            </Body>
          </Rise>
        ) : null}
      </>
    ),
  });

  if (!hidden.includes("families")) {
    pages.push({
      key: "frame-families",
      bg: GREEN,
      node: (
        <>
          <Rise>
            <Heading color={ON_GREEN}>Dear friends and family!</Heading>
          </Rise>
          <Rise style={{ marginTop: v(14) }}>
            <Body color={ON_GREEN}>With great joy we invite you to the celebration of our love and happiness. We would be so glad to see you with us as we begin a new chapter of our life together.</Body>
          </Rise>
          {parents(couple.partner1) || parents(couple.partner2) ? (
            <Rise className="flex flex-col items-center" style={{ marginTop: v(14), gap: v(4) }}>
              {[couple.partner1, couple.partner2].map((p, i) =>
                parents(p) ? (
                  <Body key={i} size={15} color={ON_GREEN_SOFT} style={{ fontStyle: "italic" }}>
                    {parents(p)}
                  </Body>
                ) : null,
              )}
            </Rise>
          ) : null}
          {hasWhen ? (
            <Rise className="w-full" style={{ marginTop: v(18) }}>
              <MonthCalendar iso={countdown?.targetDate} />
            </Rise>
          ) : null}
        </>
      ),
    });
  }

  pages.push({
    key: "frame-venue",
    bg: GREEN,
    node: (
      <>
        <Rise>
          <Heading color={ON_GREEN}>The venue</Heading>
        </Rise>
        {content.venuePhoto ? (
          <Rise className="w-full" style={{ marginTop: v(14) }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={content.venuePhoto} alt="" className="block w-full object-cover" style={{ aspectRatio: "16 / 10" }} />
          </Rise>
        ) : null}
        <Rise className="w-full text-left" style={{ marginTop: v(14) }}>
          {firstEv?.venue?.trim() ? <Body color={ON_GREEN} style={{ textAlign: "left" }}>{firstEv.venue}</Body> : null}
          {firstEv?.address?.trim() ? (
            <Body color={ON_GREEN_SOFT} size={16} style={{ textAlign: "left" }}>
              {firstEv.address}
            </Body>
          ) : null}
        </Rise>
        {mapQuery ? (
          <Rise className="w-full" style={{ marginTop: v(14) }}>
            <VenueMap query={mapQuery}>
              {hasMapTarget(target) ? (
                <DirectionsLink target={target} style={{ display: "block", width: "100%", height: "100%" }}>
                  <span className="sr-only">Open directions</span>
                </DirectionsLink>
              ) : null}
            </VenueMap>
          </Rise>
        ) : null}
        <Rise className="flex flex-col items-center" style={{ marginTop: v(18), gap: 12 }}>
          {hasMapTarget(target) ? (
            <DirectionsLink target={target} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 56, padding: `0 ${v(26)}`, borderRadius: 999, background: ON_GREEN, color: GREEN, fontFamily: SERIF, fontSize: "max(17px, 4.4cqw)", fontWeight: 600 }}>
              {map?.directionsLabel?.trim() || "Get directions"}
            </DirectionsLink>
          ) : null}
          {cal ? (
            <ActionButton icon="calendar" tone="cream" onClick={() => downloadIcs(cal, "invitation.ics")}>
              Add to my calendar
            </ActionButton>
          ) : null}
        </Rise>
      </>
    ),
  });

  if (!hidden.includes("schedule") && events.length) {
    pages.push({
      key: "frame-schedule",
      bg: GREEN,
      node: (
        <>
          <Rise>
            <Heading color={ON_GREEN}>{schedule?.heading?.trim() && !/^(schedule( of events)?|events?|timeline)$/i.test(schedule.heading.trim()) ? schedule.heading : "The day's timeline"}</Heading>
          </Rise>
          <div className="relative w-full" style={{ marginTop: v(20) }}>
            {events.length > 1 ? (
              <span aria-hidden className="absolute" style={{ left: v(74), top: v(24), bottom: v(24), width: 1, background: ON_GREEN_SOFT }} />
            ) : null}
            <div className="flex flex-col" style={{ gap: v(22) }}>
              {events.map((ev, i) => (
                <Rise key={ev.id} delay={0.05 * i} className="relative flex items-start text-left" style={{ gap: v(16) }}>
                  <span className="flex shrink-0 items-center justify-center" style={{ width: v(56), height: v(50) }}>
                    <Drawing name={ev.name} i={i} all={events.map((e) => e.name)} />
                  </span>
                  <span aria-hidden className="absolute rounded-full" style={{ left: v(70.5), top: v(20), width: v(8), height: v(8), background: ON_GREEN }} />
                  <div className="min-w-0" style={{ paddingLeft: v(14) }}>
                    {ev.time ? <p style={{ fontFamily: SERIF, fontSize: v(26), lineHeight: 1.1, color: ON_GREEN }}>{ev.time}</p> : null}
                    <p style={{ fontFamily: SERIF, fontSize: `max(17px, ${v(18)})`, lineHeight: 1.3, color: ON_GREEN }}>{ev.name}</p>
                    {manyVenues && ev.venue?.trim() ? <Body size={14} color={ON_GREEN_SOFT} style={{ textAlign: "left" }}>{ev.venue}</Body> : null}
                  </div>
                </Rise>
              ))}
            </div>
          </div>
        </>
      ),
    });
  }

  if (contacts.phone?.trim() || contacts.chatUrl?.trim()) {
    pages.push({
      key: "frame-contacts",
      bg: GREEN,
      node: (
        <>
          <Rise>
            <Heading color={ON_GREEN}>Information</Heading>
          </Rise>
          <Rise style={{ marginTop: v(12) }}>
            <Body color={ON_GREEN}>If you have any questions about the wedding, {contacts.contactName?.trim() || "we"} will be happy to help.</Body>
          </Rise>
          <Rise className="flex w-full flex-col items-center" style={{ marginTop: v(16), gap: 12, maxWidth: 420 }}>
            {contacts.phone?.trim() ? (
              <ActionButton icon="phone" wide tone="cream" href={`tel:${contacts.phone.replace(/[^\d+]/g, "")}`}>
                Call {contacts.phone.trim()}
              </ActionButton>
            ) : null}
            {contacts.chatUrl?.trim() ? (
              <ActionButton icon="chat" wide tone="cream" href={contacts.chatUrl.trim()}>
                Join our chat group
              </ActionButton>
            ) : null}
          </Rise>
        </>
      ),
    });
  }

  if (wishes.length) {
    pages.push({
      key: "frame-details",
      bg: WHITE,
      node: (
        <>
          <Rise>
            <Heading>Wishes</Heading>
          </Rise>
          {wishes.slice(0, 4).map((w, i) => (
            <Rise key={i} style={{ marginTop: v(i ? 14 : 12) }}>
              {w.title?.trim() ? (
                <p style={{ fontFamily: SERIF, fontSize: `max(13px, ${v(13)})`, letterSpacing: "0.2em", textTransform: "uppercase", color: SOFT }}>{w.title}</p>
              ) : null}
              <Body style={{ marginTop: v(2) }}>{w.body}</Body>
            </Rise>
          ))}
          <Rise style={{ marginTop: v(16) }}>
            <Drawing name="toast" i={0} onGreen={false} size={70} />
          </Rise>
        </>
      ),
    });
  }

  if (!hidden.includes("dresscode") && hasDressCode(content)) {
    pages.push({
      key: "frame-dresscode",
      bg: GREEN,
      node: (
        <>
          <Rise>
            <Heading color={ON_GREEN}>{dress?.heading?.trim() || "Dress code"}</Heading>
          </Rise>
          {dress?.note?.trim() ? (
            <Rise style={{ marginTop: v(12) }}>
              <Body color={ON_GREEN}>{dress.note}</Body>
            </Rise>
          ) : null}
          {dress?.swatches?.length ? (
            <Rise className="grid justify-center" style={{ gridTemplateColumns: `repeat(${Math.min(3, dress.swatches.length)}, auto)`, gap: v(16), marginTop: v(18) }}>
              {dress.swatches.slice(0, 6).map((s, i) => (
                <SatinSwatch key={`${s.hex}-${i}`} hex={s.hex} label={s.label} />
              ))}
            </Rise>
          ) : null}
          {dress?.avoid?.trim() ? (
            <Rise style={{ marginTop: v(16) }}>
              <Body color={ON_GREEN_SOFT} size={16}>
                Kindly avoid {dress.avoid}
              </Body>
            </Rise>
          ) : null}
        </>
      ),
    });
  }

  if (!hidden.includes("rsvp")) {
    pages.push({
      key: "frame-rsvp",
      bg: WHITE,
      node: (
        <>
          <Rise>
            <Heading>{rsvp?.heading?.trim() && rsvp.heading !== "RSVP" ? rsvp.heading : "Will you be with us?"}</Heading>
          </Rise>
          <Rise style={{ marginTop: v(10) }}>
            <Body>{rsvp?.footer?.trim() || "Please let us know if you can come. Your answer helps us make this day even more wonderful."}</Body>
          </Rise>
          <div className="flex w-full justify-center" style={{ marginTop: v(16) }}>
            <ReplyForm content={content} live={live} />
          </div>
        </>
      ),
    });
  }

  pages.push({
    key: "closing",
    bg: WHITE,
    node: (
      <>
        <Rise className="w-full" style={{ marginTop: v(6) }}>
          <p style={{ fontFamily: SCRIPT, fontSize: v(40), lineHeight: 1.1, color: INK, textAlign: "left", paddingLeft: v(10) }}>We can do anything</p>
          <p style={{ fontFamily: SCRIPT, fontSize: v(30), lineHeight: 1.1, color: INK, textAlign: "right", paddingRight: v(10) }}>when we&rsquo;re together</p>
        </Rise>
        <Rise className="relative w-full" style={{ marginTop: v(14) }}>
          {ART.closing ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ART.closing} alt="" aria-hidden className="block w-full object-cover" style={{ aspectRatio: "4 / 5", filter: "grayscale(1)" }} />
          ) : (
            <div aria-hidden className="w-full" style={{ aspectRatio: "4 / 5", background: "radial-gradient(circle at 50% 45%, #e8e8e6, #9a9a96 55%, #3c3c3a)" }} />
          )}
          <div aria-hidden className="absolute inset-x-0 bottom-0" style={{ height: "45%", background: "linear-gradient(rgba(20,20,18,0), rgba(20,20,18,0.6))" }} />
          <div className="absolute inset-x-0 bottom-0 text-right" style={{ padding: `0 ${v(18)} ${v(18)}` }}>
            <p style={{ fontFamily: SERIF, fontSize: `max(15px, ${v(15)})`, color: "#fff" }}>With love,</p>
            <p style={{ fontFamily: SCRIPT, fontSize: v(36), lineHeight: 1.15, color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,0.4)" }}>
              {[p1, p2].filter(Boolean).map((n) => keepTitles(n!)).join(" & ")}
            </p>
          </div>
        </Rise>
        {hero?.closingLine?.trim() ? (
          <Rise style={{ marginTop: v(14) }}>
            <Body color={SOFT}>{hero.closingLine}</Body>
          </Rise>
        ) : null}
      </>
    ),
  });

  return (
    <PreviewContext.Provider value={{ compact, editing }}>
      <ThemeProvider theme={theme} className={`relative overflow-x-hidden ${snap ? "h-svh overflow-y-auto" : "min-h-screen"}`}>
        <div style={{ ...PALETTE, background: "#a9b3a1" }} className="flex min-h-full justify-center">
          <StyleOverrides content={content} />
          <TextOffsets offsets={content.offsets} />

          <main ref={main} className="relative" style={{ width: compact ? "100%" : "min(100%, 480px)", containerType: "inline-size", background: WHITE }}>
            {pages.map((p, i) => {
              const next = pages[i + 1];
              const tears = next && next.bg !== p.bg;
              return (
                <section
                  key={p.key}
                  id={p.key === "closing" ? undefined : p.key}
                  className="relative flex flex-col items-center text-center"
                  style={{ background: p.bg, padding: `${v(30)} ${v(24)} ${tears ? v(64) : v(30)}` }}
                >
                  {p.node}
                  {tears ? <Tear color={next.bg} edge="bottom" seed={7 + i * 13} height={38} /> : null}
                </section>
              );
            })}
          </main>

          {tour.running && !tour.paused ? (
            <motion.div
              key={tour.stop.n}
              aria-hidden
              className="pointer-events-none fixed left-0 top-0 z-[70] h-[3px]"
              style={{ background: GREEN }}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: tour.stop.ms / 1000, ease: "linear" }}
            />
          ) : null}
          <MusicToggle trackUrl={content.music?.trackUrl} />
          {begun ? <ScrollGuide active hasMusic={!!content.music?.trackUrl} /> : null}
        </div>
      </ThemeProvider>
    </PreviewContext.Provider>
  );
}
