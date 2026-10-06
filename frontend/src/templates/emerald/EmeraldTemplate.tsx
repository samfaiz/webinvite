"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
import { ActionButton, Icon, Rise, actionStyle } from "@/templates/garden/kit";
import { ReplyForm } from "@/templates/garden/reply";
import { useTour } from "@/templates/garden/tour";
import { ART, DARK, DISPLAY, Dots, INK, MIST, RoseBand, RoseCascade, SAGE, SANS, STONE, Tear, v } from "./parts";

/**
 * "Emerald Rose" — near-black emerald and warm stone, white and emerald
 * roses, torn and brushed edges between the sections.
 *
 * One long card: their names over white and emerald roses; a row
 * of roses into the dark green welcome; a torn edge into the stone timing,
 * roses trailing down its sides; the dress code over a dark banquet hall;
 * the location and its photograph; the details; roses again into the
 * questionnaire; and "We await you". Drawn here, apart from the roses and
 * two pictures (ART in parts.tsx; stand-ins until they're in).
 *
 * No pictures of the couple anywhere: they'd rather not be shown, so the
 * cover is always the roses.
 *
 * For every guest: large type and buttons, "Tap here to begin" plays the
 * music and walks them through, and the reply form opens on the page.
 */

const PALETTE = {
  // the shared pieces (buttons, the reply form) draw in
  // these three: deep emerald buttons on a warm cream card
  "--g-ink": "#173a2e",
  "--g-cream": "#efe9dd",
  "--g-soft": "#5b5a50",
  "--chrome-bg": "#173a2e",
  "--chrome-fg": "#efe9dd",
  "--chrome-ring": "rgba(239,233,221,0.55)",
} as CSSProperties;

/* -------------------------------- type -------------------------------- */

/** A section title in the high-contrast display face, with its small
 *  subtitle underneath, as the reference sets every one. */
function Title({ children, sub, color = INK, size = 52, italic = false }: { children: ReactNode; sub?: string; color?: string; size?: number; italic?: boolean }) {
  return (
    <div className="flex flex-col items-center text-center">
      <p style={{ fontFamily: DISPLAY, fontWeight: 400, fontStyle: italic ? "italic" : undefined, fontSize: v(size), lineHeight: 1.05, letterSpacing: "-0.01em", color }}>
        {children}
      </p>
      {sub ? (
        <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: `max(14px, ${v(14)})`, color, opacity: 0.8, marginTop: v(4) }}>{sub}</p>
      ) : null}
    </div>
  );
}

function P({ children, color = INK, className = "", style }: { children: ReactNode; color?: string; className?: string; style?: CSSProperties }) {
  return (
    <p className={className} style={{ fontFamily: SANS, fontWeight: 300, fontSize: `max(16px, ${v(16)})`, lineHeight: 1.55, color, ...style }}>
      {children}
    </p>
  );
}

const dotted = (iso?: string) => {
  const d = new Date(iso ?? "");
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
};

/* ----------------------------- the template ----------------------------- */

