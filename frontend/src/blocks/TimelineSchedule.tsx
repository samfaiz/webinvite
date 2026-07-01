"use client";

import type { InvitationContent, MotifPack } from "@/engine/types";
import { Divider } from "@/components/Ornaments";
import { Reveal } from "@/components/Reveal";
import { FrameBg } from "@/components/FrameBg";
import { DirectionsLink } from "@/components/DirectionsLink";
import { targetFromEvent } from "@/lib/maps";

/** Each event is its own full-screen slide (alternative styling to Schedule). */
export function TimelineSchedule({
  content,
  motif,
  bg,
}: {
  content: InvitationContent;
  motif: MotifPack;
  bg?: string;
}) {
  const events = content.schedule.events;
  if (!events.length) return null;

  return (
    <>
      {events.map((event, i) => {
        const icon = (event.icon && motif.icons[event.icon]) || motif.icons.heart || "♥";
        return (
          <FrameBg key={event.id} id={i === 0 ? "frame-schedule" : undefined} src={bg} fullScreen>
            <section className="px-6 py-14 text-center">
              {i === 0 ? (
                <Reveal>
                  <h2
                    className="font-display text-2xl uppercase tracking-[0.12em] sm:text-3xl"
                    style={{ color: "var(--c-primary)" }}
                  >
                    {content.schedule.heading}
                  </h2>
                  {content.schedule.subtext ? (
                    <p
                      className="font-display mt-3 text-[11px] uppercase tracking-[0.22em]"
                      style={{ color: "var(--c-accent)" }}
                    >
                      {content.schedule.subtext}
                    </p>
                  ) : null}
                  <Divider className="my-7" width={100} />
                </Reveal>
              ) : null}

              <Reveal>
                <div
                  className="mx-auto w-full max-w-md rounded-xl px-8 py-9"
                  style={{
                    background: "color-mix(in srgb, var(--c-surface) 50%, transparent)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    boxShadow: "0 16px 38px rgba(40,50,80,0.16)",
                    border: "1px solid rgba(255,255,255,0.45)",
                  }}
                >
                  <div className="text-3xl" style={{ color: "var(--c-accent)" }} aria-hidden>
                    {icon}
                  </div>
                  <h3 className="font-script text-4xl" style={{ color: "var(--c-primary)" }}>
                    {event.name}
                  </h3>
                  <p
                    className="font-display mt-2 text-[11px] uppercase tracking-[0.16em]"
                    style={{ color: "var(--c-secondary)" }}
                  >
                    {event.date} · {event.time}
                  </p>
                  <Divider className="my-4" width={60} />
                  <p className="font-body text-base" style={{ color: "var(--c-text)" }}>
                    {event.venue}
                  </p>
                  {event.address ? (
                    <p className="font-body text-sm" style={{ color: "var(--c-muted)" }}>
                      {event.address}
                    </p>
                  ) : null}
                  {event.verse ? (
                    <p className="font-body mt-3 text-sm italic" style={{ color: "var(--c-secondary)" }}>
                      “{event.verse}” {event.verseRef ? `— ${event.verseRef}` : ""}
                    </p>
                  ) : null}
                  {event.venue || event.mapUrl ? (
                    <DirectionsLink
                      target={targetFromEvent(event)}
                      className="font-display mt-4 inline-block text-[10px] uppercase tracking-[0.16em] underline-offset-4 hover:underline"
                      style={{ color: "var(--c-secondary)" }}
                    >
                      ♥ Directions
                    </DirectionsLink>
                  ) : null}
                </div>
              </Reveal>
            </section>
          </FrameBg>
        );
      })}
    </>
  );
}
