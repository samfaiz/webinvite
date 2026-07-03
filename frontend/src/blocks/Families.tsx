"use client";

import type { InvitationContent, Person } from "@/engine/types";
import { MonogramCrest, Divider } from "@/components/Ornaments";
import { Reveal } from "@/components/Reveal";
import { Movable } from "@/components/Movable";

function FamilyColumn({
  person,
  align,
  basePath,
}: {
  person: Person;
  align: "left" | "right";
  basePath: string;
}) {
  return (
    <div className={`flex-1 ${align === "left" ? "sm:text-right" : "sm:text-left"} text-center`}>
      <h3 data-edit={`${basePath}.name`} className="font-script text-4xl" style={{ color: "var(--c-primary)" }}>
        {person.name}
      </h3>
      {person.father || person.mother ? (
        <p
          data-edit={`${basePath}.parentsPrefix`}
          className="mt-2 text-sm"
          style={{ color: "var(--c-muted)" }}
        >
          {person.parentsPrefix ?? "S/D of"}
        </p>
      ) : null}
      <p className="font-display text-xs uppercase tracking-[0.16em]" style={{ color: "var(--c-secondary)" }}>
        {[person.father, person.mother].filter(Boolean).join(" & ")}
      </p>
      {person.siblings?.length ? (
        <p className="font-body mt-3 text-sm italic" style={{ color: "var(--c-text)" }}>
          with {person.siblings.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

export function Families({ content }: { content: InvitationContent }) {
  const { families, couple } = content;
  return (
    <section className="px-5 py-16 text-center">
      {/* frosted vellum panel keeps the text legible over busy background art */}
      <Movable moveKey="families.block" offset={content.offsets?.["families.block"]} className="mx-auto max-w-2xl">
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
          {families.subheading ? (
            <p
              data-edit="families.subheading"
              className="font-display text-[11px] uppercase tracking-[0.3em]"
              style={{ color: "var(--c-accent)" }}
            >
              {families.subheading}
            </p>
          ) : null}
          <h2
            data-edit="families.heading"
            className="font-display mt-3 text-2xl uppercase tracking-[0.12em] sm:text-3xl"
            style={{ color: "var(--c-primary)" }}
          >
            {families.heading}
          </h2>
          <Divider className="my-7" width={90} />
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 sm:flex-row sm:items-start sm:gap-4">
            <FamilyColumn person={couple.partner1} align="left" basePath="couple.partner1" />
            <div className="flex shrink-0 items-center justify-center px-2">
              <MonogramCrest monogram={couple.monogram} logo={couple.logo} scale={couple.logoScale} size={84} />
            </div>
            <FamilyColumn person={couple.partner2} align="right" basePath="couple.partner2" />
          </div>
        </Reveal>

        {families.footer ? (
          <Reveal delay={0.2}>
            <p
              data-edit="families.footer"
              className="font-body mx-auto mt-10 max-w-md text-lg italic"
              style={{ color: "var(--c-secondary)" }}
            >
              {families.footer}
            </p>
          </Reveal>
        ) : null}
      </div>
      </Movable>
    </section>
  );
}
