"use client";

import type { InvitationContent } from "@/engine/types";
import { Divider } from "@/components/Ornaments";
import { Reveal } from "@/components/Reveal";
import { Movable } from "@/components/Movable";

/**
 * What the couple would like guests to wear — a line of guidance ("Modest and
 * elegant") and, optionally, the palette they have in mind.
 *
 * The whole section is optional and renders nothing until the couple has
 * written something, so invitations that predate it are unaffected.
 */

/** True when there is anything worth giving a screen to. */
export function hasDressCode(content: InvitationContent): boolean {
  const d = content.dressCode;
  return Boolean(d && (d.note?.trim() || d.swatches?.length));
}

export function DressCode({ content }: { content: InvitationContent }) {
  const d = content.dressCode;
  if (!hasDressCode(content)) return null;

  const swatches = d?.swatches?.filter((s) => s?.hex) ?? [];

  return (
    <section className="px-5 py-16 text-center">
      <Movable
        moveKey="dresscode.block"
        offset={content.offsets?.["dresscode.block"]}
        className="mx-auto max-w-xl"
      >
        {/* same frosted vellum as the families panel: these sections sit over
            whatever background art the design carries, which can be dark */}
        <div
          className="rounded-[2rem] px-6 py-10 sm:px-9"
          style={{
            background: "color-mix(in srgb, var(--c-surface) 62%, transparent)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            boxShadow: "0 16px 44px rgba(40,50,80,0.16)",
            border: "1px solid rgba(255,255,255,0.5)",
          }}
        >
          <Reveal>
            <h2
              data-edit="dressCode.heading"
              className="font-display text-2xl uppercase tracking-[0.18em] sm:text-3xl"
              style={{ color: "var(--c-primary)" }}
            >
              {d?.heading?.trim() || "Dress Code"}
            </h2>
            <Divider className="my-4" width={70} />
            {d?.note?.trim() ? (
              <p
                data-edit="dressCode.note"
                className="font-body mx-auto max-w-[34ch] text-base leading-relaxed"
                style={{ color: "var(--c-text)" }}
              >
                {d.note}
              </p>
            ) : null}
          </Reveal>

          {swatches.length ? (
            <Reveal delay={0.1}>
              {/* one column per colour, so three chips centre as a trio and
                  five still fit a phone — a fixed width wrapped 3 + 1 */}
              <div
                className="mt-8 grid items-start justify-items-center gap-3 sm:gap-5"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(swatches.length, 5)}, minmax(0, 1fr))`,
                }}
              >
                {swatches.map((s, i) => (
                  <div
                    key={`${s.hex}-${i}`}
                    className="flex w-full max-w-[72px] flex-col items-center sm:max-w-[84px]"
                  >
                    <span
                      className="block w-full rounded-full"
                      style={{
                        aspectRatio: "1 / 1",
                        background: s.hex,
                        border: "1px solid color-mix(in srgb, var(--c-accent) 45%, transparent)",
                        boxShadow: "0 4px 12px rgba(40,50,80,0.12)",
                      }}
                    />
                    {s.label?.trim() ? (
                      <span
                        className="font-display mt-2 text-[10px] uppercase tracking-[0.16em]"
                        style={{ color: "var(--c-muted)" }}
                      >
                        {s.label}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </Reveal>
          ) : null}
        </div>
      </Movable>
    </section>
  );
}
