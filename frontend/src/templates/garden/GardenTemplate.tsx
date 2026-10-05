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

/**
 * "Garden" — an old-master garden at dusk and engraved magnolias on olive.
 *
 * Seven painted and engraved plates carry the whole look; this file only
 * writes into them. The boxes below were measured off the plates themselves —
 * the heart on the cover, the lace oval, the empty arch under each garland —
 * so the words sit inside the drawing rather than near it.
 *
 * The timeline icons were lifted off their plate and are laid out here, which
 * is why any number of events fits: the plate as generated only left room to
 * write under three of its four drawings.
 */

const A = (f: string) => `/assets/templates/garden/${f}`;
const ICONS = ["icon-guests.png", "icon-swans.png", "icon-cake.png", "icon-glasses.png"];

const PALETTE = {
  "--g-olive": "#545738",
  "--g-dusk": "#2a2316", // the paintings' own edge colour
  "--g-cream": "#f1eada",
  "--g-ink": "#4f5337",
  "--g-soft": "#7e7f60",
  "--g-paper": "#efe9d6", // type on the olive and on the paintings
} as CSSProperties;

const SCRIPT = "var(--font-greatvibes)";
const SERIF = "var(--font-cormorant)";

/* ----------------------------- type ----------------------------- */

function Script({
  children,
  size,
  color = "var(--g-ink)",
  className = "",
  edit,
}: {
  children: ReactNode;
  size: number;
  color?: string;
  className?: string;
  edit?: string;
}) {
  return (
    <p
      data-edit={edit}
      className={className}
      style={{ fontFamily: SCRIPT, fontSize: u(size), lineHeight: 1.15, color }}
    >
      {children}
    </p>
  );
}

function Caps({
  children,
  size,
  color = "var(--g-ink)",
  className = "",
  edit,
}: {
  children: ReactNode;
  size: number;
  color?: string;
  className?: string;
  edit?: string;
}) {
  return (
    <p
      data-edit={edit}
      className={`uppercase ${className}`}
      style={{ fontFamily: SERIF, fontSize: u(size), letterSpacing: "0.16em", lineHeight: 1.45, color }}
    >
      {children}
    </p>
  );
}

function Body({
  children,
  size = 38,
  color = "var(--g-soft)",
  className = "",
  edit,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  className?: string;
  edit?: string;
}) {
  return (
    <p
      data-edit={edit}
      className={className}
      style={{ fontFamily: SERIF, fontSize: u(size), lineHeight: 1.55, color }}
    >
      {children}
    </p>
  );
}

/** The engraved section break the reference uses between blocks: ─ ✦ ─ */
function Ornament({ color = "var(--g-soft)" }: { color?: string }) {
  return (
    <span aria-hidden className="mx-auto flex items-center gap-[3%]" style={{ width: "34%", color }}>
      <span className="h-px flex-1" style={{ background: "currentColor", opacity: 0.5 }} />
      <span style={{ fontSize: u(24), lineHeight: 1 }}>✦</span>
      <span className="h-px flex-1" style={{ background: "currentColor", opacity: 0.5 }} />
    </span>
  );
}

/** A pill button in the reference's style — filled olive on cream, or the
 *  reverse on the olive pages. */
function Pill({
  children,
  onClick,
  tone = "olive",
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "olive" | "cream";
}) {
  const olive = tone === "olive";
  return (
    <button
      type="button"
      onClick={onClick}
      className="uppercase"
      style={{
        fontFamily: SERIF,
        fontSize: u(28),
        letterSpacing: "0.16em",
        padding: `${u(18)} ${u(48)}`,
        borderRadius: 999,
        background: olive ? "var(--g-ink)" : "var(--g-cream)",
        color: olive ? "var(--g-cream)" : "var(--g-ink)",
      }}
    >
      {children}
    </button>
  );
}

