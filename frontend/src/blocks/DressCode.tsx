"use client";

import type { InvitationContent } from "@/engine/types";
import { Divider } from "@/components/Ornaments";
import { Reveal } from "@/components/Reveal";
import { Movable } from "@/components/Movable";

/**
 * What the couple would like guests to wear.
 *
 * Every part is optional and renders only when filled, so the card is a line
 * of guidance at its simplest and a full wardrobe note at its fullest —
 * attire label, a word for her and for him, the palette, and the colours to
 * please stay away from. Invitations that predate the section show nothing.
 */

/** True when there is anything worth giving a screen to. */
export function hasDressCode(content: InvitationContent): boolean {
  const d = content.dressCode;
  // a couple who only set per-event attire still wants the screen
  if (content.schedule?.events?.some((e) => e.attire?.trim())) return true;
  if (!d) return false;
  return Boolean(
    d.note?.trim() ||
      d.attire?.trim() ||
      d.her?.trim() ||
      d.him?.trim() ||
      d.avoid?.trim() ||
      d.link?.trim() ||
      d.swatches?.length,
  );
}

export function DressCode({ content }: { content: InvitationContent }) {
  const d = content.dressCode;
  if (!hasDressCode(content)) return null;

  const swatches = d?.swatches?.filter((s) => s?.hex) ?? [];
  const square = d?.swatchShape === "square";
  const forHer = d?.her?.trim();
  const forHim = d?.him?.trim();
  const perEvent = (content.schedule?.events ?? []).filter((e) => e.attire?.trim());

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

            {d?.attire?.trim() ? (
              <span
                data-edit="dressCode.attire"
                className="font-display mt-3 inline-block rounded-full px-4 py-1.5 text-[10px] uppercase tracking-[0.22em]"
                style={{
                  color: "var(--c-accent)",
                  border: "1px solid color-mix(in srgb, var(--c-accent) 45%, transparent)",
                }}
              >
                {d.attire}
              </span>
            ) : null}

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

          {forHer || forHim ? (
            <Reveal delay={0.06}>
              {/* side by side when both are set, full width when only one is */}
              <div
                className={`mt-7 grid gap-5 text-left sm:gap-7 ${
                  forHer && forHim ? "grid-cols-2" : "grid-cols-1 text-center"
                }`}
              >
                {forHer ? <Guidance label="For her" text={forHer} path="dressCode.her" photo={d?.herPhoto} /> : null}
                {forHim ? <Guidance label="For him" text={forHim} path="dressCode.him" photo={d?.himPhoto} /> : null}
              </div>
            </Reveal>
          ) : null}

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
                      className={`block w-full ${square ? "rounded-lg" : "rounded-full"}`}
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

          {d?.avoid?.trim() ? (
            <Reveal delay={0.12}>
              <p
                data-edit="dressCode.avoid"
                className="font-body mx-auto mt-6 max-w-[36ch] text-sm italic"
                style={{ color: "var(--c-muted)" }}
              >
                Kindly avoid {d.avoid}
              </p>
            </Reveal>
          ) : null}

          {perEvent.length ? (
            <Reveal delay={0.12}>
              {/* a mehndi and a reception rarely ask for the same thing, so
                  each event can carry its own line */}
              <div
                className="mt-8 border-t pt-5 text-left"
                style={{ borderColor: "color-mix(in srgb, var(--c-accent) 25%, transparent)" }}
              >
                {perEvent.map((e) => (
                  <div key={e.id} className="flex items-baseline justify-between gap-4 py-1.5">
                    <span
                      className="font-display text-[11px] uppercase tracking-[0.16em]"
                      style={{ color: "var(--c-secondary)" }}
                    >
                      {e.name}
                    </span>
                    <span
                      className="font-body text-right text-[14px]"
                      style={{ color: "var(--c-text)" }}
                    >
                      {e.attire}
                    </span>
                  </div>
                ))}
              </div>
            </Reveal>
          ) : null}

          {d?.link?.trim() ? (
            <Reveal delay={0.16}>
              <a
                href={d.link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-display mt-7 inline-block rounded-full px-5 py-2.5 text-[10px] uppercase tracking-[0.2em]"
                style={{
                  color: "var(--c-primary)",
                  border: "1px solid color-mix(in srgb, var(--c-primary) 35%, transparent)",
                }}
              >
                {d.linkLabel?.trim() || "See the lookbook"}
              </a>
            </Reveal>
          ) : null}

        </div>
      </Movable>
    </section>
  );
}

/** "FOR HER — a saree or lehenga in the colours below.", with an optional
 *  reference photo above it. */
function Guidance({
  label,
  text,
  path,
  photo,
}: {
  label: string;
  text: string;
  path: string;
  photo?: string;
}) {
  return (
    <div>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt=""
          className="mb-2.5 w-full rounded-xl object-cover"
          style={{
            aspectRatio: "3 / 4",
            border: "1px solid color-mix(in srgb, var(--c-accent) 30%, transparent)",
          }}
        />
      ) : null}
      <p
        className="font-display text-[10px] uppercase tracking-[0.2em]"
        style={{ color: "var(--c-accent)" }}
      >
        {label}
      </p>
      <p
        data-edit={path}
        className="font-body mt-1.5 text-[15px] leading-relaxed"
        style={{ color: "var(--c-text)" }}
      >
        {text}
      </p>
    </div>
  );
}
