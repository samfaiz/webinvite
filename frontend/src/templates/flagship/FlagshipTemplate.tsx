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
import { Hero } from "@/blocks/Hero";
import { Families } from "@/blocks/Families";
import { StoryCarousel } from "@/blocks/StoryCarousel";
import { Schedule } from "@/blocks/Schedule";
import { RSVPForm } from "@/blocks/RSVPForm";

/**
 * Flagship template ("Lake Como Romance") — composes the block library into the
 * reference layout, rendering entirely from the InvitationContent passed in.
 * The `intro={false}` prop skips the envelope (used by gallery thumbnails / Studio preview).
 */
export function FlagshipTemplate({
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
  // starts revealing the moment the envelope is tapped, so Section 1 dissolves in
  // underneath the opening cover (smooth crossfade rather than a hard cut)
  const [revealing, setRevealing] = useState(!intro);

  return (
    <PreviewContext.Provider value={{ compact, editing }}>
    <ThemeProvider
      theme={theme}
      className={`relative overflow-x-hidden ${snap ? "h-svh snap-y snap-mandatory overflow-y-auto" : "min-h-screen"}`}
    >
      {snap ? null : <SmoothScroll />}
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
        style={{
          opacity: revealing ? 1 : 0,
          transition: "opacity 1.2s ease",
        }}
      >
        {/* Section 1: full opening scene (names + save-the-date + countdown) — always first */}
        <FrameBg id="frame-couple" src={backgroundFor(theme, "hero")}>
          <Hero content={content} theme={theme} />
        </FrameBg>

        {/* middle sections in the couple's chosen order */}
        {orderedSections(content.sectionOrder).map((key) => {
          if (key === "families")
            return <FrameBg key={key} id="frame-families" src={backgroundFor(theme, "families")} fullScreen><Families content={content} /></FrameBg>;
          if (key === "story")
            return <FrameBg key={key} id="frame-story" src={backgroundFor(theme, "story")} fullScreen><StoryCarousel content={content} /></FrameBg>;
          if (key === "schedule")
            return <Schedule key={key} content={content} motif={motif} bg={backgroundFor(theme, "schedule")} />;
          return <FrameBg key={key} id="frame-rsvp" src={backgroundFor(theme, "rsvp")} fullScreen><RSVPForm content={content} live={live} /></FrameBg>;
        })}

        <footer className="px-6 pb-24 pt-6 text-center">
          <MonogramCrest monogram={content.couple.monogram} size={72} />
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
