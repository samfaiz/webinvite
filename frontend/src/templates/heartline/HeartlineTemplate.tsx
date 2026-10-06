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
import { ActionButton, Icon, Rise } from "@/templates/garden/kit";
import { ReplyForm } from "@/templates/garden/reply";
import { useTour } from "@/templates/garden/tour";
import { useAutoBegin, useFirstTapMusic } from "@/templates/garden/autostart";
import {
  ART,
  BowString,
  DARK,
  Divider,
  HAND,
  HEART,
  HeartLine,
  HeartShape,
  INK,
  ON_DARK,
  SCRIPT,
  SERIF,
  SOFT,
  Wave,
  paper,
  timelineGeometry,
  v,
  venueKind,
  weekOf,
} from "./parts";

/**
 * "Heartline" — ivory paper and dark brown ink, held together by one
 * hand-drawn line that loops into a heart.
 *
 * One long card: the names, a still-life photograph and the date between two
 * rules; a letter to family and friends with the week of the wedding and the
 * day in a heart; the timeline winding down from that heart; where it all
 * happens, as a pen sketch; the dress code as bows on a string in the
 * couple's colours, and their wishes; who to call; the reply on a dark wavy
 * band; and "We are waiting for you". No pictures of the couple anywhere.
 *
 * For every guest: large type and buttons, the reply form open on the page,
 * and the card begins to play itself after a few seconds (useAutoBegin).
 */

const PALETTE = {
  // the shared pieces (the reply form, the buttons) draw in these
  "--g-ink": INK,
  "--g-cream": "#f8f4ee",
  "--g-soft": SOFT,
  "--chrome-bg": INK,
  "--chrome-fg": "#f8f4ee",
  "--chrome-ring": "rgba(248,244,238,0.6)",
} as CSSProperties;

/* -------------------------------- type -------------------------------- */

function Hand({ children, color = INK, size = 30, style }: { children: ReactNode; color?: string; size?: number; style?: CSSProperties }) {
  return (
    <p style={{ fontFamily: HAND, fontSize: v(size), lineHeight: 1.1, letterSpacing: "0.04em", textTransform: "uppercase", color, textWrap: "balance", ...style }}>
      {children}
    </p>
  );
}

function Body({ children, color = INK, size = 17, style }: { children: ReactNode; color?: string; size?: number; style?: CSSProperties }) {
  return (
    <p style={{ fontFamily: SERIF, fontSize: `max(16px, ${v(size)})`, lineHeight: 1.5, color, textWrap: "balance", ...style }}>
      {children}
    </p>
  );
}

function Caps({ children, color = INK, size = 13, style }: { children: ReactNode; color?: string; size?: number; style?: CSSProperties }) {
  return (
    <p style={{ fontFamily: SERIF, fontSize: `max(12px, ${v(size)})`, letterSpacing: "0.26em", textTransform: "uppercase", color, ...style }}>{children}</p>
  );
}

/** "Rejin & Dr. Jessin": a break comes before the "&", a title keeps to its name. */
function Couple({ p1, p2 }: { p1?: string; p2?: string }) {
  if (!p1 || !p2) return <>{keepTitles(p1 || p2 || "")}</>;
  return (
    <>
      <span style={{ whiteSpace: "nowrap" }}>{keepTitles(p1)}</span>{" "}
      <span style={{ whiteSpace: "nowrap" }}>&amp; {keepTitles(p2)}</span>
    </>
  );
}

/** An outlined, squared button like the reference's "Open map". */
const outlined: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  minHeight: 54,
  padding: `0 ${v(26)}`,
  border: `1.2px solid ${INK}`,
  background: "rgba(255,255,255,0.35)",
  color: INK,
  fontFamily: SERIF,
  fontSize: "max(15px, 3.9cqw)",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
};

/* ----------------------------- the template ----------------------------- */

