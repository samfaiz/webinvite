"use client";

import { motion } from "framer-motion";
import type { EventItem, InvitationContent, MotifPack } from "@/engine/types";
import { Divider } from "@/components/Ornaments";
import { Reveal } from "@/components/Reveal";
import { FrameBg } from "@/components/FrameBg";
import { DirectionsLink } from "@/components/DirectionsLink";
import { targetFromEvent } from "@/lib/maps";

function EventCard({ event, motif }: { event: EventItem; motif: MotifPack }) {
  const icon = (event.icon && motif.icons[event.icon]) || motif.icons.heart || "♥";
  return (
    <Reveal>
      <motion.article
        whileHover={{ y: -6 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="relative mx-auto w-full max-w-md rounded-sm px-8 py-9 text-center"
        style={{
          // frosted glass so the background art shows through
          background: "color-mix(in srgb, var(--c-surface) 52%, transparent)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          boxShadow: "0 16px 38px rgba(40,50,80,0.16)",
          border: "1px solid rgba(255,255,255,0.45)",
          outline: "1px solid color-mix(in srgb, var(--c-accent) 40%, transparent)",
          outlineOffset: -10,
        }}
      >
        <p className="font-display text-xs uppercase tracking-[0.22em]" style={{ color: "var(--c-primary)" }}>
          {event.date}
        </p>
        <div className="my-4 text-3xl" style={{ color: "var(--c-accent)" }} aria-hidden>
          {icon}
        </div>
        <h3 className="font-script text-4xl" style={{ color: "var(--c-primary)" }}>
          {event.name}
        </h3>
        <Divider className="my-4" width={60} />
        <p className="font-display text-sm tracking-[0.12em]" style={{ color: "var(--c-text)" }}>
          {event.time}
        </p>
        <p className="font-display mt-3 text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--c-accent)" }}>
          Venue
        </p>
        <p className="font-body text-base" style={{ color: "var(--c-text)" }}>
          {event.venue}
        </p>
        {event.address ? (
          <p className="font-body text-sm" style={{ color: "var(--c-muted)" }}>
            {event.address}
          </p>
        ) : null}

        {event.verse ? (
          <div className="mt-5">
            <p className="font-body text-sm italic" style={{ color: "var(--c-secondary)" }}>
              “{event.verse}”
            </p>
            {event.verseRef ? (
              <p className="font-display mt-1 text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--c-muted)" }}>
                {event.verseRef}
              </p>
            ) : null}
          </div>
        ) : null}

        {event.venue || event.mapUrl ? (
          <DirectionsLink
            target={targetFromEvent(event)}
            className="font-display mt-5 inline-block text-[11px] uppercase tracking-[0.18em] underline-offset-4 hover:underline"
            style={{ color: "var(--c-secondary)" }}
          >
            ♥ Get Directions
          </DirectionsLink>
        ) : null}
      </motion.article>
    </Reveal>
  );
}

/** Each event is its own full-screen (phone) slide; the section background covers
 *  the screen and the event card sits centered over it. */
export function Schedule({
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
      {events.map((event, i) => (
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
            <EventCard event={event} motif={motif} />
          </section>
        </FrameBg>
      ))}
    </>
  );
}
