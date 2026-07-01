"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { InvitationContent } from "@/engine/types";
import { MonogramCrest } from "@/components/Ornaments";
import { Reveal } from "@/components/Reveal";
import { VenueMap } from "./VenueMap";
import { ArchedCard } from "@/components/ArchedCard";
import { DirectionsLink } from "@/components/DirectionsLink";
import { hasMapTarget } from "@/lib/maps";
import { api } from "@/lib/api";

/**
 * RSVP card + venue map. When `live` (rendered on a published public page) it
 * POSTs to the backend; otherwise (demo / Studio preview) it just shows the
 * thank-you state without sending anything.
 */
export function RSVPForm({
  content,
  live = false,
}: {
  content: InvitationContent;
  live?: boolean;
}) {
  const { rsvp, couple, map } = content;
  const [name, setName] = useState("");
  const [attending, setAttending] = useState<"accept" | "decline" | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Please enter your name.");
    if (!attending) return setError("Please let us know if you can make it.");
    setError("");

    if (live && content.meta?.slug) {
      setBusy(true);
      try {
        await api.createRsvp(content.meta.slug, {
          guestName: name.trim(),
          attending,
        });
        setSubmitted(true);
      } catch (err) {
        setError((err as Error).message || "Could not send RSVP. Please try again.");
      } finally {
        setBusy(false);
      }
      return;
    }

    // demo / preview: no backend call
    setSubmitted(true);
  };

  return (
    <section className="px-6 py-20">
      <Reveal>
        <ArchedCard>
          <div className="flex flex-col items-center">
            <MonogramCrest monogram={couple.monogram} size={70} />
            <h2
              className="font-display mt-3 text-xl uppercase tracking-[0.3em]"
              style={{ color: "var(--c-primary)" }}
            >
              {rsvp.heading}
            </h2>
          </div>

          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="thanks"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 text-center"
              >
                <p className="font-script text-4xl" style={{ color: "var(--c-secondary)" }}>
                  Thank you!
                </p>
                <p className="font-body mt-2 text-base" style={{ color: "var(--c-text)" }}>
                  {attending === "accept"
                    ? "We can't wait to celebrate with you."
                    : "We'll miss you, but thank you for letting us know."}
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={submit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-7"
              >
                <label
                  className="font-display text-[11px] uppercase tracking-[0.18em]"
                  style={{ color: "var(--c-muted)" }}
                >
                  Full Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="font-body mt-1 mb-5 w-full rounded-lg px-4 py-3 text-base outline-none"
                  style={{
                    background: "color-mix(in srgb, var(--c-grad-from) 40%, white)",
                    border: "1px solid color-mix(in srgb, var(--c-accent) 30%, transparent)",
                    color: "var(--c-text)",
                  }}
                />

                <p
                  className="font-display text-[11px] uppercase tracking-[0.18em]"
                  style={{ color: "var(--c-muted)" }}
                >
                  {rsvp.prompt}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {(
                    [
                      ["accept", rsvp.acceptLabel],
                      ["decline", rsvp.declineLabel],
                    ] as const
                  ).map(([val, label]) => {
                    const active = attending === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAttending(val)}
                        className="font-body rounded-lg px-3 py-3 text-sm transition-all"
                        style={{
                          background: active ? "var(--c-primary)" : "transparent",
                          color: active ? "#fff" : "var(--c-text)",
                          border: `1px solid ${active ? "var(--c-primary)" : "color-mix(in srgb, var(--c-accent) 35%, transparent)"}`,
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {error ? (
                  <p className="mt-3 text-center text-sm" style={{ color: "#b3261e" }}>
                    {error}
                  </p>
                ) : null}

                <motion.button
                  type="submit"
                  disabled={busy}
                  whileHover={{ scale: busy ? 1 : 1.02 }}
                  whileTap={{ scale: busy ? 1 : 0.98 }}
                  className="font-display mt-6 w-full rounded-lg py-3 text-sm uppercase tracking-[0.2em] disabled:opacity-70"
                  style={{ background: "var(--c-primary)", color: "#fff" }}
                >
                  ✦ {busy ? "Sending…" : rsvp.submitLabel}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-8">
            <VenueMap content={content} />
          </div>
        </ArchedCard>
      </Reveal>

      {rsvp.footer ? (
        <Reveal delay={0.1}>
          <p
            className="font-script mt-10 text-center text-3xl"
            style={{ color: "var(--c-secondary)" }}
          >
            {rsvp.footer}
          </p>
        </Reveal>
      ) : null}

      {(() => {
        const first = map.points?.[0];
        const target = {
          query: first ? [first.label, first.address].filter(Boolean).join(", ") : undefined,
          url: map.directionsUrl,
        };
        if (!hasMapTarget(target)) return null;
        return (
          <div className="mt-6 text-center">
            <DirectionsLink
              target={target}
              className="font-display inline-block rounded-full px-7 py-3 text-[11px] uppercase tracking-[0.2em]"
              style={{
                color: "var(--c-secondary)",
                border: "1px solid color-mix(in srgb, var(--c-accent) 40%, transparent)",
              }}
            >
              ♥ {map.directionsLabel ?? "Get Directions"}
            </DirectionsLink>
          </div>
        );
      })()}
    </section>
  );
}
