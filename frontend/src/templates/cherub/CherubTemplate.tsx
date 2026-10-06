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
import { ActionButton, Icon, Rise } from "@/templates/garden/kit";
import { ReplyForm } from "@/templates/garden/reply";
import { useTour } from "@/templates/garden/tour";
import { useAutoBegin, useFirstTapMusic } from "@/templates/garden/autostart";
import { ART, BEIGE, CAPS, CARD, Cartouche, Floaty, INK, INK_SOFT, ITALIC, ON_BEIGE, ProgramCard, SCRIPT, SERIF, pill, v } from "./parts";

/**
 * "Cherub Garden" — a romantic painted garden in peach, blush and sage, with
 * cherubs and doves drifting about cream cards.
 *
 * One long card: "Wedding Day" over the garden painting with the invitation
 * on a scooped cream cartouche, two cherubs beside it; the program on a cream
 * card with three cherubs on a cloud; a love story on warm beige; the reply
 * under an arch of roses, doves either side; and "With love" over a rose
 * path. The cherubs are decoration, never the couple: there are no pictures
 * of the couple anywhere.
 *
 * For every guest: large type and buttons, the reply form open on the page,
 * and the card begins to play itself after a few seconds (useAutoBegin).
 */

const PALETTE = {
  // the shared pieces (the reply form, the buttons) draw in these
  "--g-ink": "#8a6552",
  "--g-cream": CARD,
  "--g-soft": INK_SOFT,
  "--chrome-bg": "#b8957f",
  "--chrome-fg": "#fffaf5",
  "--chrome-ring": "rgba(255,250,245,0.7)",
} as CSSProperties;

/* -------------------------------- type -------------------------------- */

