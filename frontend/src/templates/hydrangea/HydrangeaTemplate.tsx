"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { InvitationContent, MotifPack, RenderProps } from "@/engine/types";
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
import { initialOf } from "@/lib/initials";
import { ActionButton, CountdownTiles, Icon, PenReveal, PhotoOval, PhotoViewer, Rise, SCRIPT, SERIF, actionStyle } from "@/templates/garden/kit";
import { ReplyForm } from "@/templates/garden/reply";
import { useTour } from "@/templates/garden/tour";
import { useAutoBegin, useFirstTapMusic } from "@/templates/garden/autostart";
import { BLUE, BLUSH, Flower, FlowerBand, OrnateFrame, Swatches, WeekStrip, laceStyle, v } from "./parts";

/**
 * "Blue Hydrangea" — dusty blue and blush, blue flowers, a carved oval frame.
 *
 * One long card rather than a stack of plates: blue and blush grounds, a blush
 * pill on the cover with the monogram and the framed photo, a blue circle for
 * the date with the week underneath, a blue pill on lace for the programme,
 * and rows of flowers laid across every change of ground. All of it is drawn
 * here except the flowers, the frame and the lace, which are generated art
 * (see `ART` in parts.tsx; drawn stand-ins until they're in).
 *
 * Built for every guest: large type, plain words on large buttons, the reply
 * form on the page, and a "Tap here to begin" that plays the music and walks
 * them through the invitation on its own.
 */

const PALETTE = {
  "--h-blue": BLUE,
  "--h-blush": BLUSH,
  // the shared Garden pieces (buttons, the reply form, the photo viewer) draw
  // in these three, so the same parts dress in this design's colours
  "--g-ink": BLUE,
  "--g-cream": BLUSH,
  "--g-soft": "#4f668f",
  "--chrome-bg": BLUE,
  "--chrome-fg": BLUSH,
  "--chrome-ring": "rgba(253,238,244,0.6)",
} as CSSProperties;

const SOFT = "#4f668f";

/* -------------------------------- type -------------------------------- */

function H({ children, color = BLUE, size = 44 }: { children: ReactNode; color?: string; size?: number }) {
  return <p style={{ fontFamily: SCRIPT, fontSize: v(size), lineHeight: 1.15, color }}>{children}</p>;
}

function P({ children, color = SOFT, className = "", style }: { children: ReactNode; color?: string; className?: string; style?: CSSProperties }) {
  return (
    <p
      className={className}
      style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, fontSize: `max(17px, ${v(18)})`, lineHeight: 1.5, color, ...style }}
    >
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

/* ------------------------- inside the frame ------------------------- */

/** For couples who'd rather not show photos: a small posy of the blue
 *  flowers on a soft blush-to-blue ground, swaying very gently. */
function FrameFlowers() {
  const posy: [number, number, number, number, number][] = [
    // size (% of the oval's width), left %, top %, rotation, delay
    [44, 6, 38, -24, 0.4],
    [40, 52, 14, 18, 0.6],
    [36, 50, 58, 40, 0.8],
    [62, 19, 24, 6, 0.2],
  ];
  return (
    <div
      className="relative h-full w-full"
      style={{ background: "radial-gradient(circle at 50% 42%, #fdf6f9 0%, #eef1f9 55%, #d7e0f0 100%)" }}
    >
      {posy.map(([s, l, t, r, d], i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ width: `${s}%`, left: `${l}%`, top: `${t}%` }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1, rotate: [r - 3, r + 3, r - 3] }}
          transition={{
            opacity: { duration: 0.8, delay: d },
            scale: { duration: 0.8, delay: d },
            rotate: { duration: 6 + i, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          <Flower size="100%" />
        </motion.div>
      ))}
    </div>
  );
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** The wedding date set inside the frame, on the lace. */
function FrameDate({ iso }: { iso?: string }) {
  const d = new Date(iso ?? "");
  const ok = !Number.isNaN(d.getTime());
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center text-center" style={laceStyle()}>
      {/* a veil over the lace so the frame's carving and the type both stand clear */}
      <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(circle, rgba(36,52,84,0.15), rgba(36,52,84,0.45))" }} />
      <div className="relative flex flex-col items-center" style={{ color: BLUSH }}>
        {/* small enough to clear the oval's narrowing top */}
        <span style={{ fontFamily: SCRIPT, fontSize: v(20), lineHeight: 1.1, whiteSpace: "nowrap" }}>Save the Date</span>
        {ok ? (
          <>
            <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: v(58), lineHeight: 1, marginTop: v(6) }}>{d.getDate()}</span>
            <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: v(15), letterSpacing: "0.22em", textTransform: "uppercase", marginTop: v(4) }}>
              {MONTHS[d.getMonth()]}
            </span>
            <span style={{ fontFamily: SERIF, fontSize: v(22), marginTop: v(2) }}>{d.getFullYear()}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

