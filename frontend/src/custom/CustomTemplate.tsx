"use client";

import type { CSSProperties, ReactNode } from "react";
import type { CustomSection, RenderProps } from "@/engine/types";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PreviewContext } from "@/components/PreviewContext";
import { MusicToggle } from "@/components/MusicToggle";
import { StyleOverrides } from "@/components/StyleOverrides";
import { TextOffsets } from "@/templates/TextOffsets";
import { SectionBody, cardBox } from "./sections";
import { cleanVenues } from "@/blocks/VenueMap";

/** Full-screen section wrapper: applies the section's own background (colour,
 *  gradient or image + tint) and style overrides (fonts/colours as CSS vars that
 *  cascade to the section body). */
function SectionFrame({ section, children }: { section: CustomSection; children: ReactNode }) {
  const bg = section.background ?? {};
  const st = section.style ?? {};

  const frame: CSSProperties = {};
  if (bg.color) frame.background = bg.color;
  else if (bg.gradientFrom && bg.gradientTo) frame.backgroundImage = `linear-gradient(160deg, ${bg.gradientFrom}, ${bg.gradientTo})`;
  if (st.align) frame.textAlign = st.align;

  const vars = frame as Record<string, string | undefined>;
  if (st.textColor) {
    vars["--c-primary"] = st.textColor;
    vars["--c-text"] = st.textColor;
  }
  if (st.accentColor) {
    vars["--c-accent"] = st.accentColor;
    vars["--c-secondary"] = st.accentColor;
  }
  if (st.fontDisplay) vars["--f-display"] = st.fontDisplay;
  if (st.fontBody) vars["--f-body"] = st.fontBody;

  const tint = Math.min(90, Math.max(0, bg.tint ?? 0));

  // any section can opt into a frosted card panel around its content
  const card = st.card ? cardBox(section) : null;

  return (
    <section
      id={`sec-${section.id}`}
      className="relative flex min-h-svh snap-start flex-col items-center justify-center overflow-hidden px-6 py-16"
      style={frame}
    >
      {bg.image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bg.image} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
          {tint ? <div aria-hidden className="absolute inset-0" style={{ background: `rgba(0,0,0,${tint / 100})` }} /> : null}
        </>
      ) : null}
      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center">
        {card ? (
          <div className={card.className} style={card.style}>{children}</div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

/** Full-screen opening video (plays first; guests scroll down to the invitation). */
function IntroVideo({ src }: { src: string }) {
  return (
    <section className="relative flex min-h-svh snap-start items-center justify-center overflow-hidden bg-black">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video src={src} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute bottom-8 z-10 animate-bounce text-3xl text-white/85" aria-hidden>↓</div>
    </section>
  );
}

/**
 * Section-first ("design from scratch") template. Renders the couple's composed
 * `content.customSections` — each with its own layout variant, background and
 * style — over the global theme. Used when templateId === "custom".
 */
export function CustomTemplate({
  content,
  theme,
  live = false,
  snap = false,
  compact = false,
  editing = false,
}: RenderProps & { intro?: boolean; live?: boolean; snap?: boolean; compact?: boolean; editing?: boolean }) {
  const sections = content.customSections ?? [];
  const slug = content.meta?.slug;

  return (
    <PreviewContext.Provider value={{ compact, editing }}>
      <ThemeProvider
        theme={theme}
        className={`relative overflow-x-hidden ${snap ? "h-svh snap-y snap-mandatory overflow-y-auto" : "min-h-screen"}`}
      >
        <StyleOverrides content={content} />
        <TextOffsets offsets={content.offsets} />
        <main>
          {content.envelope?.videoUrl ? <IntroVideo src={content.envelope.videoUrl} /> : null}
          {sections.length === 0 ? (
            <div className="flex min-h-svh flex-col items-center justify-center px-6 text-center text-sm" style={{ color: "var(--c-muted)" }}>
              <p>Your invitation is empty.</p>
              <p className="mt-1">Add sections from the panel to start designing.</p>
            </div>
          ) : null}
          {sections.map((s, i) => (
            <SectionFrame key={s.id} section={s}>
              <SectionBody
                section={s}
                path={`customSections.${i}`}
                live={live}
                editing={editing}
                slug={slug}
                offsets={content.offsets}
                venues={cleanVenues(content.venues)}
                coupleNames={
                  content.couple?.partner1?.name && content.couple?.partner2?.name
                    ? `${content.couple.partner1.name} & ${content.couple.partner2.name}`
                    : undefined
                }
              />
            </SectionFrame>
          ))}
        </main>
        <MusicToggle trackUrl={content.music?.trackUrl} />
      </ThemeProvider>
    </PreviewContext.Provider>
  );
}
