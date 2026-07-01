"use client";

import type { CSSProperties } from "react";
import type { RenderProps } from "@/engine/types";
import { backgroundFor } from "@/engine/types";
import { FrameBg } from "@/components/FrameBg";
import { PreviewContext } from "@/components/PreviewContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SmoothScroll } from "@/components/SmoothScroll";
import { ParticleField } from "@/components/ParticleField";
import { MusicToggle } from "@/components/MusicToggle";
import { Divider } from "@/components/Ornaments";
import { HeroMinimal } from "@/blocks/HeroMinimal";
import { Countdown } from "@/blocks/Countdown";
import { Families } from "@/blocks/Families";
import { StoryGrid } from "@/blocks/StoryGrid";
import { TimelineSchedule } from "@/blocks/TimelineSchedule";
import { RSVPForm } from "@/blocks/RSVPForm";

/**
 * "Minimal Modern" — clean contemporary layout. Sans display type (Jost), no
 * envelope intro, restrained particles. Reuses the shared blocks with the font
 * tokens overridden to a geometric sans for a modern feel.
 */
export function MinimalModernTemplate({
  content,
  theme,
  motif,
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
  // Override display/body fonts to the sans for descendants; keep script accents.
  const sansOverride = {
    "--f-display": "var(--font-jost)",
    "--f-body": "var(--font-jost)",
  } as CSSProperties;

  return (
    <PreviewContext.Provider value={{ compact, editing }}>
    <ThemeProvider
      theme={theme}
      className={`relative overflow-x-hidden ${snap ? "h-svh snap-y snap-mandatory overflow-y-auto" : "min-h-screen"}`}
    >
      <div style={sansOverride}>
        {snap ? null : <SmoothScroll />}
        <ParticleField type={theme.particles.type} color={theme.particles.color} count={6} />

        <main>
          <FrameBg id="frame-couple" src={backgroundFor(theme, "hero")}>
            <HeroMinimal content={content} />
            <FrameBg fullScreen>
              <Countdown
                targetDate={content.countdown.targetDate}
                headline={content.countdown.headline}
                subtext={content.countdown.subtext}
              />
            </FrameBg>
          </FrameBg>
          <FrameBg id="frame-families" src={backgroundFor(theme, "families")} fullScreen><Families content={content} /></FrameBg>
          <FrameBg id="frame-story" src={backgroundFor(theme, "story")} fullScreen><StoryGrid content={content} /></FrameBg>
          <TimelineSchedule content={content} motif={motif} bg={backgroundFor(theme, "schedule")} />
          <FrameBg id="frame-rsvp" src={backgroundFor(theme, "rsvp")} fullScreen><RSVPForm content={content} live={live} /></FrameBg>

          <footer className="flex min-h-svh snap-start flex-col items-center justify-center px-6 py-16 text-center">
            <p
              className="text-2xl"
              style={{ fontFamily: "var(--font-jost)", fontWeight: 300, color: "var(--c-primary)" }}
            >
              {content.couple.partner1.name} &amp; {content.couple.partner2.name}
            </p>
            <Divider className="my-5" width={70} />
            <p
              className="text-[10px] uppercase tracking-[0.3em]"
              style={{ fontFamily: "var(--font-jost)", color: "var(--c-muted)" }}
            >
              With love
            </p>
          </footer>
        </main>

        <MusicToggle trackUrl={content.music.trackUrl} />
      </div>
    </ThemeProvider>
    </PreviewContext.Provider>
  );
}