/** The place they're marrying: their own photo of it, else a drawing of a
 *  Kerala church, tharavad or the backwaters in the design's blue (chosen in
 *  the Studio, or by the couple's community). */
function FrameVenue({ content, community }: { content: InvitationContent; community?: string }) {
  if (content.venuePhoto) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={content.venuePhoto} alt="" className="h-full w-full object-cover" />;
  }
  const pick = content.venueArt && content.venueArt !== "auto" ? content.venueArt : community === "kerala-christian" ? "church" : community === "hindu" ? "tharavad" : "backwaters";
  return (
    <div className="h-full w-full" style={{ background: "#fdf1f6" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/assets/templates/hydrangea/venue-${pick}.webp`} alt="" className="h-full w-full object-cover" style={{ objectPosition: "50% 70%" }} />
    </div>
  );
}

/** A blessing or a wish on the lace: the couple's own words, else the verse
 *  on their first event, else their community's blessing. Short wishes are
 *  set in script, longer verses in italic. */
function FrameBlessing({ content, motif }: { content: InvitationContent; motif?: MotifPack }) {
  const own = content.frameText?.trim();
  const ev = content.schedule?.events?.[0];
  const text = own || ev?.verse?.trim() || motif?.defaultBlessing || "Two hearts, one journey.";
  const ref = own ? "" : ev?.verse?.trim() ? ev.verseRef ?? "" : motif?.defaultBlessingRef ?? "";
  const short = text.length <= 40;
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center text-center" style={laceStyle()}>
      <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(circle, rgba(36,52,84,0.2), rgba(36,52,84,0.5))" }} />
      <div className="relative flex flex-col items-center" style={{ color: BLUSH, padding: `0 ${v(20)}` }}>
        <Flower size={v(34)} rotate={-10} />
        {short ? (
          <span style={{ fontFamily: SCRIPT, fontSize: v(text.length <= 24 ? 28 : 23), lineHeight: 1.2, marginTop: v(8) }}>{text}</span>
        ) : (
          <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, fontSize: v(text.length > 80 ? 13.5 : 15.5), lineHeight: 1.4, marginTop: v(8) }}>
            “{text}”
          </span>
        )}
        {ref ? (
          <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: v(11.5), letterSpacing: "0.16em", textTransform: "uppercase", marginTop: v(8), opacity: 0.9 }}>
            {ref}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ----------------------------- the template ----------------------------- */

export function HydrangeaTemplate({
  content,
  theme,
  motif,
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
  const [viewer, setViewer] = useState<number | null>(null);

  const { couple, families, schedule, countdown, rsvp, story, map, hero } = content;
  const names = [couple.partner1?.name, couple.partner2?.name].filter(Boolean);
  const letters = [initialOf(couple.partner1?.name), initialOf(couple.partner2?.name)].filter(Boolean);
  const hidden = content.hiddenSections ?? [];
  // hiding "Our Story" in the Studio keeps the couple's photos off the card
  const photos = hidden.includes("story")
    ? []
    : (story?.items ?? []).map((s) => s.photo).filter((p): p is string => Boolean(p));
  const chosen = content.frameFill;
  // (the Garden designs' swans / initials have no place here: flowers instead)
  const fill =
    chosen === "date" || chosen === "venue" || chosen === "blessing"
      ? chosen
      : (chosen && chosen !== "photos") || !photos.length
        ? "flowers"
        : "photos";
  const events = (schedule?.events ?? []).slice(0, 6);
  const firstEv = events[0];
  const dress = content.dressCode;
  const wishes = content.wishes ?? [];
  const contacts = content.contacts ?? {};
  const showDress = !hidden.includes("dresscode") && (hasDressCode(content) || wishes.length > 0);
  const cal = calendarEvent(content);

  const target = firstEv ? targetFromEvent(firstEv) : {};
  if (map?.directionsQuery?.trim()) {
    target.query = map.directionsQuery.trim();
    target.url = undefined;
  }
  if (map?.directionsUrl?.trim()) target.url = map.directionsUrl.trim();

  /* "Tap here to begin" starts the music and the invitation plays itself,
     page by page to the end, holding the reply page longer; a touch pauses it
     and it picks up again after a while (useTour). If nobody taps, it begins
     by itself after four seconds, and the music starts with their first tap
     anywhere (a browser won't play sound before one). */
  const viewerOpen = useRef(false);
  useEffect(() => {
    viewerOpen.current = viewer !== null;
  }, [viewer]);
  const tour = useTour(main, { hold: () => viewerOpen.current });
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

  const family = (p?: (typeof couple)["partner1"]) => {
    if (!p?.name) return null;
    const parents = [p.father, p.mother].filter((x) => x?.trim()).join(" & ");
    return (
      <div className="flex flex-col items-center">
        <PenReveal delay={0.2}>
          <H size={40}>{p.name}</H>
        </PenReveal>
        {parents ? (
          <>
            {p.parentsPrefix?.trim() ? <P style={{ fontSize: `max(16px, ${v(16)})` }}>{p.parentsPrefix}</P> : null}
            <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: `max(15px, ${v(15)})`, letterSpacing: "0.06em", textTransform: "uppercase", color: BLUE }}>
              {parents}
            </p>
          </>
        ) : null}
      </div>
    );
  };

  return (
    <PreviewContext.Provider value={{ compact, editing }}>
      <ThemeProvider theme={theme} className={`relative overflow-x-hidden ${snap ? "h-svh overflow-y-auto" : "min-h-screen"}`}>
        <div style={{ ...PALETTE, ...laceStyle() }} className="flex min-h-full justify-center">
          <StyleOverrides content={content} />
          <TextOffsets offsets={content.offsets} />

          <main ref={main} className="relative" style={{ width: compact ? "100%" : "min(100%, 480px)", containerType: "inline-size", background: BLUSH }}>
            {/* ------------------------------ cover ------------------------------ */}
            <section id="frame-couple" className="relative" style={{ background: BLUE, padding: `${v(26)} 0 ${v(8)}` }}>
              <div
                className="relative mx-auto flex flex-col items-center text-center"
                style={{ width: "80%", background: BLUSH, borderRadius: 9999, padding: `${v(44)} ${v(16)} ${v(40)}` }}
              >
                {/* the monogram: the first initial high on the left, the second
                    lower on the right, their swashes crossing */}
                <PenReveal delay={0.2}>
                  {/* (tall enough for a descending second letter — J, Y, G —
                      to finish its loop before the names begin) */}
                  <div className="relative" style={{ width: v(220), height: v(182) }}>
                    <span className="absolute" style={{ left: v(30), top: 0, fontFamily: SCRIPT, fontSize: v(104), lineHeight: 1, color: BLUE }}>
                      {letters[0]}
                    </span>
                    {letters[1] ? (
                      <span className="absolute" style={{ left: v(104), top: v(40), fontFamily: SCRIPT, fontSize: v(104), lineHeight: 1, color: BLUE }}>
                        {letters[1]}
                      </span>
                    ) : null}
                  </div>
                </PenReveal>
                <PenReveal delay={1}>
                  <H size={32}>{names.join(" & ")}</H>
                </PenReveal>
                <div style={{ width: "88%", marginTop: v(16) }}>
                  <OrnateFrame>
                    {fill === "photos" ? (
                      <PhotoOval photos={photos} onOpen={compact || editing ? undefined : setViewer} />
                    ) : fill === "date" ? (
                      <FrameDate iso={countdown?.targetDate} />
                    ) : fill === "venue" ? (
                      <FrameVenue content={content} community={motif?.id ?? content.meta?.community} />
                    ) : fill === "blessing" ? (
                      <FrameBlessing content={content} motif={motif} />
                    ) : (
                      <FrameFlowers />
                    )}
                  </OrnateFrame>
                </div>
              </div>
              {guided && !begun ? (
                <div className="flex justify-center" style={{ padding: `${v(20)} 0 ${v(6)}` }}>
                  <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>
                    <ActionButton tone="cream" icon="hand" onClick={() => begin(true)}>
                      Tap here to begin
                    </ActionButton>
                  </motion.div>
                </div>
              ) : (
                <div style={{ height: v(18) }} />
              )}
            </section>
            <FlowerBand top={{ background: BLUE }} bottom={{ background: BLUSH }} />

            {/* ----------------------------- welcome ----------------------------- */}
            {hidden.includes("families") ? null : (
              <section id="frame-families" className="text-center" style={{ background: BLUSH, padding: `${v(26)} ${v(30)} ${v(30)}` }}>
                <Rise>
                  <H>Dear Guests!</H>
                </Rise>
                <Rise delay={0.1}>
                  <P className="mt-3">
                    We would be so happy to share with you the joy of a day that means the world to us — our wedding. Please join us for the
                    celebration.
                  </P>
                </Rise>
                <Rise delay={0.15} className="flex flex-col items-center" style={{ marginTop: v(26), gap: v(6) }}>
                  {family(couple.partner1)}
                  <H size={34} color={SOFT}>
                    &amp;
                  </H>
                  {family(couple.partner2)}
                </Rise>
                {families?.footer ? (
                  <Rise>
                    <P style={{ marginTop: v(22) }}>{families.footer}</P>
                  </Rise>
                ) : null}
              </section>
            )}

            {/* ------------------------------- date ------------------------------- */}
            <section id="frame-date" className="relative overflow-hidden" style={{ background: BLUSH }}>
              {/* the box is as tall as the circle, so nothing below can slide under it */}
              <div className="relative" style={{ height: v(500) }}>
                {/* a circle wider than the page: round at top and foot, cut by the sides */}
                <div className="absolute rounded-full" style={{ width: v(500), height: v(500), left: v(-55), top: 0, background: BLUE }} />
                <motion.div
                  className="absolute"
                  style={{ left: v(34), top: v(8) }}
                  initial={compact || editing ? false : { opacity: 0, scale: 0.6, rotate: -40 }}
                  whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 120, damping: 12 }}
                >
                  <Flower size={v(86)} rotate={-18} />
                </motion.div>
                <div className="absolute inset-x-0 flex flex-col items-center text-center" style={{ top: v(70) }}>
                  <Rise>
                    <H color={BLUSH} size={46}>
                      Wedding
                      <br />
                      Date
                    </H>
                  </Rise>
                  <Rise delay={0.15} className="w-full" style={{ marginTop: v(22) }}>
                    <WeekStrip iso={countdown?.targetDate} ink={BLUSH} ground={BLUE} />
                  </Rise>
                  <Rise delay={0.3}>
                    <H color={BLUSH} size={50}>
                      <span style={{ display: "inline-block", marginTop: v(26) }}>{dotted(countdown?.targetDate)}</span>
                    </H>
                    {firstEv?.time ? <P color={BLUSH}>at {firstEv.time}</P> : null}
                  </Rise>
                </div>
              </div>
              <Rise className="flex flex-col items-center" style={{ padding: `${v(22)} ${v(16)} ${v(30)}`, gap: v(18) }}>
                <CountdownTiles target={countdown?.targetDate} ink={BLUE} solid={BLUSH} size={78} />
                {cal ? (
                  <ActionButton icon="calendar" onClick={() => downloadIcs(cal, "invitation.ics")}>
                    Add to my calendar
                  </ActionButton>
                ) : null}
              </Rise>
            </section>

            {/* ------------------------------ venue ------------------------------ */}
            <section id="frame-venue" className="flex flex-col items-center text-center" style={{ background: BLUSH, padding: `${v(20)} ${v(24)} ${v(40)}` }}>
              <Rise>
                <H>Venue</H>
              </Rise>
              {content.venuePhoto ? (
                <Rise className="w-full" style={{ marginTop: v(16) }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={content.venuePhoto}
                    alt=""
                    className="mx-auto block object-cover"
                    style={{ width: "88%", aspectRatio: "2 / 1.1", borderRadius: "50%" }}
                  />
                </Rise>
              ) : null}
              <Rise delay={0.1} style={{ marginTop: v(16) }}>
                {firstEv?.venue ? (
                  <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: `max(18px, ${v(20)})`, color: BLUE, lineHeight: 1.3 }}>{firstEv.venue}</p>
                ) : null}
                {firstEv?.address ? <P>{firstEv.address}</P> : null}
              </Rise>
              {hasMapTarget(target) ? (
                <Rise delay={0.2} style={{ marginTop: v(20) }}>
                  <span className="relative inline-block">
                    <DirectionsLink target={target} style={{ ...actionStyle("olive"), paddingRight: 46 }}>
                      <Icon name="pin" />
                      {map?.directionsLabel?.trim() || "Get directions"}
                    </DirectionsLink>
                    <Flower size="58px" rotate={12} style={{ position: "absolute", right: -20, top: "50%", marginTop: -29, pointerEvents: "none" }} />
                  </span>
                </Rise>
              ) : null}
            </section>

            {/* ---------------------------- programme ---------------------------- */}
            {hidden.includes("schedule") || !events.length ? null : (
              <>
                {/* the flower rows sit inside the lace, so its pattern runs on
                    unbroken behind them */}
                <section id="frame-schedule" style={laceStyle()}>
                  <FlowerBand top={{ background: BLUSH }} bottom={{}} />
                  <div
                    className="mx-auto flex flex-col items-center text-center"
                    style={{ width: "84%", background: BLUE, borderRadius: 9999, padding: `${v(64)} ${v(20)} ${v(70)}` }}
                  >
                    <Rise>
                      <H color={BLUSH} size={46}>
                        {schedule.heading?.trim() || "Programme"}
                      </H>
                    </Rise>
                    {schedule.subtext ? (
                      <Rise>
                        <P color={BLUSH} style={{ marginTop: v(4) }}>
                          {schedule.subtext}
                        </P>
                      </Rise>
                    ) : null}
                    <div className="flex flex-col items-center" style={{ marginTop: v(22) }}>
                      {events.map((ev, i) => (
                        <Rise key={ev.id} delay={0.1 * i} className="flex flex-col items-center">
                          {i > 0 ? <span aria-hidden className="block" style={{ width: 1, height: v(34), background: BLUSH, opacity: 0.65, margin: `${v(10)} 0` }} /> : null}
                          <p style={{ fontFamily: SERIF, fontWeight: 700, fontSize: v(34), lineHeight: 1.1, color: BLUSH }}>{ev.time}</p>
                          <P color={BLUSH}>{ev.name}</P>
                          {ev.venue && events.length > 1 ? (
                            <p style={{ fontFamily: SERIF, fontSize: `max(15px, ${v(15)})`, color: BLUSH, opacity: 0.85 }}>{ev.venue}</p>
                          ) : null}
                        </Rise>
                      ))}
                    </div>
                  </div>
                  <FlowerBand top={{}} bottom={{ background: BLUSH }} />
                </section>
              </>
            )}

            {/* ---------------------------- dress code ---------------------------- */}
            {showDress ? (
              <>
                <section id="frame-dresscode" className="flex flex-col items-center text-center" style={{ background: BLUSH, padding: `${v(24)} ${v(30)} ${v(30)}` }}>
                  {hasDressCode(content) ? (
                    <>
                      <Rise>
                        <H>{dress?.heading?.trim() || "Dress Code"}</H>
                      </Rise>
                      {dress?.note?.trim() ? (
                        <Rise>
                          <P className="mt-2">{dress.note}</P>
                        </Rise>
                      ) : null}
                      {dress?.swatches?.length ? (
                        <Rise style={{ marginTop: v(22) }}>
                          <Swatches colors={dress.swatches.slice(0, 6)} />
                        </Rise>
                      ) : null}
                      {dress?.her?.trim() || dress?.him?.trim() ? (
                        <Rise style={{ marginTop: v(18) }}>
                          {dress?.her?.trim() ? <P>For her: {dress.her}</P> : null}
                          {dress?.him?.trim() ? <P>For him: {dress.him}</P> : null}
                        </Rise>
                      ) : null}
                      {dress?.avoid?.trim() ? (
                        <Rise>
                          <P style={{ marginTop: v(10) }}>Kindly avoid {dress.avoid}</P>
                        </Rise>
                      ) : null}
                    </>
                  ) : null}
                  {wishes.length ? (
                    <div className="flex flex-col items-center" style={{ marginTop: hasDressCode(content) ? v(40) : 0 }}>
                      <Rise>
                        <H>Wishes</H>
                      </Rise>
                      <Rise style={{ margin: `${v(10)} 0` }}>
                        <Flower size={v(64)} rotate={8} />
                      </Rise>
                      {wishes.slice(0, 3).map((w, i) => (
                        <Rise key={i} style={{ marginTop: v(8) }}>
                          {w.title ? <p style={{ fontFamily: SERIF, fontWeight: 700, fontSize: `max(17px, ${v(17)})`, color: BLUE }}>{w.title}</p> : null}
                          <P>{w.body}</P>
                        </Rise>
                      ))}
                    </div>
                  ) : null}
                </section>
                <FlowerBand top={{ background: BLUSH }} bottom={{ background: BLUSH }} />
              </>
            ) : null}

            {/* ------------------------------- reply ------------------------------- */}
            {hidden.includes("rsvp") ? null : (
              <section id="frame-rsvp" className="flex flex-col items-center text-center" style={{ background: BLUSH, padding: `${v(24)} ${v(26)} ${v(34)}` }}>
                <Rise>
                  <H>See You Soon!</H>
                </Rise>
                <Rise>
                  <P className="mt-2">
                    {rsvp?.footer?.trim() || "Please let us know whether you can come, so we can prepare everything and welcome you with care."}
                  </P>
                </Rise>
                <div className="flex w-full justify-center" style={{ marginTop: v(24) }}>
                  <ReplyForm content={content} live={live} />
                </div>
                {contacts.phone?.trim() || contacts.chatUrl?.trim() ? (
                  <Rise className="flex w-full flex-col items-center" style={{ marginTop: v(30), gap: 12, maxWidth: 420 }}>
                    <p style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 700, color: BLUE }}>Questions on the day?</p>
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
                  </Rise>
                ) : null}
              </section>
            )}

            {/* ------------------------------ closing ------------------------------ */}
            <FlowerBand top={{ background: BLUSH }} bottom={{ background: BLUE }} />
            <section className="flex flex-col items-center text-center" style={{ background: BLUE, padding: `${v(20)} ${v(24)} ${v(70)}` }}>
              <Rise>
                <H color={BLUSH} size={50}>
                  We await you!
                </H>
              </Rise>
              {hero?.closingLine ? (
                <Rise>
                  <P color={BLUSH} style={{ marginTop: v(6) }}>
                    {hero.closingLine}
                  </P>
                </Rise>
              ) : null}
              <Rise>
                <H color={BLUSH} size={34}>
                  <span style={{ display: "inline-block", marginTop: v(14) }}>{names.join(" & ")}</span>
                </H>
              </Rise>
            </section>
          </main>

          <AnimatePresence>
            {viewer !== null ? <PhotoViewer key="viewer" photos={photos} start={viewer} onClose={() => setViewer(null)} /> : null}
          </AnimatePresence>
          {tour.running && !tour.paused ? (
            <motion.div
              key={tour.stop.n}
              aria-hidden
              className="pointer-events-none fixed left-0 top-0 z-[70] h-[3px]"
              style={{ background: BLUSH }}
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