/* ----------------------------- dates ---------------------------- */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "09 | JANUARY | 2027" — the reference's date line. */
function barDate(content: InvitationContent): string {
  const d = new Date(content.countdown?.targetDate ?? "");
  if (Number.isNaN(d.getTime())) return content.dateReveal?.eventDate ?? "";
  return `${String(d.getDate()).padStart(2, "0")} | ${MONTHS[d.getMonth()]} | ${d.getFullYear()}`;
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
 * The guest questionnaire, opened from the details page the way the
 * reference's "fill in the form" button does. It slides up as a cream sheet
 * wearing the set's own garlands; behaviour is the shared `useRsvp`, so the
 * meal keys and decline rules match every other design.
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
  const label: CSSProperties = { fontFamily: SCRIPT, fontSize: 22, color: "var(--g-ink)", lineHeight: 1.2 };
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
    fontSize: 14,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    padding: "10px 16px",
    borderRadius: 999,
    background: on ? "var(--g-ink)" : "transparent",
    color: on ? "var(--g-cream)" : "var(--g-ink)",
    border: "1px solid color-mix(in srgb, var(--g-ink) 45%, transparent)",
  });

  return (
    <motion.div
      className="fixed inset-0 z-[80] overflow-y-auto"
      style={{ background: "color-mix(in srgb, var(--g-olive) 92%, transparent)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative mx-auto my-8 w-[92%] max-w-md px-7 pb-10 pt-6 text-center"
        style={{ background: "var(--g-cream)", borderRadius: "220px 220px 220px 220px / 140px 140px 140px 140px" }}
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-6 top-5"
          style={{ fontFamily: SERIF, fontSize: 22, color: "var(--g-soft)" }}
        >
          ✕
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={A("garland-top.png")} alt="" className="mx-auto w-[86%]" />

        {form.submitted ? (
          <div className="py-8">
            <p style={{ fontFamily: SCRIPT, fontSize: 38, color: "var(--g-ink)" }}>
              {form.attending === "accept" ? "Thank you!" : "We will miss you"}
            </p>
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
            <p className="text-center" style={{ fontFamily: SCRIPT, fontSize: 40, color: "var(--g-ink)" }}>
              {rsvp?.heading}
            </p>

            <label className="mt-5 block">
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
                  <span style={{ fontFamily: SERIF, fontSize: 20, color: "var(--g-ink)" }}>{form.guests}</span>
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

            <div className="mt-7 text-center">
              <button
                type="submit"
                disabled={form.busy}
                className="uppercase disabled:opacity-60"
                style={{
                  fontFamily: SERIF,
                  fontSize: 15,
                  letterSpacing: "0.18em",
                  padding: "13px 34px",
                  borderRadius: 999,
                  background: "var(--g-ink)",
                  color: "var(--g-cream)",
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
  const { couple, families, hero, schedule, countdown, rsvp, story, map } = content;
  const names = [couple.partner1?.name, couple.partner2?.name].filter(Boolean);
  const date = barDate(content);
  const firstEv = schedule?.events?.[0];
  const photo = story?.items?.find((s) => s.photo)?.photo;
  const hidden = content.hiddenSections ?? [];
  const dress = content.dressCode;
  const wishes = content.wishes ?? [];
  const left = useCountdown(countdown?.targetDate);
  // the plate leaves room for five rows at most before they crowd the garland
  const events = (schedule?.events ?? []).slice(0, 5);

  const target = firstEv ? targetFromEvent(firstEv) : {};
  if (map?.directionsQuery?.trim()) {
    target.query = map.directionsQuery.trim();
    target.url = undefined;
  }
  if (map?.directionsUrl?.trim()) target.url = map.directionsUrl.trim();

  const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

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
              <Zone box={{ x0: 0.06, y0: 0.018, x1: 0.94, y1: 0.05 }} className="flex-row items-center justify-between">
                {[
                  ["Venue", "frame-venue"],
                  ["Timing", "frame-schedule"],
                  ["Details", "frame-dresscode"],
                  ["RSVP", "frame-rsvp"],
                ].map(([label, id]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => goTo(id)}
                    className="uppercase"
                    style={{
                      fontFamily: SERIF,
                      fontSize: u(28),
                      letterSpacing: "0.14em",
                      color: "var(--g-paper)",
                      textShadow: "0 1px 6px rgba(0,0,0,0.55)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </Zone>

              {/* on the sage face of the heart — measured, it narrows fast below .73 */}
              <Zone box={{ x0: 0.31, y0: 0.612, x1: 0.69, y1: 0.75 }} className="items-center justify-center text-center">
                <Script size={88} color="#fbf8f0">
                  Wedding Day
                </Script>
                <Caps size={32} color="#fbf8f0" className="mt-[2%]">
                  {names.join(" & ")}
                </Caps>
                <Caps size={25} color="#f3efe4" className="mt-[1%]">
                  {date}
                </Caps>
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
                <Zone box={{ x0: 0.12, y0: 0.378, x1: 0.88, y1: 0.606 }} className="items-center justify-center text-center">
                  <Script size={84} edit="families.heading">
                    {families?.heading}
                  </Script>
                  <Body className="mt-[3%] max-w-[86%]" edit="families.footer">
                    {families?.footer || hero?.tagline}
                  </Body>
                  <Script size={72} className="mt-[6%]">
                    Save the Date
                  </Script>
                  <Caps size={28} color="var(--g-soft)" className="mt-[1%]">
                    {date}
                  </Caps>
                </Zone>
              </Plate>
            )}

            {/* ------------------------------ 3 · venue ------------------------------ */}
            <Plate id="frame-venue" art={A("03-venue.jpg")}>
              <Zone box={{ x0: 0.1, y0: 0.07, x1: 0.9, y1: 0.46 }} className="items-center justify-center text-center">
                <Script size={92} color="var(--g-paper)">
                  Venue
                </Script>
                <Caps size={30} color="var(--g-paper)" className="mt-[3%] opacity-80">
                  {date}
                </Caps>
                <Ornament color="var(--g-paper)" />
                <Caps size={36} color="var(--g-paper)" className="mt-[4%]">
                  {firstEv?.venue}
                </Caps>
                {firstEv?.address ? (
                  <Body color="color-mix(in srgb, var(--g-paper) 80%, transparent)" className="mt-[2%]">
                    {firstEv.address}
                  </Body>
                ) : null}
              </Zone>
              {hasMapTarget(target) ? (
                <Zone box={{ x0: 0.1, y0: 0.835, x1: 0.9, y1: 0.93 }} className="items-center justify-center">
                  <DirectionsLink
                    target={target}
                    className="uppercase"
                    style={{
                      fontFamily: SERIF,
                      fontSize: u(28),
                      letterSpacing: "0.16em",
                      padding: `${u(18)} ${u(48)}`,
                      borderRadius: 999,
                      background: "var(--g-cream)",
                      color: "var(--g-ink)",
                    }}
                  >
                    {map?.directionsLabel ?? "View on map"}
                  </DirectionsLink>
                </Zone>
              ) : null}
            </Plate>

            {/* ------------------------------ 4 · timing ----------------------------- */}
            {hidden.includes("schedule") || !events.length ? null : (
              <Plate id="frame-schedule" art={A("04-timing.jpg")}>
                {/* the empty arch under the garland's crown */}
                <Zone box={{ x0: 0.3, y0: 0.226, x1: 0.7, y1: 0.278 }} className="items-center justify-center">
                  <Script size={64} edit="schedule.heading">
                    {schedule.heading}
                  </Script>
                </Zone>
                <Zone box={{ x0: 0.18, y0: 0.29, x1: 0.82, y1: 0.722 }} className="items-center justify-between text-center">
                  {events.map((ev, i) => (
                    <div key={ev.id} className="flex flex-col items-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={A(ICONS[i % ICONS.length])} alt="" style={{ height: u(events.length > 4 ? 72 : events.length > 3 ? 96 : 118) }} />
                      <Caps size={32} className="mt-[3%]">
                        {ev.time}
                      </Caps>
                      <Caps size={27} color="var(--g-ink)">
                        {ev.name}
                      </Caps>
                      {ev.venue && events.length < 5 ? (
                        <Body size={28} className="leading-tight">
                          {ev.venue}
                        </Body>
                      ) : null}
                    </div>
                  ))}
                </Zone>
              </Plate>
            )}

            {/* --------------------------- 5 · dress code ---------------------------- */}
            {hidden.includes("dresscode") || (!hasDressCode(content) && !wishes.length) ? null : (
              <Plate id="frame-dresscode" art={A("05-dresscode.jpg")}>
                {/* the column the calla lilies leave free, top to bottom */}
                <Zone box={{ x0: 0.22, y0: 0.06, x1: 0.71, y1: 0.95 }} className="items-center justify-center text-center">
                  {hasDressCode(content) ? (
                    <>
                      <Script size={80} color="var(--g-paper)" edit="dressCode.heading">
                        {dress?.heading?.trim() || "Dress Code"}
                      </Script>
                      {dress?.note?.trim() ? (
                        <Body color="color-mix(in srgb, var(--g-paper) 82%, transparent)" className="mt-[4%]" edit="dressCode.note">
                          {dress.note}
                        </Body>
                      ) : null}
                      {dress?.swatches?.length ? (
                        <div className="mt-[6%] flex flex-wrap justify-center gap-[5%]">
                          {dress.swatches.map((s, i) => (
                            <span
                              key={`${s.hex}-${i}`}
                              title={s.label}
                              className="block rounded-full"
                              style={{
                                width: u(84),
                                height: u(84),
                                background: s.hex,
                                border: "1px solid color-mix(in srgb, var(--g-paper) 55%, transparent)",
                              }}
                            />
                          ))}
                        </div>
                      ) : null}
                      {dress?.avoid?.trim() ? (
                        <Body size={30} color="color-mix(in srgb, var(--g-paper) 70%, transparent)" className="mt-[5%] italic">
                          Kindly avoid {dress.avoid}
                        </Body>
                      ) : null}
                    </>
                  ) : null}

                  {wishes.length ? (
                    <div className={hasDressCode(content) ? "mt-[10%]" : ""}>
                      <Script size={76} color="var(--g-paper)">
                        Our wishes
                      </Script>
                      {wishes.map((w, i) => (
                        <div key={i} className="mt-[5%]">
                          <Caps size={28} color="var(--g-paper)">
                            {w.title}
                          </Caps>
                          <Body color="color-mix(in srgb, var(--g-paper) 82%, transparent)">{w.body}</Body>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </Zone>
              </Plate>
            )}

            {/* ----------------------------- 6 · details ----------------------------- */}
            {hidden.includes("rsvp") ? null : (
              <Plate id="frame-rsvp" art={A("06-details.jpg")}>
                <Zone box={{ x0: 0.3, y0: 0.235, x1: 0.7, y1: 0.285 }} className="items-center justify-center">
                  <Script size={80} edit="rsvp.heading">
                    {rsvp?.heading}
                  </Script>
                </Zone>
                <Zone box={{ x0: 0.15, y0: 0.29, x1: 0.85, y1: 0.585 }} className="items-center justify-center text-center">
                  <Body className="max-w-[88%]">
                    Please let us know whether you can join us, so we can prepare for your arrival with care.
                  </Body>
                  {rsvp?.footer ? (
                    <Body className="mt-[3%] max-w-[88%] italic" edit="rsvp.footer">
                      {rsvp.footer}
                    </Body>
                  ) : null}
                  <div className="mt-[8%]">
                    <Pill onClick={editing ? undefined : () => setSheet(true)}>Fill in the RSVP</Pill>
                  </div>
                </Zone>
              </Plate>
            )}

            {/* ----------------------------- 7 · closing ----------------------------- */}
            <Plate art={A("07-closing.jpg")} field="var(--g-dusk)">
              <Zone box={{ x0: 0.1, y0: 0.63, x1: 0.9, y1: 0.95 }} className="items-center justify-center text-center">
                {left ? (
                  <Caps size={29} color="color-mix(in srgb, var(--g-paper) 75%, transparent)">
                    {left.d} days · {left.h} hours · {left.m} minutes
                  </Caps>
                ) : null}
                <Body color="color-mix(in srgb, var(--g-paper) 85%, transparent)" className="mt-[5%] max-w-[86%]" edit="hero.closingLine">
                  {hero?.closingLine}
                </Body>
                <Script size={96} color="var(--g-paper)" className="mt-[6%]">
                  We await you!
                </Script>
                <Caps size={30} color="color-mix(in srgb, var(--g-paper) 75%, transparent)" className="mt-[3%]">
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
