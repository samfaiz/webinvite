"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { RenderProps } from "@/engine/types";
import { PreviewContext } from "@/components/PreviewContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SmoothScroll } from "@/components/SmoothScroll";
import { MusicToggle } from "@/components/MusicToggle";
import { ScrollGuide } from "@/components/ScrollGuide";
import { StyleOverrides } from "@/components/StyleOverrides";
import { TextOffsets } from "@/templates/TextOffsets";
import { VideoIntro } from "@/blocks/VideoIntro";
import { hasDressCode } from "@/blocks/DressCode";
import { BotanicalFrame, SprigDivider } from "./ornaments";
import {
  Body,
  Caps,
  DigitCountdown,
  LetterPanel,
  Location,
  Palette,
  Programme,
  Questionnaire,
  Title,
  Wishes,
} from "./elements";

/**
 * "Toile" — engraved blue botanicals on paper white.
 *
 * Built from its own parts, not the shared blocks: the border, the sprigs and
 * the ribbon are drawn as SVG so they take the theme's colour and stay sharp;
 * the programme is a column of time pills; the countdown is a clock face; the
 * RSVP is a printed questionnaire. What it shares is behaviour — the
 * questionnaire runs off the same `useRsvp` as every other design.
 *
 * The scroll is plain sections rather than a fixed plate per screen, because
 * this design's pages are paper of different lengths, not a deck of slides.
 */

const PALETTE = {
  "--t-paper": "#fdfdfb",
  "--t-panel": "#dbe5f2",
  "--t-line": "#8ba3c7",
  "--t-ink": "#2b3a5c",
  "--t-body": "#4b5a75",
  "--t-soft": "#8494ad",
  "--t-ribbon": "#bcd0e8",
  "--t-ribbon-hi": "#e4edf8",
  "--t-ribbon-lo": "#93b0d2",
} as CSSProperties;

/** One page of the invitation. `tint` sets it on the powder panel instead of
 *  paper, which is how the reference alternates its screens. */
function Page({
  id,
  children,
  tint = false,
  compact,
}: {
  id?: string;
  children: ReactNode;
  tint?: boolean;
  compact: boolean;
}) {
  return (
    <section
      id={id}
      className={`snap-start px-6 ${compact ? "py-12" : "flex min-h-svh flex-col justify-center py-16"}`}
      style={{ background: tint ? "var(--t-panel)" : "var(--t-paper)" }}
    >
      {children}
    </section>
  );
}