export function HeartlineTemplate({
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
  const week = weekOf(countdown?.targetDate);
  const when = new Date(countdown?.targetDate ?? "");
  const hasWhen = !Number.isNaN(when.getTime());
  const sketch = ART.venues[venueKind(content.venueArt, firstEv?.venue)];

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
    return keepTitles(`${p.name ?? ""}${prefix ? `, ${prefix.charAt(0).toLowerCase()}${prefix.slice(1)} ` : ": "}${names}`);
  };
  const longNames = `${p1 ?? ""}${p2 ?? ""}`.length > 16;
  const line = timelineGeometry(Math.max(events.length, 1), week?.col ?? 6);

  return (
    <PreviewContext.Provider value={{ compact, editing }}>
      <ThemeProvider theme={theme} className={`relative overflow-x-hidden ${snap ? "h-svh overflow-y-auto" : "min-h-screen"}`}>
        <div style={{ ...PALETTE, background: "#e7e0d5" }} className="flex min-h-full justify-center">
          <StyleOverrides content={content} />
          <TextOffsets offsets={content.offsets} />

          <main ref={main} className="relative" style={{ width: compact ? "100%" : "min(100%, 480px)", containerType: "inline-size", ...paper }}>
            {/* ------------------------------ cover ------------------------------ */}
            <section id="frame-couple" className="relative flex flex-col items-center text-center" style={{ padding: `${v(86)} ${v(26)} 0` }}>
              {guided && !begun ? (
                <div className="absolute inset-x-0 z-[3] flex justify-center" style={{ top: v(14) }}>
                  <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>
                    <ActionButton icon="hand" onClick={() => begin(true)}>
                      Tap here to begin
                    </ActionButton>
                  </motion.div>
                </div>
              ) : null}
              <Rise>
                <p style={{ fontFamily: SCRIPT, fontSize: v(longNames ? 40 : 48), lineHeight: 1.15, color: INK, textWrap: "balance" }}>
                  <Couple p1={p1} p2={p2} />
                </p>
              </Rise>
              <Rise className="flex flex-col items-center" style={{ marginTop: v(10), gap: v(10) }}>
                <Divider width={260} />
                <Caps size={12}>Wedding invitation</Caps>
              </Rise>
              <Rise className="w-full" style={{ marginTop: v(20) }}>
                <div className="mx-auto" style={{ width: v(316), padding: v(5), border: `1px solid rgba(59,47,42,0.35)` }}>
                  {ART.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ART.cover} alt="" aria-hidden className="block w-full object-cover" style={{ aspectRatio: "4 / 5" }} />
                  ) : (
                    <div aria-hidden className="w-full" style={{ aspectRatio: "4 / 5", background: "radial-gradient(circle at 60% 35%, #f4ead9, #cdbba4 55%, #8a735e)" }} />
                  )}
                </div>
              </Rise>
              <Rise style={{ marginTop: v(26) }}>
                <Caps size={13}>Wedding day</Caps>
              </Rise>
              {hasWhen ? (
                <Rise className="flex items-stretch justify-center" style={{ marginTop: v(14) }}>
                  <div style={{ borderLeft: `1px solid ${INK}`, borderRight: `1px solid ${INK}`, padding: `${v(4)} ${v(30)}` }}>
                    <Body size={15} color={SOFT}>
                      date
                    </Body>
                    <p style={{ fontFamily: SERIF, fontSize: v(30), lineHeight: 1.15, color: INK }}>{when.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</p>
                    {firstEv?.time ? <Body size={18}>{firstEv.time}</Body> : null}
                  </div>
                </Rise>
              ) : null}
              <HeartLine style={{ marginTop: v(26), width: "calc(100% + 2 * 6.667cqw)", marginLeft: v(-26), marginRight: v(-26) }} />
            </section>

            {/* ------------------------- letter & calendar ------------------------- */}
            {hidden.includes("families") ? null : (
              <section id="frame-families" className="relative flex flex-col items-center text-center" style={{ padding: `${v(30)} ${v(30)} ${v(10)}` }}>
                <Rise>
                  <Hand>Dear family and friends!</Hand>
                </Rise>
                <Rise style={{ marginTop: v(16) }}>
                  <Body>We would be so happy to share this meaningful day with you. Having you with us will make our wedding even more special.</Body>
                </Rise>
                {parents(couple.partner1) || parents(couple.partner2) ? (
                  <Rise className="flex flex-col items-center" style={{ marginTop: v(14), gap: v(4) }}>
                    {[couple.partner1, couple.partner2].map((p, i) =>
                      parents(p) ? (
                        <Body key={i} size={15} color={SOFT} style={{ fontStyle: "italic" }}>
                          {parents(p)}
                        </Body>
                      ) : null,
                    )}
                  </Rise>
                ) : null}
                <Rise style={{ marginTop: v(16) }}>
                  <Body size={16}>With love,</Body>
                  <p style={{ fontFamily: SCRIPT, fontSize: v(32), lineHeight: 1.2, color: INK }}>
                    <Couple p1={p1} p2={p2} />
                  </p>
                </Rise>
                {week ? (
                  <Rise className="flex w-full flex-col items-center" style={{ marginTop: v(22) }}>
                    <Divider width={300} />
                    <p style={{ fontFamily: SERIF, fontSize: v(22), letterSpacing: "0.08em", textTransform: "uppercase", color: INK, marginTop: v(16) }}>{week.month}</p>
                    <div className="grid w-full" style={{ gridTemplateColumns: "repeat(7, 1fr)", marginTop: v(12), rowGap: v(8) }}>
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                        <span key={d} style={{ fontFamily: SERIF, fontSize: `max(10px, ${v(10)})`, letterSpacing: "0.08em", textTransform: "uppercase", color: SOFT }}>
                          {d}
                        </span>
                      ))}
                      {week.days.map((d, i) => (
                        <span key={i} className="flex items-center justify-center" style={{ height: v(40) }}>
                          {d.on ? (
                            <HeartShape size={v(40)}>
                              <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: v(17), color: "#fff" }}>{d.n}</span>
                            </HeartShape>
                          ) : (
                            <span style={{ fontFamily: SERIF, fontSize: v(18), color: INK }}>{d.n}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </Rise>
                ) : null}
              </section>
            )}

            {/* ----------------------------- timeline ----------------------------- */}
            {hidden.includes("schedule") || !events.length ? null : (
              <section id="frame-schedule" className="relative" style={{ padding: `0 0 ${v(20)}` }}>
                <div className="relative w-full" style={{ height: v(line.height) }}>
                  <svg viewBox={`0 0 390 ${line.height}`} aria-hidden className="absolute inset-0 block h-full w-full">
                    <path d={line.d} fill="none" stroke={INK} strokeWidth={1.2} strokeLinecap="round" />
                    {line.dots.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r={4} fill={HEART} />
                    ))}
                    <path
                      transform={`translate(${line.end.x - 9} ${line.end.y - 2}) scale(0.45)`}
                      d="M20 35 C 8 26, 1 19, 1 11 C 1 5, 6 1, 11 1 C 15 1, 18 3, 20 7 C 22 3, 25 1, 29 1 C 34 1, 39 5, 39 11 C 39 19, 32 26, 20 35 Z"
                      fill="none"
                      stroke={INK}
                      strokeWidth={2.4}
                    />
                  </svg>
                  {events.map((ev, i) => {
                    const left = i % 2 === 0;
                    return (
                      <Rise
                        key={ev.id}
                        delay={0.05 * i}
                        className="absolute flex flex-col items-center text-center"
                        style={{ top: v(line.dots[i].y - 34), left: left ? v(4) : v(240), width: v(148) }}
                      >
                        {ev.time ? <p style={{ fontFamily: HAND, fontSize: v(28), lineHeight: 1, color: INK }}>{ev.time}</p> : null}
                        <p
                          style={{
                            fontFamily: SERIF,
                            fontSize: `max(13px, ${v(13)})`,
                            // a long single word (a Kerala ceremony) keeps within its column
                            letterSpacing: /\S{12,}/.test(ev.name ?? "") ? "0.03em" : "0.12em",
                            overflowWrap: "anywhere",
                            textTransform: "uppercase",
                            color: INK,
                            marginTop: v(4),
                            lineHeight: 1.3,
                          }}
                        >
                          {ev.name}
                        </p>
                        {manyVenues && ev.venue?.trim() ? (
                          <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: `max(13px, ${v(13)})`, color: SOFT, lineHeight: 1.3, marginTop: v(2) }}>{ev.venue}</p>
                        ) : null}
                      </Rise>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ------------------------------ venue ------------------------------ */}
            <section id="frame-venue" className="relative flex flex-col items-center text-center" style={{ padding: `${v(24)} ${v(26)} ${v(30)}` }}>
              <Rise>
                <Hand>Where everything will happen</Hand>
              </Rise>
              <Rise style={{ marginTop: v(10) }}>
                <Divider width={190} />
              </Rise>
              <Rise style={{ marginTop: v(12) }}>
                {firstEv?.venue?.trim() ? <Body size={18}>{firstEv.venue}</Body> : null}
                {firstEv?.address?.trim() ? (
                  <Body size={16} color={SOFT}>
                    {firstEv.address}
                  </Body>
                ) : null}
              </Rise>
              <Rise className="w-full" style={{ marginTop: v(14) }}>
                {content.venuePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={content.venuePhoto} alt="" className="mx-auto block w-full object-cover" style={{ aspectRatio: "3 / 2", padding: v(5), border: "1px solid rgba(59,47,42,0.35)" }} />
                ) : sketch ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sketch} alt="" aria-hidden className="mx-auto block w-full" />
                ) : (
                  <div aria-hidden style={{ height: v(160) }} />
                )}
              </Rise>
              <Rise className="flex flex-col items-center" style={{ marginTop: v(16), gap: 12 }}>
                {hasMapTarget(target) ? (
                  <DirectionsLink target={target} style={outlined}>
                    <Icon name="pin" />
                    {map?.directionsLabel?.trim() || "Open map"}
                  </DirectionsLink>
                ) : null}
                {cal ? (
                  <button type="button" style={outlined} onClick={() => downloadIcs(cal, "invitation.ics")}>
                    <Icon name="calendar" />
                    Add to calendar
                  </button>
                ) : null}
              </Rise>
            </section>

            {/* ------------------------- dress code & wishes ------------------------- */}
            {(!hidden.includes("dresscode") && hasDressCode(content)) || wishes.length ? (
              <section id="frame-details" className="relative flex flex-col items-center text-center" style={{ padding: `${v(10)} ${v(26)} ${v(30)}` }}>
                {!hidden.includes("dresscode") && hasDressCode(content) ? (
                  <>
                    <Rise>
                      <div style={{ width: v(320), borderTop: `1px solid rgba(59,47,42,0.3)`, marginBottom: v(20) }} />
                      <Hand>{dress?.heading?.trim() || "Dress code"}</Hand>
                    </Rise>
                    {dress?.note?.trim() ? (
                      <Rise style={{ marginTop: v(12) }}>
                        <Body>{dress.note}</Body>
                      </Rise>
                    ) : null}
                    {dress?.swatches?.length ? (
                      <Rise className="w-full" style={{ marginTop: v(14) }}>
                        <BowString colors={dress.swatches} />
                      </Rise>
                    ) : null}
                    {dress?.avoid?.trim() ? (
                      <Rise style={{ marginTop: v(6) }}>
                        <Body size={16} color={SOFT} style={{ fontStyle: "italic" }}>
                          Kindly avoid {dress.avoid}
                        </Body>
                      </Rise>
                    ) : null}
                  </>
                ) : null}
                {wishes.length ? (
                  <>
                    <Rise className="flex flex-col items-center" style={{ marginTop: v(24) }}>
                      <Divider width={260} />
                      <Hand style={{ marginTop: v(16) }}>Wishes</Hand>
                    </Rise>
                    <div className="flex w-full flex-col" style={{ marginTop: v(14), gap: v(18) }}>
                      {wishes.slice(0, 4).map((w, i) => (
                        <Rise key={i} className="text-left" style={{ borderLeft: `1px solid ${INK}`, paddingLeft: v(16) }}>
                          {w.title?.trim() ? <Caps size={13}>{w.title}</Caps> : null}
                          <Body size={16} style={{ marginTop: v(4), textAlign: "left", textWrap: "pretty" }}>
                            {w.body}
                          </Body>
                        </Rise>
                      ))}
                    </div>
                  </>
                ) : null}
              </section>
            ) : null}

            {/* ----------------------------- who to call ----------------------------- */}
            {contacts.phone?.trim() || contacts.chatUrl?.trim() ? (
              <section id="frame-contacts" className="relative flex flex-col items-center text-center" style={{ padding: `${v(10)} ${v(26)} ${v(40)}` }}>
                <HeartLine style={{ width: "calc(100% + 2 * 6.667cqw)", marginLeft: v(-26), marginRight: v(-26) }} />
                <Rise style={{ marginTop: v(14) }}>
                  <Hand>With care for you</Hand>
                </Rise>
                <Rise style={{ marginTop: v(10) }}>
                  <Body>
                    If you have any questions about the wedding, {contacts.contactName?.trim() || "we"} will be happy to help.
                  </Body>
                </Rise>
                <Rise className="flex flex-col items-center" style={{ marginTop: v(16), gap: 12 }}>
                  {contacts.phone?.trim() ? (
                    <a href={`tel:${contacts.phone.replace(/[^\d+]/g, "")}`} style={outlined}>
                      <Icon name="phone" />
                      {contacts.phone.trim()}
                    </a>
                  ) : null}
                  {contacts.chatUrl?.trim() ? (
                    <a href={contacts.chatUrl.trim()} style={outlined}>
                      <Icon name="chat" />
                      Join our chat group
                    </a>
                  ) : null}
                </Rise>
              </section>
            ) : null}

            {/* ------------------------------- reply ------------------------------- */}
            {hidden.includes("rsvp") ? null : (
              <section id="frame-rsvp" className="relative flex flex-col items-center text-center" style={{ background: DARK, padding: `${v(70)} ${v(22)} ${v(80)}` }}>
                <Wave edge="top" />
                <Wave edge="bottom" />
                <Rise>
                  <Hand color={ON_DARK}>{rsvp?.heading?.trim() && rsvp.heading !== "RSVP" ? rsvp.heading : "Please complete the form"}</Hand>
                </Rise>
                <Rise style={{ marginTop: v(10) }}>
                  <Divider color={ON_DARK} width={190} />
                </Rise>
                {rsvp?.footer?.trim() ? (
                  <Rise style={{ marginTop: v(12) }}>
                    <Body color={ON_DARK}>{rsvp.footer}</Body>
                  </Rise>
                ) : null}
                <Rise className="w-full" style={{ marginTop: v(18), maxWidth: 440 }}>
                  {/* the form on a light card, so its labels and fields read clearly */}
                  <div className="flex justify-center" style={{ background: "#f8f4ee", padding: "24px 18px", borderRadius: 18, border: `1px solid rgba(239,230,218,0.5)` }}>
                    <ReplyForm content={content} live={live} />
                  </div>
                </Rise>
              </section>
            )}

            {/* ------------------------------ closing ------------------------------ */}
            <section className="relative flex flex-col items-center text-center" style={{ padding: `${v(20)} ${v(20)} ${v(30)}` }}>
              <HeartLine color={HEART} style={{ width: "calc(100% + 2 * 5.128cqw)", marginLeft: v(-20), marginRight: v(-20) }} />
              <Rise style={{ marginTop: v(18) }}>
                <Hand size={32}>We are waiting for you, dear ones!</Hand>
              </Rise>
              {hero?.closingLine?.trim() ? (
                <Rise style={{ marginTop: v(10) }}>
                  <Body color={SOFT}>{hero.closingLine}</Body>
                </Rise>
              ) : null}
              <Rise className="w-full" style={{ marginTop: v(22) }}>
                {ART.closing ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ART.closing} alt="" aria-hidden className="block w-full object-cover" style={{ aspectRatio: "4 / 3", borderRadius: `0 0 ${v(22)} ${v(22)}` }} />
                ) : (
                  <div aria-hidden className="w-full" style={{ aspectRatio: "4 / 3", borderRadius: `0 0 ${v(22)} ${v(22)}`, background: "radial-gradient(circle at 45% 40%, #f6e7cf, #b99c7c 60%, #5d4635)" }} />
                )}
              </Rise>
              <Rise style={{ marginTop: v(18) }}>
                <p style={{ fontFamily: SCRIPT, fontSize: v(34), lineHeight: 1.2, color: INK }}>
                  <Couple p1={p1} p2={p2} />
                </p>
              </Rise>
            </section>
          </main>

          {tour.running && !tour.paused ? (
            <motion.div
              key={tour.stop.n}
              aria-hidden
              className="pointer-events-none fixed left-0 top-0 z-[70] h-[3px]"
              style={{ background: HEART }}
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

