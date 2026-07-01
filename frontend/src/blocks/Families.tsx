"use client";

import type { InvitationContent, Person } from "@/engine/types";
import { MonogramCrest, Divider } from "@/components/Ornaments";
import { Reveal } from "@/components/Reveal";

function FamilyColumn({ person, align }: { person: Person; align: "left" | "right" }) {
  return (
    <div className={`flex-1 ${align === "left" ? "sm:text-right" : "sm:text-left"} text-center`}>
      <h3 className="font-script text-4xl" style={{ color: "var(--c-primary)" }}>
        {person.name}
      </h3>
      <p className="mt-2 text-sm" style={{ color: "var(--c-muted)" }}>
        {person.father ? "S/D of" : null}
      </p>
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
    <section className="px-6 py-20 text-center">
      <Reveal>
        {families.subheading ? (
          <p
            className="font-display text-[11px] uppercase tracking-[0.3em]"
            style={{ color: "var(--c-accent)" }}
          >
            {families.subheading}
          </p>
        ) : null}
        <h2
          className="font-display mt-3 text-2xl uppercase tracking-[0.12em] sm:text-3xl"
          style={{ color: "var(--c-primary)" }}
        >
          {families.heading}
        </h2>
        <Divider className="my-7" width={90} />
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 sm:flex-row sm:items-start sm:gap-4">
          <FamilyColumn person={couple.partner1} align="left" />
          <div className="flex shrink-0 items-center justify-center px-2">
            <MonogramCrest monogram={couple.monogram} size={84} />
          </div>
          <FamilyColumn person={couple.partner2} align="right" />
        </div>
      </Reveal>

      {families.footer ? (
        <Reveal delay={0.2}>
          <p
            className="font-body mx-auto mt-12 max-w-md text-lg italic"
            style={{ color: "var(--c-secondary)" }}
          >
            {families.footer}
          </p>
        </Reveal>
      ) : null}
    </section>
  );
}
