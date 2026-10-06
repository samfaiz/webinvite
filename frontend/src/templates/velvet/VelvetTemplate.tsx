"use client";

import { useEffect, useRef, useState } from "react";
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
import { ActionButton, Icon, Rise, useTicking } from "@/templates/garden/kit";
import { ReplyForm } from "@/templates/garden/reply";
import { useTour } from "@/templates/garden/tour";
import {
  ART,
  CAPS,
  CREAM,
  Divider,
  INK,
  INK_SOFT,
  Letter,
  LineArt,
  Medallion,
  OrnateFrame,
  PAPER,
  Picture,
  Polaroid,
  SCRIPT,
  SERIF,
  Seal,
  TornPaper,
  iconFor,
  paper,
  v,
  velvet,
} from "./parts";

/**
 * "Velvet Lily" — cream paper torn over burgundy velvet, burgundy ink lilies,
 * engraved frames and a wax seal.
 *
 * One long card: the names on the torn paper with a picture of the hall and
 * the countdown, two snapshots tucked at the tear; the venue as an old
 * engraving between baroque scrolls, sealed in wax; then the velvet: the
 * timeline in cream ovals, a bouquet in a frame, the reply card, and the
 * names again. No pictures of the couple anywhere.
 *
 * For every guest: large type and buttons, "Tap here to begin" plays the
 * music and walks them through, and the reply form is open on the page.
 */

const PALETTE = {
  // the shared pieces (buttons, the reply form) draw in these
  "--g-ink": INK,
  "--g-cream": "#f6efe6",
  "--g-soft": INK_SOFT,
  "--chrome-bg": INK,
  "--chrome-fg": "#f6efe6",
  "--chrome-ring": "rgba(246,239,230,0.55)",
} as CSSProperties;

/** The paper's left margin, where the velvet shows through the tear. */
const STRIP = 84;

/* -------------------------------- type -------------------------------- */

function Caps({ children, color = INK, size = 12, style }: { children: ReactNode; color?: string; size?: number; style?: CSSProperties }) {
  return (
    <p style={{ fontFamily: CAPS, fontSize: `max(12px, ${v(size)})`, letterSpacing: "0.28em", textTransform: "uppercase", color, ...style }}>{children}</p>
  );
}

function Serif({ children, color = INK, size = 16, italic = false, style }: { children: ReactNode; color?: string; size?: number; italic?: boolean; style?: CSSProperties }) {
  return (
    <p style={{ fontFamily: SERIF, fontWeight: 500, fontStyle: italic ? "italic" : undefined, fontSize: `max(16px, ${v(size)})`, lineHeight: 1.4, color, textWrap: "balance", ...style }}>
      {children}
    </p>
  );
}

function Script({ children, color = INK, size = 26, style }: { children: ReactNode; color?: string; size?: number; style?: CSSProperties }) {
  return <p style={{ fontFamily: SCRIPT, fontSize: v(size), lineHeight: 1.2, color, textWrap: "balance", ...style }}>{children}</p>;
}

const longDate = (iso?: string) => {
  const d = new Date(iso ?? "");
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};