function Body({ children, color = INK, size = 17, style }: { children: ReactNode; color?: string; size?: number; style?: CSSProperties }) {
  return (
    <p style={{ fontFamily: ITALIC, fontStyle: "italic", fontWeight: 400, fontSize: `max(16px, ${v(size)})`, lineHeight: 1.45, color, textWrap: "balance", ...style }}>
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

const longDate = (iso?: string) => {
  const d = new Date(iso ?? "");
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
};

/* ----------------------------- the template ----------------------------- */

export function CherubTemplate({
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

  const { couple, schedule, countdown, rsvp, map, hero, story } = content;
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

  const target = firstEv ? targetFromEvent(firstEv) : {};
  if (map?.directionsQuery?.trim()) {
    target.query = map.directionsQuery.trim();
    target.url = undefined;
  }
  if (map?.directionsUrl?.trim()) target.url = map.directionsUrl.trim();

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
    return `${p.name ?? ""}${prefix ? `, ${prefix.charAt(0).toLowerCase()}${prefix.slice(1)} ` : ": "}${names}`;
  };
  const longNames = `${p1 ?? ""}${p2 ?? ""}`.length > 16;

  return (
    <PreviewContext.Provider value={{ compact, editing }}>
      <ThemeProvider theme={theme} className={`relative overflow-x-hidden ${snap ? "h-svh overflow-y-auto" : "min-h-screen"}`}>
        <div style={{ ...PALETTE, background: "#e9dcd2" }} className="flex min-h-full justify-center">
          <StyleOverrides content={content} />
          <TextOffsets offsets={content.offsets} />

          <main ref={main} className="relative" style={{ width: compact ? "100%" : "min(100%, 480px)", containerType: "inline-size", background: BEIGE }}>
            {/* ------------------------------ cover ------------------------------ */}
            <section id="frame-couple" className="relative overflow-hidden" style={{ padding: `${v(70)} ${v(24)} ${v(250)}` }}>
              {ART.garden ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ART.garden} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "50% 0%" }} />
              ) : (
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(180deg, #f4c9a6 0%, #f6dcc4 18%, #dfe3cf 40%, #c9d6c4 62%, #a9c4c9 76%, #e6b9b0 90%, #d99f97 100%)" }}
                />
              )}

              {guided && !begun ? (
                <div className="absolute inset-x-0 z-[4] flex justify-center" style={{ top: v(14) }}>
                  <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>
                    <ActionButton tone="cream" icon="hand" onClick={() => begin(true)}>
                      Tap here to begin
                    </ActionButton>
                  </motion.div>
                </div>
              ) : null}

              <motion.div
                className="relative z-[2] text-center"
                initial={compact || editing ? false : { opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.4, ease: "easeOut" }}
                style={{ fontFamily: CAPS, color: "#5b4034", textShadow: "0 1px 12px rgba(255,240,225,0.8)", lineHeight: 1 }}
              >
                <p style={{ fontSize: v(50), letterSpacing: "0.06em" }}>Wedding</p>
                <p style={{ fontSize: v(50), letterSpacing: "0.06em", marginTop: v(8) }}>Day</p>
              </motion.div>

              <div className="relative z-[2]" style={{ marginTop: v(26) }}>
                <Floaty src={ART.cupidRight} width={104} style={{ left: v(-30), top: v(36) }} />
                <Floaty src={ART.cupidLeft} width={96} delay={1.2} style={{ right: v(-30), bottom: v(120) }} />
                <Cartouche>
                  <div className="flex flex-col items-center text-center" style={{ padding: `${v(10)} ${v(8)}` }}>
                    <Rise>
                      <p style={{ fontFamily: SCRIPT, fontSize: v(longNames ? 38 : 46), lineHeight: 1.15, color: INK, textWrap: "balance" }}>
                        {[p1, p2].filter(Boolean).join(" & ")}
                      </p>
                    </Rise>
                    {parents(couple.partner1) || parents(couple.partner2) ? (
                      <Rise className="flex flex-col items-center" style={{ marginTop: v(4), gap: v(2) }}>
                        {[couple.partner1, couple.partner2].map((p, i) =>
                          parents(p) ? (
                            <Body key={i} size={14} color={INK_SOFT}>
                              {parents(p)}
                            </Body>
                          ) : null,
                        )}
                      </Rise>
                    ) : null}
                    <Rise style={{ marginTop: v(8) }}>
                      <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: v(22), letterSpacing: "0.04em", color: INK }}>{dotted(countdown?.targetDate)}</p>
                    </Rise>
                    <Rise style={{ marginTop: v(14) }}>
                      <Body>With great joy and happiness, we invite you to share with us the first special day of our family</Body>
                    </Rise>
                    <Rise style={{ marginTop: v(14) }}>
                      <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: v(20), letterSpacing: "0.08em", textTransform: "uppercase", color: INK }}>
                        {hero?.marriageText?.trim() || "Our wedding!"}
                      </p>
                    </Rise>
                    <Rise style={{ marginTop: v(12) }}>
                      <Body>Having you with us on this most important day, with your love and blessings beside us, will fill our hearts with joy.</Body>
                    </Rise>
                    <Rise style={{ marginTop: v(16) }}>
                      {longDate(countdown?.targetDate) || firstEv?.time ? (
                        <p style={{ fontFamily: ITALIC, fontStyle: "italic", fontWeight: 600, fontSize: `max(18px, ${v(19)})`, color: INK }}>
                          {[longDate(countdown?.targetDate), firstEv?.time].filter(Boolean).join(" at ")}
                        </p>
                      ) : null}
                      {firstEv?.venue?.trim() ? (
                        <p style={{ fontFamily: ITALIC, fontStyle: "italic", fontWeight: 600, fontSize: `max(18px, ${v(19)})`, color: INK }}>{firstEv.venue}</p>
                      ) : null}
                      {firstEv?.address?.trim() ? <Body size={15} color={INK_SOFT}>{firstEv.address}</Body> : null}
                    </Rise>
                    <Rise className="flex flex-col items-center" style={{ marginTop: v(18), gap: 12 }}>
                      {hasMapTarget(target) ? (
                        <DirectionsLink target={target} style={pill}>
                          <Icon name="pin" />
                          {map?.directionsLabel?.trim() || "Directions"}
                        </DirectionsLink>
                      ) : null}
                      {cal ? (
                        <button type="button" style={pill} onClick={() => downloadIcs(cal, "invitation.ics")}>
                          <Icon name="calendar" />
                          Add to my calendar
                        </button>
                      ) : null}
                    </Rise>
                  </div>
                </Cartouche>
              </div>
            </section>

            {/* ----------------------------- program ----------------------------- */}
            {hidden.includes("schedule") || !events.length ? null : (
              <section id="frame-schedule" className="relative" style={{ padding: `0 ${v(26)} ${v(30)}` }}>
                <div className="relative z-[2]" style={{ marginTop: v(-150) }}>
                  <ProgramCard style={{ paddingBottom: ART.cherubs ? v(150) : v(34) }}>
                    <Rise className="text-center">
                      <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: v(21), letterSpacing: "0.12em", textTransform: "uppercase", color: INK }}>
                        {schedule?.heading?.trim() && !/^(schedule( of events)?|events?|timeline|programme?)$/i.test(schedule.heading.trim()) ? schedule.heading : "Wedding program"}
                      </p>
                    </Rise>
                    <div className="flex flex-col" style={{ marginTop: v(18), gap: v(14) }}>
                      {events.map((ev, i) => (
                        <Rise key={ev.id} delay={0.05 * i} className="text-center">
                          <Body size={18}>
                            {[ev.time, ev.name].filter((x) => x?.trim()).join("  |  ")}
                          </Body>
                          {manyVenues && ev.venue?.trim() ? (
                            <Body size={14} color={INK_SOFT}>
                              {ev.venue}
                            </Body>
                          ) : null}
                        </Rise>
                      ))}
                    </div>
                    {ART.cherubs ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ART.cherubs} alt="" aria-hidden className="pointer-events-none absolute left-1/2" style={{ bottom: v(10), width: v(200), transform: "translateX(-50%)" }} />
                    ) : null}
                  </ProgramCard>
                </div>
              </section>
            )}

            {/* ---------------------------- love story ---------------------------- */}
            {hidden.includes("story") ? null : (
              <section id="frame-story" className="relative flex flex-col items-center text-center" style={{ padding: `${v(36)} ${v(34)} ${v(40)}` }}>
                <Rise>
                  <p style={{ fontFamily: ITALIC, fontStyle: "italic", fontSize: v(26), letterSpacing: "0.16em", textTransform: "uppercase", color: ON_BEIGE }}>
                    {story?.heading?.trim() && !/^our story$/i.test(story.heading.trim()) ? story.heading : "A love story…"}
                  </p>
                </Rise>
                <Rise style={{ marginTop: v(16) }}>
                  <Body color={ON_BEIGE} size={17}>
                    {story?.subtext?.trim() ||
                      "Our journey began by chance and slowly grew into the greatest love of our lives. We have chosen to share every day that is to come together, and to wake each morning with the same smile. We wish to make the promise we have made to each other everlasting, in the presence of our beloved family and friends. We hope you will be with us on this joyful and unforgettable day…"}
                  </Body>
                </Rise>
                {!hidden.includes("dresscode") && hasDressCode(content) ? (
                  <Rise className="flex flex-col items-center" style={{ marginTop: v(30) }}>
                    <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: v(18), letterSpacing: "0.14em", textTransform: "uppercase", color: ON_BEIGE }}>
                      {dress?.heading?.trim() || "Dress code"}
                    </p>
                    {dress?.note?.trim() ? (
                      <Body color={ON_BEIGE} size={16} style={{ marginTop: v(8) }}>
                        {dress.note}
                      </Body>
                    ) : null}
                    {dress?.swatches?.length ? (
                      <div className="flex justify-center" style={{ marginTop: v(12), gap: v(8) }}>
                        {dress.swatches.slice(0, 6).map((s, i) => (
                          <span
                            key={`${s.hex}-${i}`}
                            title={s.label}
                            className="block rounded-full"
                            style={{ width: v(38), height: v(38), background: s.hex, boxShadow: `0 0 0 2px ${BEIGE}, 0 0 0 3px ${ON_BEIGE}` }}
                          />
                        ))}
                      </div>
                    ) : null}
                    {dress?.avoid?.trim() ? (
                      <Body color={ON_BEIGE} size={15} style={{ marginTop: v(8) }}>
                        Kindly avoid {dress.avoid}
                      </Body>
                    ) : null}
                  </Rise>
                ) : null}
                {wishes.slice(0, 4).map((w, i) => (
                  <Rise key={i} style={{ marginTop: v(i ? 16 : 28) }}>
                    {w.title?.trim() ? (
                      <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: v(16), letterSpacing: "0.12em", textTransform: "uppercase", color: ON_BEIGE }}>{w.title}</p>
                    ) : null}
                    <Body color={ON_BEIGE} size={16} style={{ marginTop: v(4) }}>
                      {w.body}
                    </Body>
                  </Rise>
                ))}
              </section>
            )}

            {/* ------------------------------- reply ------------------------------- */}
            {hidden.includes("rsvp") ? null : (
              <section id="frame-rsvp" className="relative" style={{ padding: `${v(20)} ${v(20)} ${v(36)}` }}>
                <div className="relative mx-auto" style={{ maxWidth: 460 }}>
                  <Floaty src={ART.dove} width={78} style={{ left: v(-18), top: v(150) }} />
                  <Floaty src={ART.dove} width={70} flip delay={1.5} style={{ right: v(-16), bottom: v(150) }} />
                  <Cartouche style={{ marginTop: ART.garland ? v(56) : 0 }}>
                    <div className="flex flex-col items-center text-center" style={{ padding: `${ART.garland ? v(40) : v(10)} ${v(4)} ${v(6)}` }}>
                      <Rise>
                        <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: v(30), letterSpacing: "0.1em", color: INK }}>
                          {rsvp?.heading?.trim() || "RSVP"}
                        </p>
                      </Rise>
                      <Rise style={{ marginTop: v(10) }}>
                        <Body>
                          {rsvp?.footer?.trim() ||
                            "We would be very happy if you could let us know whether or not you'll be able to join us on our special and joyful day."}
                        </Body>
                      </Rise>
                      <div className="flex w-full justify-center" style={{ marginTop: v(14) }}>
                        <ReplyForm content={content} live={live} />
                      </div>
                    </div>
                  </Cartouche>
                  {ART.garland ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ART.garland} alt="" aria-hidden className="pointer-events-none absolute left-1/2 top-0 z-[2]" style={{ width: "112%", transform: "translateX(-50%)" }} />
                  ) : null}
                </div>
                {contacts.phone?.trim() || contacts.chatUrl?.trim() ? (
                  <Rise className="mx-auto flex w-full flex-col items-center" style={{ marginTop: v(20), gap: 12, maxWidth: 420 }}>
                    {contacts.phone?.trim() ? (
                      <a href={`tel:${contacts.phone.replace(/[^\d+]/g, "")}`} style={{ ...pill, width: "100%" }}>
                        <Icon name="phone" />
                        Call {contacts.contactName?.trim() || "us"}
                      </a>
                    ) : null}
                    {contacts.chatUrl?.trim() ? (
                      <a href={contacts.chatUrl.trim()} style={{ ...pill, width: "100%" }}>
                        <Icon name="chat" />
                        Join our chat group
                      </a>
                    ) : null}
                  </Rise>
                ) : null}
              </section>
            )}

            {/* ------------------------------ closing ------------------------------ */}
            <section className="relative flex flex-col items-center overflow-hidden text-center" style={{ minHeight: v(470), padding: `${v(150)} ${v(24)} ${v(60)}` }}>
              {ART.path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ART.path} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "50% 70%" }} />
              ) : (
                <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, #e8d3c6 0%, #e9c3b8 45%, #d9a59c 75%, #b9a3c4 100%)" }} />
              )}
              {/* the beige of the page above melts into the painting */}
              <div aria-hidden className="absolute inset-x-0 top-0" style={{ height: v(130), background: `linear-gradient(${BEIGE}, rgba(201,174,157,0))` }} />
              <Rise className="relative">
                <p style={{ fontFamily: SCRIPT, fontSize: v(44), lineHeight: 1.1, color: "#fffaf5", textShadow: "0 2px 14px rgba(92,60,40,0.55)" }}>With love</p>
                <p
                  style={{ fontFamily: SCRIPT, fontSize: v(longNames ? 36 : 42), lineHeight: 1.15, color: "#fffaf5", textShadow: "0 2px 14px rgba(92,60,40,0.55)", marginTop: v(6), textWrap: "balance" }}
                >
                  {[p1, p2].filter(Boolean).join(" & ")}
                </p>
                {hero?.closingLine?.trim() ? (
                  <Body color="#fffaf5" size={16} style={{ marginTop: v(10), textShadow: "0 1px 8px rgba(92,60,40,0.6)" }}>
                    {hero.closingLine}
                  </Body>
                ) : null}
              </Rise>
            </section>
          </main>

          {tour.running && !tour.paused ? (
            <motion.div
              key={tour.stop.n}
              aria-hidden
              className="pointer-events-none fixed left-0 top-0 z-[70] h-[3px]"
              style={{ background: "#b8957f" }}
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
