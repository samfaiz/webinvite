"use client";

import { useRef, useState } from "react";
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
import { keepTitles } from "@/lib/titles";
import { ActionButton, Icon, Rise, useTicking } from "@/templates/garden/kit";
import { ReplyForm } from "@/templates/garden/reply";
import { useTour } from "@/templates/garden/tour";
import { ART as SKETCH } from "@/templates/heartline/parts";
import { useAutoBegin, useFirstTapMusic } from "@/templates/garden/autostart";
import {
  ART,
  CAPS,
  CREAM,
  Divider,
  INK,
  INK_SOFT,
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

/** Writing that runs up the velvet margin beside the torn paper, like the
 *  spine of a printed card: the names on the first page, the date on the
 *  second. */
function Spine({ children, top = "6%", bottom = "6%" }: { children: ReactNode; top?: string; bottom?: string }) {
  return (
    <div className="pointer-events-none absolute left-0 z-[1] flex items-center justify-center" style={{ top, bottom, width: v(STRIP * 0.62) }}>
      <span
        style={{
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          whiteSpace: "nowrap",
          fontFamily: CAPS,
          fontWeight: 600,
          fontSize: v(19),
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: CREAM,
          opacity: 0.92,
        }}
      >
        {children}
      </span>
    </div>
  );
}

/** A faint glow of paper behind writing laid over a photograph. */
const PAPER_GLOW = "0 0 6px rgba(237,227,213,0.95), 0 0 14px rgba(237,227,213,0.85)";

/** The timeline's ovals, in design pixels across. */
const TL_OVAL = 78;

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

const dotDate = (iso?: string) => {
  const d = new Date(iso ?? "");
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())} · ${p(d.getMonth() + 1)} · ${d.getFullYear()}`;
};

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

  /* Touching the seal plays the music and the card walks itself through,
     page by page to the end (useTour). If nobody taps, it begins by itself
     after seven seconds, and the music starts with their first tap anywhere. */
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
  useAutoBegin(begun, begin, 7000);
  useFirstTapMusic();

  const parents = (p?: typeof couple.partner1) =>
    !hidden.includes("families") && p && [p.father, p.mother].filter((x) => x?.trim()).length
      ? keepTitles(`${p.parentsPrefix?.trim() ? `${p.parentsPrefix} ` : ""}${[p.father, p.mother].filter((x) => x?.trim()).join(" & ")}`)
      : "";

  const nameStyle: CSSProperties = { fontFamily: CAPS, fontWeight: 600, fontSize: v(longNames ? 30 : 36), lineHeight: 1.1, letterSpacing: "0.03em", color: INK };
  // the parents in brackets, upright and plain, a little larger and darker
  const parentStyle: CSSProperties = { fontFamily: SERIF, fontWeight: 600, fontSize: `max(15px, ${v(16)})`, lineHeight: 1.35, color: INK, opacity: 0.88, marginTop: v(6), textWrap: "balance" };

  // each page at least a screen tall, its contents in the middle: the card
  // reads, and plays, one page at a time (not in the Studio's small preview)
  const pageH = compact ? undefined : "100svh";
  const manyVenues = new Set(events.map((e) => e.venue?.trim()).filter(Boolean)).size > 1;
  // the couple's own words for the bouquet page, when there's nothing else on it
  const storyHeading = hidden.includes("story") ? "" : content.story?.heading?.trim() ?? "";
  const storyLine = hidden.includes("story") ? "" : content.story?.subtext?.trim() ?? "";

  // a photograph of the couple only if they've added one themselves
  const couplePhoto = hidden.includes("story") ? undefined : (content.story?.items ?? []).find((s) => s.photo)?.photo;
  const watermark = couplePhoto || ART.hall;

  // the venue as a pen sketch that suits it: a church, a hall, else the palace
  const venueName = `${firstEv?.venue ?? ""} ${content.venueArt ?? ""}`;
  const venueSketch = /church|chapel|cathedral|basilica|forane|parish/i.test(venueName)
    ? SKETCH.venues.church
    : /hall|cent(re|er)|convention|auditorium|banquet|arena|club|hotel|resort/i.test(venueName)
      ? SKETCH.venues.hall
      : ART.palace;

  return (
    <PreviewContext.Provider value={{ compact, editing }}>
      <ThemeProvider theme={theme} className={`relative overflow-x-hidden ${snap ? "h-svh overflow-y-auto" : "min-h-screen"}`}>
        <div style={{ ...PALETTE, background: "#1f070c" }} className="flex min-h-full justify-center">
          <StyleOverrides content={content} />
          <TextOffsets offsets={content.offsets} />

          <main ref={main} className="relative" style={{ width: compact ? "100%" : "min(100%, 480px)", containerType: "inline-size", ...velvet }}>
            {/* ------------------------------ page 1: the names ------------------------------ */}
            {/* the paper's torn edge runs on down page 2, and sweeps out at its foot */}
            <section id="frame-couple" className="relative flex flex-col justify-center overflow-hidden" style={{ ...velvet, minHeight: pageH }}>
              <TornPaper strip={STRIP} seed={5} page={0} pages={2} sweep={false} />
              <Spine>
                {[p1, p2].filter(Boolean).map((n) => keepTitles(n!)).join("  ✦  ")}
              </Spine>
              <LineArt src={ART.lilyCorner} style={{ right: 0, top: 0, width: v(150) }} />
              <LineArt src={ART.lilyStem} style={{ left: v(40), bottom: v(10), height: v(240), opacity: 0.85 }} />
              {/* a photograph laid faintly into the paper behind the names, like a
                  watermark: theirs if they've added one, else the hall */}
              {watermark ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute"
                  style={{
                    left: v(STRIP + 2),
                    right: 0,
                    top: "22%",
                    bottom: "6%",
                    backgroundImage: `url("${watermark}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "50% 30%",
                    opacity: couplePhoto ? 0.24 : 0.2,
                    filter: "grayscale(1) sepia(0.55) contrast(1.05)",
                    mixBlendMode: "multiply",
                    maskImage: "radial-gradient(ellipse 62% 58% at 50% 50%, #000 30%, transparent 100%)",
                    WebkitMaskImage: "radial-gradient(ellipse 62% 58% at 50% 50%, #000 30%, transparent 100%)",
                  }}
                />
              ) : null}

              <div className="relative z-[2] flex flex-col items-center text-center" style={{ padding: `${v(26)} ${v(20)} ${v(60)} ${v(STRIP + 4)}`, textShadow: watermark ? PAPER_GLOW : undefined }}>
                {/* the wax seal and "Wedding Invitation": tapping the seal opens
                    the card with music (it opens by itself in a few seconds too) */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    aria-label="Open the invitation"
                    onClick={() => begin(true)}
                    disabled={!guided || begun}
                    className="relative flex items-center justify-center rounded-full"
                    style={{ width: v(78), height: v(78), cursor: guided && !begun ? "pointer" : "default" }}
                  >
                    {guided && !begun ? (
                      <motion.span
                        aria-hidden
                        className="absolute inset-0 rounded-full"
                        style={{ boxShadow: `0 0 0 2px ${INK}` }}
                        animate={{ scale: [1, 1.35], opacity: [0.55, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                      />
                    ) : null}
                    <motion.span
                      className="block h-full w-full"
                      animate={guided && !begun ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                      transition={{ duration: 1.8, repeat: guided && !begun ? Infinity : 0, ease: "easeInOut" }}
                      // touched: a little press, and the card opens
                      whileTap={{ scale: 0.9 }}
                    >
                      {ART.seal ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ART.seal} alt="" className="block h-full w-full" />
                      ) : (
                        <span className="block h-full w-full rounded-full" style={{ background: "radial-gradient(circle at 38% 32%, #9a3344, #6b1a28 55%, #4a0f1b)" }} />
                      )}
                    </motion.span>
                  </button>
                  <Caps size={15} style={{ marginTop: v(12), letterSpacing: "0.3em", fontWeight: 600 }}>
                    Wedding Invitation
                  </Caps>
                  <div style={{ marginTop: v(8) }}>
                    <Divider width={150} />
                  </div>
                  <AnimatePresence>
                    {guided && !begun ? (
                      <motion.div exit={{ opacity: 0, height: 0 }} className="flex flex-col items-center" style={{ marginTop: v(10), gap: v(2) }}>
                        <motion.span
                          aria-hidden
                          style={{ color: INK, display: "inline-flex" }}
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <Icon name="hand" size={24} />
                        </motion.span>
                        <button
                          type="button"
                          onClick={() => begin(true)}
                          style={{ fontFamily: SERIF, fontWeight: 600, fontSize: `max(17px, ${v(17)})`, color: INK, minHeight: 44 }}
                        >
                          Tap the seal to open
                        </button>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                <Rise style={{ marginTop: v(30) }}>
                  <Serif size={17} italic>
                    The wedding of
                  </Serif>
                </Rise>
                <Rise delay={0.1} className="flex flex-col items-center" style={{ marginTop: v(10) }}>
                  <p style={nameStyle}>{keepTitles(p1 ?? "")}</p>
                  {parents(couple.partner1) ? <p style={parentStyle}>({parents(couple.partner1)})</p> : null}
                  <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: v(30), lineHeight: 1.1, color: INK, margin: `${v(8)} 0 ${v(4)}` }}>&amp;</p>
                  <p style={nameStyle}>{keepTitles(p2 ?? "")}</p>
                  {parents(couple.partner2) ? <p style={parentStyle}>({parents(couple.partner2)})</p> : null}
                </Rise>
                <Rise delay={0.2} className="flex flex-col items-center" style={{ marginTop: v(18), gap: v(10) }}>
                  {/* the line under the names: "Forever & Always" until the couple
                      write their own; one they've cleared stays empty */}
                  {hero?.tagline === undefined || hero.tagline === null ? (
                    <Caps size={11} style={{ letterSpacing: "0.34em" }}>
                      Forever &amp; Always
                    </Caps>
                  ) : hero.tagline.trim() ? (
                    <Caps size={11} style={{ letterSpacing: "0.34em" }}>
                      {hero.tagline.trim()}
                    </Caps>
                  ) : null}
                  <Divider />
                </Rise>
              </div>
            </section>

            {/* ------------------------------ page 2: the day ------------------------------ */}
            <section id="frame-date" className="relative flex flex-col justify-center overflow-hidden" style={{ ...velvet, minHeight: pageH }}>
              <TornPaper strip={STRIP} seed={5} page={1} pages={2} />
              {dotDate(countdown?.targetDate) ? (
                <Spine top="4%" bottom="46%">
                  {dotDate(countdown?.targetDate)}
                </Spine>
              ) : null}
              <LineArt src={ART.lilyStem} style={{ left: v(40), top: v(-10), height: v(200), opacity: 0.85 }} />
              <Polaroid src={ART.polaroids[0]} turn={-9} style={{ left: v(-8), bottom: v(170) }} />
              <Polaroid src={ART.polaroids[1]} turn={6} style={{ left: v(14), bottom: v(72) }} />

              <div className="relative z-[2] flex flex-col items-center text-center" style={{ padding: `${v(40)} ${v(20)} ${v(90)} ${v(STRIP + 4)}` }}>
                <Rise>
                  <Caps size={13} style={{ fontWeight: 600 }}>
                    {hero?.marriageText?.trim() || "We are getting married"}
                  </Caps>
                  {longDate(countdown?.targetDate) ? (
                    <Serif size={22} style={{ marginTop: v(12), fontWeight: 600 }}>
                      {longDate(countdown?.targetDate)}
                    </Serif>
                  ) : null}
                  {firstEv?.time ? (
                    <Serif size={19} italic style={{ marginTop: v(2) }}>
                      at {firstEv.time}
                    </Serif>
                  ) : null}
                </Rise>
                <Rise style={{ marginTop: v(26) }}>
                  <Countdown target={countdown?.targetDate} />
                </Rise>
                <Rise className="flex flex-col items-center" style={{ marginTop: v(26), gap: v(14) }}>
                  <Serif size={17} italic color={INK_SOFT}>
                    Two hearts, one promise,
                    <br />a lifetime together
                  </Serif>
                  <Divider width={90} />
                  <Script size={27}>You are a special part of our day</Script>
                </Rise>
                {cal ? (
                  <Rise style={{ marginTop: v(24) }}>
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
              className="relative flex flex-col items-center justify-center text-center"
              style={{
                ...paper,
                backgroundImage: `${paper.backgroundImage}, linear-gradient(to bottom, ${PAPER}, #ead6cf 30%, #ead8d0 60%, ${PAPER})`,
                padding: `${v(30)} ${v(24)} ${v(96)}`,
                minHeight: pageH,
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
                ) : venueSketch ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={venueSketch} alt="" aria-hidden className="mx-auto block" style={{ width: "92%", mixBlendMode: "multiply" }} />
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
            {/* the ovals sit on one line down the page, spread over the whole
                screen, each stop's time and name beside its oval */}
            {hidden.includes("schedule") || !events.length ? null : (
              <section id="frame-schedule" className="relative flex flex-col overflow-hidden" style={{ ...velvet, padding: `${v(64)} ${v(30)} ${v(48)}`, minHeight: pageH }}>
                <VelvetFrame top />
                <LineArt src={ART.lilyStem} onVelvet style={{ right: v(-30), top: v(40), height: "80%" }} />
                <Rise className="flex flex-col items-center" style={{ gap: v(10) }}>
                  <div className="flex items-center justify-center" style={{ gap: v(12) }}>
                    <span aria-hidden style={{ color: CREAM, fontSize: v(8) }}>●</span>
                    <Caps color={CREAM} size={15} style={{ letterSpacing: "0.32em", fontWeight: 600 }}>
                      Wedding timeline
                    </Caps>
                    <span aria-hidden style={{ color: CREAM, fontSize: v(8) }}>●</span>
                  </div>
                  <Divider color={CREAM} width={110} />
                </Rise>
                <div className="relative flex flex-1 flex-col justify-evenly" style={{ marginTop: v(18), minHeight: v(Math.min(events.length, 6) * 132) }}>
                  {/* the line the ovals hang on, fading out at both ends */}
                  {events.length > 1 ? (
                    <div
                      aria-hidden
                      className="absolute"
                      style={{
                        left: `calc(${v(TL_OVAL / 2)} - 0.5px)`,
                        top: "4%",
                        bottom: "4%",
                        width: 1,
                        background: "linear-gradient(rgba(241,230,220,0), rgba(241,230,220,0.6) 12%, rgba(241,230,220,0.6) 88%, rgba(241,230,220,0))",
                      }}
                    />
                  ) : null}
                  {events.map((ev, i) => (
                    <Rise key={ev.id} delay={0.08 * i} className="relative flex items-center" style={{ gap: v(22) }}>
                      <Medallion icon={iconFor(ev.name, i, events.map((e) => e.name))} size={TL_OVAL} />
                      <div className="min-w-0 flex-1 text-left">
                        {/* the time first and strongest: upright, bold, full cream */}
                        {ev.time ? (
                          <p style={{ fontFamily: SERIF, fontWeight: 700, fontSize: `max(20px, ${v(23)})`, lineHeight: 1.15, letterSpacing: "0.04em", color: "#fff7ef" }}>{ev.time}</p>
                        ) : null}
                        <p style={{ fontFamily: SCRIPT, fontSize: v(33), lineHeight: 1.12, color: CREAM, marginTop: v(2), textWrap: "balance" }}>{ev.name}</p>
                        {manyVenues && ev.venue?.trim() ? (
                          <p style={{ fontFamily: SERIF, fontSize: `max(15px, ${v(15)})`, lineHeight: 1.3, color: CREAM, opacity: 0.85, marginTop: v(4) }}>{ev.venue}</p>
                        ) : null}
                      </div>
                    </Rise>
                  ))}
                </div>
                {/* all in one place: say where once, at the foot */}
                {!manyVenues && firstEv?.venue?.trim() ? (
                  <Rise className="flex flex-col items-center text-center" style={{ marginTop: v(18), gap: v(8) }}>
                    <Divider color={CREAM} width={90} />
                    <Serif color={CREAM} size={16} italic style={{ opacity: 0.9 }}>
                      All at {firstEv.venue.trim()}
                    </Serif>
                  </Rise>
                ) : null}
              </section>
            )}

            {/* ------------------------- bouquet, dress, wishes ------------------------- */}
            <section id="frame-details" className="relative flex flex-col items-center justify-center overflow-hidden text-center" style={{ ...velvet, padding: `${v(30)} ${v(40)} ${v(36)}`, minHeight: pageH }}>
              <VelvetFrame />
              {/* faint lilies in two corners, so the velvet isn't bare */}
              <LineArt src={ART.lilyCorner} onVelvet style={{ right: 0, top: 0, width: v(150) }} />
              <LineArt src={ART.lilyCorner} onVelvet style={{ left: 0, bottom: 0, width: v(150), transform: "rotate(180deg)" }} />
              {/* two photographs laid like keepsakes: the bouquet, and the
                  candlelit hall tucked over its corner */}
              <Rise className="relative w-full" style={{ marginBottom: ART.hall ? v(58) : 0 }}>
                <div style={{ width: ART.hall ? "88%" : "100%", transform: ART.hall ? "rotate(-2.5deg)" : undefined, boxShadow: "0 10px 26px rgba(10,0,3,0.5)" }}>
                  <OrnateFrame color="rgba(241,230,220,0.8)" style={{ background: "#2a0a10" }}>
                    <Picture src={ART.bouquet} ratio="4 / 3" tone="wine" />
                  </OrnateFrame>
                </div>
                {ART.hall ? (
                  <div className="absolute" style={{ right: v(-14), bottom: v(-66), width: "48%", transform: "rotate(4deg)", boxShadow: "0 10px 26px rgba(10,0,3,0.55)" }}>
                    <OrnateFrame color="rgba(241,230,220,0.8)" corner={20} pad={6} style={{ background: "#2a0a10" }}>
                      <Picture src={ART.hall} ratio="1 / 1" />
                    </OrnateFrame>
                  </div>
                ) : null}
              </Rise>
              {storyHeading || storyLine ? (
                <Rise className="flex flex-col items-center" style={{ marginTop: v(30), gap: v(10) }}>
                  {storyHeading && !/^our story$/i.test(storyHeading) ? (
                    <Caps color={CREAM} size={14} style={{ letterSpacing: "0.3em", fontWeight: 600 }}>
                      {storyHeading}
                    </Caps>
                  ) : null}
                  {storyLine ? <Script color={CREAM} size={28}>{storyLine}</Script> : null}
                </Rise>
              ) : null}
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
              <section id="frame-rsvp" className="relative flex flex-col items-center justify-center text-center" style={{ ...velvet, padding: `${v(20)} ${v(30)} ${v(24)}`, minHeight: pageH }}>
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
                  <OrnateFrame round pad={20} style={{ ...paper }}>
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
            <section className="relative flex flex-col items-center justify-center overflow-hidden text-center" style={{ ...velvet, padding: `${v(24)} ${v(30)} ${v(64)}`, minHeight: pageH }}>
              <VelvetFrame bottom />
              <LineArt src={ART.lilyCorner} onVelvet style={{ right: 0, top: 0, width: v(170) }} />
              <Rise className="flex flex-col items-center" style={{ gap: v(12) }}>
                {ART.seal ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ART.seal} alt="" aria-hidden style={{ width: v(64), height: v(64), marginBottom: v(6) }} />
                ) : null}
                <Divider color={CREAM} width={110} />
                <p style={{ fontFamily: CAPS, fontWeight: 600, fontSize: v(24), letterSpacing: "0.06em", color: CREAM, textWrap: "balance" }}>
                  {[p1, p2].filter(Boolean).map((n) => keepTitles(n!)).join(" & ")}
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