export function EmeraldTemplate({
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
  const [formOpen, setFormOpen] = useState(false);

  const { couple, families, schedule, countdown, rsvp, map, hero } = content;
  const hidden = content.hiddenSections ?? [];
  const p1 = couple.partner1?.name;
  const p2 = couple.partner2?.name;
  const coverImage = ART.cover;
  const events = (schedule?.events ?? []).slice(0, 8);
  const firstEv = events[0];
  const dress = content.dressCode;
  const wishes = content.wishes ?? [];
  const contacts = content.contacts ?? {};
  const cal = calendarEvent(content);

  const target = firstEv ? targetFromEvent(firstEv) : {};
  if (map?.directionsQuery?.trim()) {
    target.query = map.directionsQuery.trim();
    target.url = undefined;
  }
  if (map?.directionsUrl?.trim()) target.url = map.directionsUrl.trim();

  /* "Tap here to begin" plays the music and the card walks itself through,
     page by page to the end (useTour). If nobody taps, it begins by itself
     after twelve seconds, without music. */
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
    if (!reduce) tour.start();
  };
  const beginRef = useRef(begin);
  useEffect(() => {
    beginRef.current = begin;
  });
  useEffect(() => {
    if (begun) return;
    const t = window.setTimeout(() => beginRef.current(false), 12000);
    const stop = () => window.clearTimeout(t);
    window.addEventListener("pointerdown", stop, { once: true });
    window.addEventListener("wheel", stop, { once: true });
    return () => {
      stop();
      window.removeEventListener("pointerdown", stop);
      window.removeEventListener("wheel", stop);
    };
  }, [begun]);

  return (
    <PreviewContext.Provider value={{ compact, editing }}>
      <ThemeProvider theme={theme} className={`relative overflow-x-hidden ${snap ? "h-svh overflow-y-auto" : "min-h-screen"}`}>
        <div style={{ ...PALETTE, background: "#060d0c" }} className="flex min-h-full justify-center">
          <StyleOverrides content={content} />
          <TextOffsets offsets={content.offsets} />

          <main ref={main} className="relative" style={{ width: compact ? "100%" : "min(100%, 480px)", containerType: "inline-size", background: DARK }}>
            {/* ------------------------------ cover ------------------------------ */}
            <section id="frame-couple" className="relative overflow-hidden" style={{ background: DARK }}>
              <div className="relative" style={{ height: v(560) }}>
                {coverImage ? (
                  <motion.img
                    src={coverImage}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ objectPosition: "50% 30%" }}
                    initial={compact || editing ? false : { scale: 1.08, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 2.4, ease: "easeOut" }}
                  />
                ) : (
                  <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 35%, #1d3a30, #0e1817 70%)" }} />
                )}
                {/* the picture darkens into the green, so the names sit on it */}
                <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(14,24,23,0) 40%, rgba(14,24,23,0.65) 72%, ${DARK} 100%)` }} />
                <motion.div
                  className="absolute inset-x-0 flex flex-col items-center text-center"
                  style={{ bottom: v(30), color: "#f4f1ea", textShadow: "0 2px 16px rgba(6,13,12,0.85), 0 0 4px rgba(6,13,12,0.6)" }}
                  initial={compact || editing ? false : { opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.4, delay: 0.6, ease: "easeOut" }}
                >
                  <p style={{ fontFamily: "var(--font-greatvibes)", fontSize: v(18), lineHeight: 1, opacity: 0.9 }}>Wedding day</p>
                  <p style={{ fontFamily: DISPLAY, fontSize: v(17), letterSpacing: "0.04em", marginTop: v(2) }}>{dotted(countdown?.targetDate)}</p>
                  <p style={{ fontFamily: DISPLAY, fontSize: v(p1 && p1.length > 9 ? 52 : 62), lineHeight: 0.95, marginTop: v(8) }}>{p1}</p>
                  <p style={{ fontFamily: DISPLAY, fontSize: v(p2 && p2.length > 9 ? 52 : 62), lineHeight: 0.95 }}>{p2}</p>
                </motion.div>
              </div>
              {guided && !begun ? (
                <div className="absolute inset-x-0 flex justify-center" style={{ top: v(24) }}>
                  <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>
                    <ActionButton tone="cream" icon="hand" onClick={() => begin(true)}>
                      Tap here to begin
                    </ActionButton>
                  </motion.div>
                </div>
              ) : null}
            </section>
            <RoseBand top={{ background: DARK }} bottom={{ background: DARK }} />

            {/* ----------------------------- welcome ----------------------------- */}
            {hidden.includes("families") ? null : (
              <section id="frame-families" className="relative flex flex-col items-center text-center" style={{ background: DARK, padding: `${v(26)} ${v(32)} ${v(70)}` }}>
                <Rise>
                  <Title color="#f4f1ea" size={32} italic>
                    {families?.heading?.trim() && families.heading !== "Introducing the Families" ? families.heading : "Dear family and friends!"}
                  </Title>
                </Rise>
                <Rise delay={0.1} style={{ marginTop: v(18) }}>
                  <P color={MIST}>We are happy to invite you to a very special occasion — our wedding.</P>
                  <P color={MIST} style={{ marginTop: v(14) }}>
                    It would be a great joy for us to share this day with you.
                  </P>
                </Rise>
                <Rise delay={0.2} style={{ marginTop: v(30) }}>
                  <p style={{ fontFamily: DISPLAY, fontSize: v(42), lineHeight: 1, color: "#f4f1ea" }}>{dotted(countdown?.targetDate)}</p>
                  {firstEv?.time ? <P color={MIST} style={{ marginTop: v(6) }}>at {firstEv.time}</P> : null}
                </Rise>
                {(couple.partner1?.father || couple.partner1?.mother || couple.partner2?.father || couple.partner2?.mother) ? (
                  <Rise delay={0.25} className="flex flex-col items-center" style={{ marginTop: v(28), gap: v(14) }}>
                    {[couple.partner1, couple.partner2].map((p, i) =>
                      p?.name ? (
                        <div key={i}>
                          <p style={{ fontFamily: DISPLAY, fontStyle: "italic", fontSize: v(26), color: "#f4f1ea" }}>{p.name}</p>
                          {[p.father, p.mother].filter((x) => x?.trim()).length ? (
                            <P color={MIST} style={{ fontSize: `max(14px, ${v(14)})` }}>
                              {p.parentsPrefix?.trim() ? `${p.parentsPrefix} ` : ""}
                              {[p.father, p.mother].filter((x) => x?.trim()).join(" & ")}
                            </P>
                          ) : null}
                        </div>
                      ) : null,
                    )}
                  </Rise>
                ) : null}
                <Rise delay={0.3} style={{ marginTop: v(26) }}>
                  <P color={MIST}>We will be glad to see you among our guests.</P>
                  {cal ? (
                    <div style={{ marginTop: v(20) }}>
                      <ActionButton icon="calendar" tone="cream" onClick={() => downloadIcs(cal, "invitation.ics")}>
                        Add to my calendar
                      </ActionButton>
                    </div>
                  ) : null}
                </Rise>
                <Tear color={STONE} edge="bottom" seed={11} />
              </section>
            )}

            {/* ------------------------------ timing ------------------------------ */}
            {hidden.includes("schedule") || !events.length ? null : (
              <section id="frame-schedule" className="relative flex flex-col items-center overflow-hidden text-center" style={{ background: STONE, padding: `${v(40)} ${v(44)} ${v(70)}` }}>
                <RoseCascade side="left" top={v(-30)} height={v(420)} />
                {events.length > 2 ? <RoseCascade side="right" top="52%" height={v(420)} /> : null}
                <Rise>
                  <Title sub="Programme of the celebration">Timing</Title>
                </Rise>
                <div className="flex flex-col items-center" style={{ marginTop: v(26), gap: v(26) }}>
                  {events.map((ev, i) => (
                    <Rise key={ev.id} delay={0.08 * i} className="flex flex-col items-center">
                      <p style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: v(46), lineHeight: 1, color: SAGE }}>{ev.time}</p>
                      <p style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: v(27), lineHeight: 1.15, color: INK, marginTop: v(4) }}>{ev.name}</p>
                      {[ev.venue, ev.address].filter((x) => x?.trim()).length ? (
                        <P color="#4d4b43" style={{ marginTop: v(6), maxWidth: "26ch" }}>
                          {[ev.venue, ev.address].filter((x) => x?.trim()).join(", ")}
                        </P>
                      ) : null}
                    </Rise>
                  ))}
                </div>
                <Tear color={DARK} edge="bottom" seed={23} height={40} />
              </section>
            )}

            {/* ---------------------------- dress code ---------------------------- */}
            {!hidden.includes("dresscode") && hasDressCode(content) ? (
              <section id="frame-dresscode" className="relative flex flex-col items-center overflow-hidden text-center" style={{ background: DARK, padding: `${v(70)} ${v(30)} ${v(150)}` }}>
                {ART.dressBg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ART.dressBg} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 80%, #1f4a3c, #0e1817 70%)" }} />
                )}
                <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(14,24,23,0.85), rgba(14,24,23,0.55) 45%, rgba(14,24,23,0.2))" }} />
                <div className="relative flex flex-col items-center">
                  <Rise>
                    <Title color="#f4f1ea" sub="What to wear">
                      {dress?.heading?.trim() || "Dress code"}
                    </Title>
                  </Rise>
                  {dress?.note?.trim() ? (
                    <Rise>
                      <P color={MIST} style={{ marginTop: v(16), maxWidth: "30ch" }}>
                        {dress.note}
                      </P>
                    </Rise>
                  ) : null}
                  {dress?.swatches?.length ? (
                    <Rise style={{ marginTop: v(22) }}>
                      <Dots colors={dress.swatches.slice(0, 6)} />
                    </Rise>
                  ) : null}
                  {dress?.avoid?.trim() ? (
                    <Rise>
                      <P color={MIST} style={{ marginTop: v(16) }}>
                        Kindly avoid {dress.avoid}
                      </P>
                    </Rise>
                  ) : null}
                </div>
                <Tear color={DARK} edge="bottom" seed={37} height={40} />
              </section>
            ) : null}

            {/* ----------------------------- location ----------------------------- */}
            <section id="frame-venue" className="relative flex flex-col items-center overflow-hidden text-center" style={{ background: DARK, padding: `${v(40)} 0 ${content.venuePhoto ? 0 : v(70)}` }}>
              <Rise>
                <Title color="#f4f1ea" sub="Place of the celebration">
                  Location
                </Title>
              </Rise>
              <Rise style={{ marginTop: v(18), padding: `0 ${v(30)}` }}>
                <P color={MIST}>We look forward to seeing you at:</P>
                {firstEv?.venue ? <P color="#f4f1ea">{firstEv.venue}</P> : null}
                {firstEv?.address ? <P color={MIST}>{firstEv.address}</P> : null}
              </Rise>
              {hasMapTarget(target) ? (
                <Rise style={{ marginTop: v(20) }}>
                  <DirectionsLink target={target} style={actionStyle("cream")}>
                    <Icon name="pin" />
                    {map?.directionsLabel?.trim() || "Get directions"}
                  </DirectionsLink>
                </Rise>
              ) : null}
              {content.venuePhoto ? (
                <Rise className="relative w-full" style={{ marginTop: v(30) }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={content.venuePhoto} alt="" className="block w-full object-cover" style={{ aspectRatio: "4 / 3" }} />
                  <Tear color={DARK} edge="top" seed={41} height={30} />
                </Rise>
              ) : null}
              <Tear color={STONE} edge="bottom" seed={53} height={36} />
            </section>

            {/* ------------------------------ details ------------------------------ */}
            {wishes.length ? (
              <section id="frame-details" className="relative flex flex-col items-center text-center" style={{ background: STONE, padding: `${v(40)} ${v(36)} ${v(30)}` }}>
                <Rise>
                  <Title sub="Our wishes">Details</Title>
                </Rise>
                {wishes.slice(0, 4).map((w, i) => (
                  <Rise key={i} style={{ marginTop: v(20) }}>
                    {w.title?.trim() ? (
                      <p style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: v(20), color: INK, marginBottom: v(4) }}>{w.title}</p>
                    ) : null}
                    <P color="#4d4b43">{w.body}</P>
                  </Rise>
                ))}
              </section>
            ) : null}

            <RoseBand top={{ background: STONE }} bottom={{ background: DARK }} />

            {/* --------------------------- questionnaire --------------------------- */}
            {hidden.includes("rsvp") ? null : (
              <section id="frame-rsvp" className="relative flex flex-col items-center text-center" style={{ background: DARK, padding: `${v(20)} ${v(26)} ${v(30)}` }}>
                <Rise>
                  <Title color="#f4f1ea" sub="Guest questionnaire">
                    {rsvp?.heading?.trim() && rsvp.heading !== "RSVP" ? rsvp.heading : "Questionnaire"}
                  </Title>
                </Rise>
                <Rise style={{ marginTop: v(20) }}>
                  <p style={{ fontFamily: DISPLAY, fontSize: v(34), lineHeight: 1.15, color: "#f4f1ea" }}>{dotted(countdown?.targetDate)}</p>
                  {firstEv?.time ? <p style={{ fontFamily: DISPLAY, fontSize: v(30), lineHeight: 1.15, color: "#f4f1ea" }}>{firstEv.time}</p> : null}
                </Rise>
                <Rise style={{ marginTop: v(18) }}>
                  <P color={MIST}>{rsvp?.footer?.trim() || "Please confirm your attendance by tapping the button below."}</P>
                </Rise>
                <AnimatePresence initial={false} mode="wait">
                  {formOpen || editing ? (
                    <motion.div
                      key="form"
                      className="w-full"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.5 }}
                      style={{ marginTop: v(22) }}
                    >
                      {/* the form sits on a light card, so its labels and buttons read on the dark green */}
                      <div className="mx-auto flex justify-center rounded-2xl" style={{ background: "#efe9dd", padding: "24px 18px", maxWidth: 440 }}>
                        <ReplyForm content={content} live={live} />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="button" style={{ marginTop: v(24) }} exit={{ opacity: 0 }}>
                      <button
                        type="button"
                        onClick={() => setFormOpen(true)}
                        style={{
                          ...actionStyle("olive"),
                          background: "linear-gradient(180deg, #24493c, #142e25)",
                          color: "#efe9dd",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          fontSize: 15,
                          boxShadow: "inset 0 0 0 1px rgba(239,233,221,0.35), 0 8px 24px rgba(0,0,0,0.45)",
                        }}
                      >
                        <Icon name="send" />
                        Fill in the form
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                {contacts.phone?.trim() || contacts.chatUrl?.trim() ? (
                  <Rise className="flex w-full flex-col items-center" style={{ marginTop: v(26), gap: 12, maxWidth: 420 }}>
                    {contacts.phone?.trim() ? (
                      <ActionButton icon="phone" wide tone="cream" href={`tel:${contacts.phone.replace(/[^\d+]/g, "")}`}>
                        Call {contacts.contactName?.trim() || "us"}
                      </ActionButton>
                    ) : null}
                    {contacts.chatUrl?.trim() ? (
                      <ActionButton icon="chat" wide tone="cream" href={contacts.chatUrl.trim()}>
                        Join our chat group
                      </ActionButton>
                    ) : null}
                  </Rise>
                ) : null}
              </section>
            )}

            {/* ------------------------------ closing ------------------------------ */}
            <section className="relative flex flex-col items-center text-center" style={{ background: DARK, padding: `${v(30)} ${v(24)} ${v(10)}` }}>
              <Rise>
                <p style={{ fontFamily: DISPLAY, fontStyle: "italic", fontSize: v(46), color: "#f4f1ea" }}>We await you!</p>
              </Rise>
              {hero?.closingLine?.trim() ? (
                <Rise>
                  <P color={MIST} style={{ marginTop: v(8) }}>
                    {hero.closingLine}
                  </P>
                </Rise>
              ) : null}
              <Rise>
                <p style={{ fontFamily: DISPLAY, fontSize: v(22), letterSpacing: "0.06em", color: MIST, marginTop: v(14) }}>
                  {[p1, p2].filter(Boolean).join(" & ")}
                </p>
              </Rise>
            </section>
            <RoseBand top={{ background: DARK }} bottom={{ background: DARK }} />
            <div style={{ height: v(40), background: DARK }} />
          </main>

          {tour.running && !tour.paused ? (
            <motion.div
              key={tour.stop.n}
              aria-hidden
              className="pointer-events-none fixed left-0 top-0 z-[70] h-[3px]"
              style={{ background: "#efe9dd" }}
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