/** Days : hours : minutes : seconds, in plain engraved figures. */
function Countdown({ target }: { target?: string }) {
  const left = useTicking(target);
  if (!left) return null;
  const parts: [number, string][] = [
    [left.days, "Days"],
    [left.hours, "Hours"],
    [left.minutes, "Minutes"],
    [left.seconds, "Seconds"],
  ];
  return (
    <div className="flex items-start justify-center" style={{ color: INK }}>
      {parts.map(([n, label], i) => (
        <div key={label} className="flex items-start">
          {i ? <span style={{ fontFamily: SERIF, fontSize: v(36), lineHeight: 1, padding: `0 ${v(5)}` }}>:</span> : null}
          <div className="flex flex-col items-center" style={{ minWidth: v(46) }}>
            <span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: v(40), lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{i ? String(n).padStart(2, "0") : n}</span>
            <span style={{ fontFamily: CAPS, fontSize: `max(10px, ${v(9)})`, letterSpacing: "0.12em", marginTop: v(6) }}>{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** The two velvet margins' fine lines, which run down the velvet pages like
 *  one long frame; `top` / `bottom` close it with a rule. */
function VelvetFrame({ top = false, bottom = false }: { top?: boolean; bottom?: boolean }) {
  const line = "1px solid rgba(241,230,220,0.38)";
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        left: v(14),
        right: v(14),
        top: top ? v(14) : 0,
        bottom: bottom ? v(14) : 0,
        borderLeft: line,
        borderRight: line,
        borderTop: top ? line : undefined,
        borderBottom: bottom ? line : undefined,
      }}
    />
  );
}

/* ----------------------------- the template ----------------------------- */

export function VelvetTemplate({
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
  const dress = content.dressCode;
  const wishes = content.wishes ?? [];
  const contacts = content.contacts ?? {};
  const cal = calendarEvent(content);
  const longNames = (p1?.length ?? 0) > 10 || (p2?.length ?? 0) > 10;

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

  const parents = (p?: typeof couple.partner1) =>
    !hidden.includes("families") && p && [p.father, p.mother].filter((x) => x?.trim()).length
      ? `${p.parentsPrefix?.trim() ? `${p.parentsPrefix} ` : ""}${[p.father, p.mother].filter((x) => x?.trim()).join(" & ")}`
      : "";

  const nameStyle: CSSProperties = { fontFamily: CAPS, fontWeight: 600, fontSize: v(longNames ? 28 : 34), lineHeight: 1.1, letterSpacing: "0.03em", color: INK };

  return (
    <PreviewContext.Provider value={{ compact, editing }}>
      <ThemeProvider theme={theme} className={`relative overflow-x-hidden ${snap ? "h-svh overflow-y-auto" : "min-h-screen"}`}>
        <div style={{ ...PALETTE, background: "#1f070c" }} className="flex min-h-full justify-center">
          <StyleOverrides content={content} />
          <TextOffsets offsets={content.offsets} />

          <main ref={main} className="relative" style={{ width: compact ? "100%" : "min(100%, 480px)", containerType: "inline-size", ...velvet }}>
            {/* ------------------------------ cover ------------------------------ */}
            <section id="frame-couple" className="relative overflow-hidden" style={velvet}>
              <Letter style={{ left: v(-30), top: v(10), width: v(220), height: "70%" }} />
              <TornPaper strip={STRIP} seed={5} />
              <LineArt src={ART.lilyCorner} style={{ right: 0, top: 0, width: v(150) }} />
              <LineArt src={ART.lilyStem} style={{ left: v(40), top: "38%", height: v(250), opacity: 0.85 }} />
              <Polaroid src={ART.polaroids[0]} turn={-9} style={{ left: v(-8), bottom: v(150) }} />
              <Polaroid src={ART.polaroids[1]} turn={6} style={{ left: v(14), bottom: v(52) }} />

              {guided && !begun ? (
                <div className="absolute inset-x-0 z-[3] flex justify-center" style={{ top: v(20), paddingLeft: v(STRIP - 20) }}>
                  <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>
                    <ActionButton icon="hand" onClick={() => begin(true)}>
                      Tap here to begin
                    </ActionButton>
                  </motion.div>
                </div>
              ) : null}

              <div className="relative z-[2] flex flex-col items-center text-center" style={{ padding: `${v(96)} ${v(20)} ${v(64)} ${v(STRIP + 4)}` }}>
                <Rise>
                  <Serif size={16} italic>
                    The wedding of
                  </Serif>
                </Rise>
                <Rise delay={0.1} className="flex flex-col items-center" style={{ marginTop: v(10) }}>
                  <p style={nameStyle}>{p1}</p>
                  {parents(couple.partner1) ? (
                    <Serif size={13} italic color={INK_SOFT} style={{ marginTop: v(2) }}>
                      {parents(couple.partner1)}
                    </Serif>
                  ) : null}
                  <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: v(28), lineHeight: 1.1, color: INK, margin: `${v(4)} 0` }}>&amp;</p>
                  <p style={nameStyle}>{p2}</p>
                  {parents(couple.partner2) ? (
                    <Serif size={13} italic color={INK_SOFT} style={{ marginTop: v(2) }}>
                      {parents(couple.partner2)}
                    </Serif>
                  ) : null}
                </Rise>
                <Rise delay={0.2} className="flex flex-col items-center" style={{ marginTop: v(12), gap: v(10) }}>
                  <Caps size={10} style={{ letterSpacing: "0.34em" }}>
                    {hero?.tagline?.trim() || "Forever & Always"}
                  </Caps>
                  <Divider />
                </Rise>

                <Rise style={{ marginTop: v(22), width: v(176) }}>
                  <OrnateFrame>
                    <Picture src={ART.hall} ratio="1 / 1" />
                  </OrnateFrame>
                </Rise>

                <Rise style={{ marginTop: v(24) }}>
                  <Caps size={11}>{hero?.marriageText?.trim() || "We are getting married"}</Caps>
                  {longDate(countdown?.targetDate) ? (
                    <Serif size={19} style={{ marginTop: v(8), fontWeight: 600 }}>
                      {longDate(countdown?.targetDate)}
                    </Serif>
                  ) : null}
                  {firstEv?.time ? (
                    <Serif size={16} italic>
                      at {firstEv.time}
                    </Serif>
                  ) : null}
                </Rise>
                <Rise style={{ marginTop: v(16) }}>
                  <Countdown target={countdown?.targetDate} />
                </Rise>
                <Rise className="flex flex-col items-center" style={{ marginTop: v(18), gap: v(12) }}>
                  <Serif size={15} italic color={INK_SOFT}>
                    Two hearts, one promise,
                    <br />a lifetime together
                  </Serif>
                  <Divider width={90} />
                  <Script size={25}>You are a special part of our day</Script>
                </Rise>
                {cal ? (
                  <Rise style={{ marginTop: v(20) }}>
                    <ActionButton icon="calendar" onClick={() => downloadIcs(cal, "invitation.ics")}>
                      Add to my calendar
                    </ActionButton>
                  </Rise>
                ) : null}
              </div>
            </section>

            {/* ------------------------------ venue ------------------------------ */}
            <section
              id="frame-venue"
              className="relative flex flex-col items-center text-center"
              style={{
                ...paper,
                backgroundImage: `${paper.backgroundImage}, linear-gradient(to bottom, ${PAPER}, #ead6cf 30%, #ead8d0 60%, ${PAPER})`,
                padding: `${v(30)} ${v(24)} ${v(96)}`,
              }}
            >
              <Rise>
                <Caps size={13}>The wedding venue</Caps>
              </Rise>
              {firstEv?.venue?.trim() ? (
                <Rise style={{ marginTop: v(10) }}>
                  <Serif size={24} style={{ fontWeight: 600, lineHeight: 1.2 }}>
                    {firstEv.venue}
                  </Serif>
                </Rise>
              ) : null}
              {firstEv?.address?.trim() ? (
                <Rise style={{ marginTop: v(4) }}>
                  <Serif size={16} italic color={INK_SOFT}>
                    {firstEv.address}
                  </Serif>
                </Rise>
              ) : null}
              <Rise className="relative w-full" style={{ marginTop: v(18) }}>
                {content.venuePhoto ? (
                  <OrnateFrame style={{ width: "86%", margin: "0 auto" }}>
                    <Picture src={content.venuePhoto} ratio="4 / 3" />
                  </OrnateFrame>
                ) : ART.palace ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ART.palace} alt="" aria-hidden className="mx-auto block" style={{ width: "92%", mixBlendMode: "multiply" }} />
                ) : (
                  <div aria-hidden style={{ height: v(190) }} />
                )}
              </Rise>
              <div className="relative w-full" style={{ marginTop: v(6), minHeight: v(130) }}>
                {ART.scroll ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ART.scroll} alt="" aria-hidden className="pointer-events-none absolute" style={{ left: v(-24), bottom: v(-96), width: v(150), mixBlendMode: "multiply" }} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ART.scroll}
                      alt=""
                      aria-hidden
                      className="pointer-events-none absolute"
                      style={{ right: v(-24), bottom: v(-96), width: v(150), transform: "scaleX(-1)", mixBlendMode: "multiply" }}
                    />
                  </>
                ) : null}
                {hasMapTarget(target) ? (
                  <Rise className="relative z-[2] flex justify-center" style={{ paddingTop: v(18) }}>
                    <DirectionsLink
                      target={target}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                        minHeight: 56,
                        padding: `0 ${v(22)}`,
                        borderRadius: 999,
                        border: `1px solid rgba(90,26,36,0.45)`,
                        background: "rgba(246,239,230,0.75)",
                        color: INK,
                        fontFamily: SCRIPT,
                        fontSize: `max(24px, ${v(26)})`,
                      }}
                    >
                      <Icon name="pin" />
                      {map?.directionsLabel?.trim() || "Get Directions"}
                    </DirectionsLink>
                  </Rise>
                ) : null}
              </div>
              <Seal style={{ left: "50%", bottom: v(-32), marginLeft: v(-32), zIndex: 3 }} />
            </section>

            {/* ----------------------------- timeline ----------------------------- */}
            {hidden.includes("schedule") || !events.length ? null : (
              <section id="frame-schedule" className="relative overflow-hidden" style={{ ...velvet, padding: `${v(56)} ${v(34)} ${v(40)}` }}>
                <VelvetFrame top />
                <LineArt src={ART.lilyStem} onVelvet style={{ right: v(-30), top: v(40), height: "80%" }} />
                <Rise className="flex items-center justify-center" style={{ gap: v(12) }}>
                  <span aria-hidden style={{ color: CREAM, fontSize: v(8) }}>●</span>
                  <Caps color={CREAM} size={13} style={{ letterSpacing: "0.32em" }}>
                    Wedding timeline
                  </Caps>
                  <span aria-hidden style={{ color: CREAM, fontSize: v(8) }}>●</span>
                </Rise>
                <div className="relative" style={{ marginTop: v(30) }}>
                  {/* the rail the stops hang on, when there's more than one */}
                  {events.length > 1 ? (
                    <div aria-hidden className="absolute" style={{ left: v(14), top: v(40), bottom: v(40), width: 1, background: "rgba(241,230,220,0.5)" }} />
                  ) : null}
                  <div className="flex flex-col" style={{ gap: v(22) }}>
                    {events.map((ev, i) => (
                      <Rise
                        key={ev.id}
                        delay={0.06 * i}
                        className={`relative flex items-center ${events.length > 1 ? "" : "justify-center"}`}
                        style={{ gap: v(16), paddingLeft: events.length > 1 ? v(36) : 0 }}
                      >
                        {events.length > 1 ? (
                          <span aria-hidden className="absolute rounded-full" style={{ left: v(10.5), width: v(8), height: v(8), background: CREAM }} />
                        ) : null}
                        <Medallion icon={iconFor(ev.name, i)} />
                        <div className="min-w-0 text-left">
                          {ev.time ? (
                            <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: `max(15px, ${v(16)})`, color: CREAM, opacity: 0.85 }}>{ev.time}</p>
                          ) : null}
                          <p style={{ fontFamily: SCRIPT, fontSize: v(28), lineHeight: 1.15, color: CREAM }}>{ev.name}</p>
                          {ev.venue?.trim() ? (
                            <p style={{ fontFamily: SERIF, fontSize: `max(14px, ${v(14)})`, lineHeight: 1.3, color: CREAM, opacity: 0.7 }}>{ev.venue}</p>
                          ) : null}
                        </div>
                      </Rise>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* ------------------------- bouquet, dress, wishes ------------------------- */}
            <section id="frame-details" className="relative flex flex-col items-center text-center" style={{ ...velvet, padding: `${v(20)} ${v(40)} ${v(30)}` }}>
              <VelvetFrame />
              <Rise style={{ width: "100%" }}>
                <OrnateFrame color="rgba(241,230,220,0.8)">
                  <Picture src={ART.bouquet} ratio="4 / 3" tone="wine" />
                </OrnateFrame>
              </Rise>
              {!hidden.includes("dresscode") && hasDressCode(content) ? (
                <Rise className="flex flex-col items-center" style={{ marginTop: v(34) }}>
                  <Caps color={CREAM} size={13}>
                    {dress?.heading?.trim() || "Dress code"}
                  </Caps>
                  {dress?.note?.trim() ? (
                    <Serif color={CREAM} size={16} style={{ marginTop: v(10), opacity: 0.85 }}>
                      {dress.note}
                    </Serif>
                  ) : null}
                  {dress?.swatches?.length ? (
                    <div className="flex justify-center" style={{ marginTop: v(14), gap: v(8) }}>
                      {dress.swatches.slice(0, 6).map((s, i) => (
                        <span
                          key={`${s.hex}-${i}`}
                          title={s.label}
                          className="block rounded-full"
                          style={{ width: v(40), height: v(40), background: s.hex, boxShadow: "0 0 0 2px #3a0d16, 0 0 0 3px rgba(241,230,220,0.6)" }}
                        />
                      ))}
                    </div>
                  ) : null}
                  {dress?.avoid?.trim() ? (
                    <Serif color={CREAM} size={15} italic style={{ marginTop: v(10), opacity: 0.8 }}>
                      Kindly avoid {dress.avoid}
                    </Serif>
                  ) : null}
                </Rise>
              ) : null}
              {wishes.slice(0, 4).map((w, i) => (
                <Rise key={i} className="flex flex-col items-center" style={{ marginTop: v(i ? 18 : 32) }}>
                  {i === 0 ? <Divider color={CREAM} width={90} /> : null}
                  {w.title?.trim() ? (
                    <Caps color={CREAM} size={12} style={{ marginTop: i ? 0 : v(14) }}>
                      {w.title}
                    </Caps>
                  ) : null}
                  <Serif color={CREAM} size={16} style={{ marginTop: v(6), opacity: 0.88 }}>
                    {w.body}
                  </Serif>
                </Rise>
              ))}
            </section>

            {/* ------------------------------- reply ------------------------------- */}
            {hidden.includes("rsvp") ? null : (
              <section id="frame-rsvp" className="relative flex flex-col items-center text-center" style={{ ...velvet, padding: `${v(20)} ${v(30)} ${v(24)}` }}>
                <VelvetFrame />
                <Rise className="flex flex-col items-center">
                  <Script color={CREAM} size={32}>
                    {rsvp?.heading?.trim() && rsvp.heading !== "RSVP" ? rsvp.heading : "You are warmly invited"}
                  </Script>
                  <span aria-hidden style={{ color: "#e7c3c0", fontSize: v(14), marginTop: v(6) }}>
                    ♥
                  </span>
                </Rise>
                <Rise className="w-full" style={{ marginTop: v(16), maxWidth: 440 }}>
                  <OrnateFrame corner={30} pad={14} style={{ ...paper }}>
                    <Caps size={15} style={{ letterSpacing: "0.16em", textAlign: "center", marginBottom: v(4) }}>
                      You&rsquo;re invited
                    </Caps>
                    <div className="flex justify-center">
                      <ReplyForm content={content} live={live} />
                    </div>
                  </OrnateFrame>
                </Rise>
                <Rise style={{ marginTop: v(16) }}>
                  <Serif color={CREAM} size={15} italic style={{ opacity: 0.85 }}>
                    {rsvp?.footer?.trim() || "We can't wait to celebrate with you."}
                  </Serif>
                </Rise>
                {contacts.phone?.trim() || contacts.chatUrl?.trim() ? (
                  <Rise className="flex w-full flex-col items-center" style={{ marginTop: v(20), gap: 12, maxWidth: 420 }}>
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
            <section className="relative flex flex-col items-center overflow-hidden text-center" style={{ ...velvet, padding: `${v(24)} ${v(30)} ${v(64)}` }}>
              <VelvetFrame bottom />
              <Rise className="flex flex-col items-center" style={{ gap: v(12) }}>
                <Divider color={CREAM} width={110} />
                <p style={{ fontFamily: CAPS, fontWeight: 600, fontSize: v(24), letterSpacing: "0.06em", color: CREAM }}>
                  {[p1, p2].filter(Boolean).join(" & ")}
                </p>
                <Serif color={CREAM} size={15} italic style={{ opacity: 0.85 }}>
                  {hero?.closingLine?.trim() || "Thank you for being a part of our special day."}
                </Serif>
              </Rise>
            </section>
          </main>

          {tour.running && !tour.paused ? (
            <motion.div
              key={tour.stop.n}
              aria-hidden
              className="pointer-events-none fixed left-0 top-0 z-[70] h-[3px]"
              style={{ background: "#e7c3c0" }}
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