export function ToileTemplate({
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
  /* This design has no envelope — the cover IS the opening screen. Only a
     custom intro video gates it, so without one there is nothing to wait for
     and the pages start visible. (Gating on `intro` alone left the whole
     invitation at opacity 0 with no component around to clear it.) */
  const gated = intro && Boolean(content.envelope?.videoUrl);
  const [opened, setOpened] = useState(!gated);
  const [revealing, setRevealing] = useState(!gated);

  const { couple, hero, story, schedule, dateReveal, countdown, rsvp } = content;
  const hidden = content.hiddenSections ?? [];
  const names = [couple.partner1?.name, couple.partner2?.name].filter(Boolean);
  const wishes = content.wishes ?? [];
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
            {!opened && content.envelope?.videoUrl ? (
              <VideoIntro
                key="intro"
                videoUrl={content.envelope.videoUrl}
                tagline={content.envelope.tagline}
                onOpening={() => setRevealing(true)}
                onOpen={() => setOpened(true)}
              />
            ) : null}
          </AnimatePresence>

          <main style={{ opacity: revealing ? 1 : 0, transition: "opacity 1s ease" }}>
            {/* ---------------------------- the cover --------------------------- */}
            <section
              id="frame-couple"
              className={`relative snap-start px-9 ${
                compact ? "py-16" : "flex min-h-svh flex-col justify-center py-20"
              }`}
              style={{ background: "var(--t-paper)" }}
            >
              <BotanicalFrame inset={14} />
              <motion.div
                className="relative text-center"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9 }}
              >
                <Caps data-edit="hero.marriageText" size={9} tone="soft">
                  {hero?.marriageText}
                </Caps>
                <div className="mt-8">
                  <Title data-edit="couple.partner1.name" className="!text-[clamp(26px,7.4vw,34px)]">
                    {couple.partner1?.name}
                  </Title>
                  <p
                    data-edit="couple.connector"
                    className="my-2"
                    style={{ fontFamily: "var(--font-cormorant)", fontSize: 20, color: "var(--t-line)" }}
                  >
                    {couple.connector ?? "&"}
                  </p>
                  <Title data-edit="couple.partner2.name" className="!text-[clamp(26px,7.4vw,34px)]">
                    {couple.partner2?.name}
                  </Title>
                </div>
                {dateReveal?.eventDate ? (
                  <p
                    className="mt-8"
                    style={{
                      fontFamily: "var(--font-cormorant)",
                      fontSize: 18,
                      letterSpacing: "0.16em",
                      color: "var(--t-ink)",
                    }}
                  >
                    {dateReveal.eventDate}
                  </p>
                ) : null}
              </motion.div>
            </section>

            {/* ---------------------------- the letter -------------------------- */}
            {hidden.includes("families") ? null : (
              <Page id="frame-families" compact={compact}>
                <LetterPanel content={content} />
              </Page>
            )}

            {/* --------------------------- the location ------------------------- */}
            <Page tint compact={compact}>
              <Location content={content} />
            </Page>

            {/* --------------------------- the programme ------------------------ */}
            {hidden.includes("schedule") || !schedule?.events?.length ? null : (
              <Page id="frame-schedule" compact={compact}>
                <div className="text-center">
                  <Title data-edit="schedule.heading">{schedule.heading}</Title>
                  <SprigDivider className="my-6" />
                </div>
                <Programme events={schedule.events} />
              </Page>
            )}

            {/* ---------------------------- the palette ------------------------- */}
            {hidden.includes("dresscode") || !hasDressCode(content) ? null : (
              <Page id="frame-dresscode" tint compact={compact}>
                <div className="mx-auto max-w-sm text-center">
                  <Title data-edit="dressCode.heading">{dress?.heading?.trim() || "Our palette"}</Title>
                  <SprigDivider className="my-6" />
                  {dress?.note?.trim() ? <Body data-edit="dressCode.note">{dress.note}</Body> : null}
                  {dress?.swatches?.length ? (
                    <div className="mt-7">
                      <Palette
                        swatches={dress.swatches}
                        caption={dress.swatches.map((s) => s.label).filter(Boolean).join(" · ")}
                      />
                    </div>
                  ) : null}
                </div>
              </Page>
            )}

            {/* ----------------------------- the wishes ------------------------- */}
            {wishes.length ? (
              <Page compact={compact}>
                <div className="text-center">
                  <Title>Wishes</Title>
                  <SprigDivider className="my-6" />
                </div>
                <Wishes items={wishes} />
              </Page>
            ) : null}

            {/* --------------------------- the questionnaire -------------------- */}
            {hidden.includes("rsvp") ? null : (
              <Page id="frame-rsvp" tint compact={compact}>
                <div className="mb-7 text-center">
                  <Title data-edit="rsvp.heading">{rsvp?.heading}</Title>
                  <SprigDivider className="my-6" />
                  {story?.subtext ? <Body className="mx-auto max-w-[32ch]">{story.subtext}</Body> : null}
                </div>
                <Questionnaire content={content} live={live} />
              </Page>
            )}

            {/* ----------------------------- the close -------------------------- */}
            <section
              className={`relative snap-start px-9 ${
                compact ? "py-16" : "flex min-h-svh flex-col justify-center py-20"
              }`}
              style={{ background: "var(--t-paper)" }}
            >
              <BotanicalFrame inset={14} />
              <div className="relative text-center">
                <DigitCountdown targetDate={countdown?.targetDate} label={countdown?.headline} />
                <SprigDivider className="my-8" />
                <p style={{ fontFamily: "var(--font-parisienne)", fontSize: 30, color: "var(--t-ink)" }}>
                  {names.join(" & ")}
                </p>
                {hero?.closingLine ? (
                  <Body data-edit="hero.closingLine" className="mx-auto mt-3 max-w-[30ch]">
                    {hero.closingLine}
                  </Body>
                ) : null}
              </div>
            </section>
          </main>

          <MusicToggle trackUrl={content.music?.trackUrl} />
          <ScrollGuide active={opened} hasMusic={!!content.music?.trackUrl} />
        </div>
      </ThemeProvider>
    </PreviewContext.Provider>
  );
}
