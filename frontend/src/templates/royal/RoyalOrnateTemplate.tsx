"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { RenderProps } from "@/engine/types";
import { backgroundFor, orderedSections } from "@/engine/types";
import { FrameBg } from "@/components/FrameBg";
import { PreviewContext } from "@/components/PreviewContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SmoothScroll } from "@/components/SmoothScroll";
import { ParticleField } from "@/components/ParticleField";
import { MusicToggle } from "@/components/MusicToggle";
import { MonogramCrest, Divider } from "@/components/Ornaments";
import { EnvelopeIntro } from "@/blocks/EnvelopeIntro";
import { VideoIntro } from "@/blocks/VideoIntro";
import { resolveSeal } from "@/lib/initials";
import { StyleOverrides } from "@/components/StyleOverrides";
import { TextOffsets } from "@/templates/TextOffsets";
import { HeroClassic } from "@/blocks/HeroClassic";
import { Countdown } from "@/blocks/Countdown";
import { Families } from "@/blocks/Families";
import { StoryGrid } from "@/blocks/StoryGrid";
import { TimelineSchedule } from "@/blocks/TimelineSchedule";
import { RSVPForm } from "@/blocks/RSVPForm";

/**
 * "Royal Ornate" — traditional/ornamental layout: framed ornate hero (shimmer
 * date, no scratch), photo-grid story with lightbox, and a vertical timeline.
 */
export function RoyalOrnateTemplate({
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
  const [opened, setOpened] = useState(!intro);
  const [revealing, setRevealing] = useState(!intro);

  return (
    <PreviewContext.Provider value={{ compact, editing }}>
    <ThemeProvider
      theme={theme}
      className={`relative overflow-x-hidden ${snap ? "h-svh snap-y snap-mandatory overflow-y-auto" : "min-h-screen"}`}
    >
      {snap ? null : <SmoothScroll />}
      <StyleOverrides content={content} />
      <TextOffsets offsets={content.offsets} />
      <ParticleField type={theme.particles.type} color={theme.particles.color} />

      <AnimatePresence>
        {!opened ? (
          content.envelope.videoUrl ? (
            <VideoIntro
              key="intro"
              videoUrl={content.envelope.videoUrl}
              tagline={content.envelope.tagline}
              onOpening={() => setRevealing(true)}
              onOpen={() => setOpened(true)}
            />
          ) : (
            <EnvelopeIntro
              key="intro"
              monogram={content.couple.monogram}
              logo={content.couple.logo}
              logoScale={content.couple.logoScale}
              tagline={content.envelope.tagline}
              seal={resolveSeal(content.envelope.seal, content.couple.partner1?.name, content.couple.partner2?.name)}
              sceneUrl={backgroundFor(theme, "hero")}
              cornerUrl={theme.backgrounds?.envelopeCorner}
              onOpening={() => setRevealing(true)}
              onOpen={() => setOpened(true)}
            />
          )
        ) : null}
      </AnimatePresence>

      <main
        style={{ opacity: revealing ? 1 : 0, transition: "opacity 1.2s ease" }}
      >
        <FrameBg id="frame-couple" src={backgroundFor(theme, "hero")}>
          <HeroClassic content={content} motif={motif} theme={theme} />
          <FrameBg fullScreen>
            <Countdown
              targetDate={content.countdown.targetDate}
              headline={content.countdown.headline}
              subtext={content.countdown.subtext}
            />
          </FrameBg>
        </FrameBg>
        {orderedSections(content.sectionOrder).map((key) => {
          if (key === "families")
            return <FrameBg key={key} id="frame-families" src={backgroundFor(theme, "families")} fullScreen><Families content={content} /></FrameBg>;
          if (key === "story")
            return <FrameBg key={key} id="frame-story" src={backgroundFor(theme, "story")} fullScreen><StoryGrid content={content} /></FrameBg>;
          if (key === "schedule")
            return <TimelineSchedule key={key} content={content} motif={motif} bg={backgroundFor(theme, "schedule")} />;
          return <FrameBg key={key} id="frame-rsvp" src={backgroundFor(theme, "rsvp")} fullScreen><RSVPForm content={content} live={live} /></FrameBg>;
        })}

        <footer className="flex min-h-svh snap-start flex-col items-center justify-center px-6 py-16 text-center">
          <MonogramCrest monogram={content.couple.monogram} logo={content.couple.logo} scale={content.couple.logoScale} size={72} />
          <p className="font-script mt-3 text-3xl" style={{ color: "var(--c-primary)" }}>
            {content.couple.partner1.name} &amp; {content.couple.partner2.name}
          </p>
          <Divider className="my-5" width={70} />
          <p
            className="font-display text-[10px] uppercase tracking-[0.24em]"
            style={{ color: "var(--c-muted)" }}
          >
            With love &amp; blessings
          </p>
        </footer>
      </main>

      <MusicToggle trackUrl={content.music.trackUrl} />
    </ThemeProvider>
    </PreviewContext.Provider>
  );
}
