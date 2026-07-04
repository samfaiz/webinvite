"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import type { CustomSection, MoveOffset } from "@/engine/types";
import { Countdown } from "@/blocks/Countdown";
import { VenueMap, type VenuePin } from "@/blocks/VenueMap";
import { Movable } from "@/components/Movable";
import { api } from "@/lib/api";

/* Renderers for each composable section type. Each switches on `section.variant`.
 * Every editable line is wrapped in <Editable> — which is both `data-edit`
 * (click to edit inline) AND its own `data-move` handle (drag it up/down
 * independently). The move key is `sec.<sectionId>.<field>` so it's stable when
 * sections are reordered. */

type Props = {
  section: CustomSection;
  path: string;
  live?: boolean;
  editing?: boolean;
  slug?: string;
  offsets?: Record<string, MoveOffset>;
  /** manual map locations (invitation-level), shown under the RSVP section */
  venues?: VenuePin[];
  /** "Partner1 & Partner2" — for the RSVP updates-consent label */
  coupleNames?: string;
};

const get = (c: Record<string, unknown>, k: string, d = "") => (typeof c[k] === "string" ? (c[k] as string) : d);

/** One independently draggable + editable text element. */
function Editable({
  sec, offsets, path, k, value, tag = "div", className, style,
}: {
  sec: CustomSection;
  offsets?: Record<string, MoveOffset>;
  path: string;
  k: string;
  value: string;
  tag?: "div" | "h1" | "h2" | "h3" | "p" | "cite";
  className?: string;
  style?: CSSProperties;
}) {
  const moveKey = `sec.${sec.id}.${k}`;
  const Tag = tag as React.ElementType;
  return (
    <Movable moveKey={moveKey} offset={offsets?.[moveKey]} className="w-full">
      <Tag data-edit={`${path}.content.${k}`} className={className} style={style}>
        {value}
      </Tag>
    </Movable>
  );
}

function Wrap({ align, children, className, style }: { align?: string; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div
      className={`flex w-full flex-col ${align === "left" ? "items-start text-left" : align === "right" ? "items-end text-right" : "items-center text-center"} ${className ?? ""}`}
      style={style}
    >
      {children}
    </div>
  );
}

/** The frosted-card panel any section can opt into (style.card = true). Respects
 *  the section's Card width / height / colour / transparency / blur settings.
 *  Wrapped around a whole section's body by CustomTemplate's SectionFrame. */
export function cardBox(s: CustomSection): { className: string; style: CSSProperties } {
  const st = s.style ?? {};
  const style: CSSProperties = { maxWidth: st.cardWidth ?? 460 };
  const h = st.cardHeight ?? 0;
  if (h > 0) {
    // min-height (never a hard height) so taller content is never clipped;
    // centre the content vertically within the taller card.
    style.minHeight = h;
    style.display = "flex";
    style.flexDirection = "column";
    style.justifyContent = "center";
    style.alignItems = "center";
  }
  const fill = st.cardColor || "var(--c-surface)";
  const opacity = Math.min(100, Math.max(0, st.cardOpacity ?? 100));
  // color-mix lets any colour (hex or CSS var) carry an alpha so the section
  // background shows through the card at the chosen opacity.
  style.background = `color-mix(in srgb, ${fill} ${opacity}%, transparent)`;
  style.borderColor = "color-mix(in srgb, var(--c-accent) 25%, transparent)";
  const blur = Math.min(40, Math.max(0, st.cardBlur ?? 0));
  if (blur) {
    style.backdropFilter = `blur(${blur}px)`;
    style.WebkitBackdropFilter = `blur(${blur}px)`;
  }
  return { className: "mx-auto w-full rounded-3xl border p-8 shadow-xl sm:p-10", style };
}

/* -------------------------------- cover -------------------------------- */
function Cover(p: Props) {
  const { section: s, path, offsets } = p;
  const c = s.content;
  const v = s.variant;
  const framed = v === "framed";
  return (
    <Wrap align={v === "split" ? "left" : "center"} className={framed ? "border border-[color:var(--c-accent)] p-8 sm:p-12" : ""}>
      {get(c, "eyebrow") ? <Editable sec={s} offsets={offsets} path={path} k="eyebrow" value={get(c, "eyebrow")} tag="p" className="font-display text-xs uppercase tracking-[0.34em]" style={{ color: "var(--c-accent)" }} /> : null}
      <Editable sec={s} offsets={offsets} path={path} k="title" value={get(c, "title", "Your Names")} tag="h1" className="font-script mt-4 text-5xl leading-tight sm:text-7xl" style={{ color: "var(--c-primary)" }} />
      {get(c, "tagline") ? <Editable sec={s} offsets={offsets} path={path} k="tagline" value={get(c, "tagline")} tag="p" className="font-display mt-4 text-sm uppercase tracking-[0.28em]" style={{ color: "var(--c-secondary)" }} /> : null}
      {v !== "minimal" ? <div className="mx-auto my-6 h-px w-24" style={{ background: "var(--c-accent)" }} /> : <div className="h-6" />}
      {get(c, "date") ? <Editable sec={s} offsets={offsets} path={path} k="date" value={get(c, "date")} tag="p" className="font-display text-lg tracking-wide" style={{ color: "var(--c-primary)" }} /> : null}
      {get(c, "location") ? <Editable sec={s} offsets={offsets} path={path} k="location" value={get(c, "location")} tag="p" className="mt-1 text-sm" style={{ color: "var(--c-muted)" }} /> : null}
    </Wrap>
  );
}

/* -------------------------------- names -------------------------------- */
function Names(p: Props) {
  const { section: s, path, offsets } = p;
  const c = s.content;
  return (
    <Wrap align="center">
      {s.variant === "monogram" ? (
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full border-2" style={{ borderColor: "var(--c-accent)", color: "var(--c-primary)" }} aria-hidden>
          <span className="font-display text-lg">{get(c, "name1", "N")[0]}&nbsp;{get(c, "name2", "N")[0]}</span>
        </div>
      ) : null}
      <Editable sec={s} offsets={offsets} path={path} k="name1" value={get(c, "name1", "Name One")} tag="h2" className="font-script text-5xl sm:text-7xl" style={{ color: "var(--c-primary)" }} />
      <Editable sec={s} offsets={offsets} path={path} k="connector" value={get(c, "connector", "&")} tag="p" className="font-display my-3 text-sm uppercase tracking-[0.3em]" style={{ color: "var(--c-accent)" }} />
      <Editable sec={s} offsets={offsets} path={path} k="name2" value={get(c, "name2", "Name Two")} tag="h2" className="font-script text-5xl sm:text-7xl" style={{ color: "var(--c-primary)" }} />
      {get(c, "sub") ? <Editable sec={s} offsets={offsets} path={path} k="sub" value={get(c, "sub")} tag="p" className="mt-4 text-sm uppercase tracking-[0.3em]" style={{ color: "var(--c-secondary)" }} /> : null}
    </Wrap>
  );
}

/* ------------------------------- families ------------------------------ */
function Families(p: Props) {
  const { section: s, path, offsets } = p;
  const c = s.content;
  const v = s.variant;

  const person = (nk: string, rk: string, pk: string) => (
    <div className="w-full">
      <Editable sec={s} offsets={offsets} path={path} k={nk} value={get(c, nk, "Name")} tag="h3" className="font-script text-4xl sm:text-5xl" style={{ color: "var(--c-primary)" }} />
      {get(c, rk) ? <Editable sec={s} offsets={offsets} path={path} k={rk} value={get(c, rk)} tag="p" className="mt-2 text-[11px] uppercase tracking-[0.22em]" style={{ color: "var(--c-secondary)" }} /> : null}
      {get(c, pk) ? <Editable sec={s} offsets={offsets} path={path} k={pk} value={get(c, pk)} tag="p" className="mt-1 text-sm" style={{ color: "var(--c-muted)" }} /> : null}
    </div>
  );

  const mono = (
    <div className="mx-auto my-6 grid h-20 w-20 place-items-center rounded-full border" style={{ borderColor: "var(--c-accent)", color: "var(--c-accent)" }} aria-hidden>
      <span className="font-display text-xl tracking-wide">{get(c, "monogram", "A B")}</span>
    </div>
  );

  const body =
    v === "columns" ? (
      <div className="flex w-full flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
        {person("name1", "relation1", "parents1")}
        <div className="shrink-0 self-center">{mono}</div>
        {person("name2", "relation2", "parents2")}
      </div>
    ) : (
      <>
        {person("name1", "relation1", "parents1")}
        {mono}
        {person("name2", "relation2", "parents2")}
      </>
    );

  return (
    <Wrap align="center">
      {get(c, "eyebrow") ? <Editable sec={s} offsets={offsets} path={path} k="eyebrow" value={get(c, "eyebrow")} tag="p" className="font-display text-xs uppercase tracking-[0.28em]" style={{ color: "var(--c-accent)" }} /> : null}
      <Editable sec={s} offsets={offsets} path={path} k="heading" value={get(c, "heading", "Introducing the Families")} tag="h2" className="font-display mt-2 text-2xl uppercase tracking-[0.14em] sm:text-3xl" style={{ color: "var(--c-primary)" }} />
      <div className="mx-auto my-5 h-px w-24" style={{ background: "var(--c-accent)" }} />
      <div className="w-full">
        {body}
        {get(c, "closingLine") ? <Editable sec={s} offsets={offsets} path={path} k="closingLine" value={get(c, "closingLine")} tag="p" className="mt-6 text-sm italic" style={{ color: "var(--c-secondary)" }} /> : null}
      </div>
    </Wrap>
  );
}

/* -------------------------------- quote -------------------------------- */
function Quote(p: Props) {
  const { section: s, path, offsets } = p;
  const c = s.content;
  const framed = s.variant === "framed";
  const side = s.variant === "side";
  return (
    <Wrap align={side ? "left" : "center"} className={`mx-auto max-w-2xl ${side ? "border-l-4 pl-6" : ""} ${framed ? "border-y py-8" : ""}`}>
      <Editable sec={s} offsets={offsets} path={path} k="text" value={get(c, "text")} tag="p" className="font-script text-3xl leading-snug sm:text-4xl" style={{ color: "var(--c-primary)" }} />
      {get(c, "cite") ? <Editable sec={s} offsets={offsets} path={path} k="cite" value={get(c, "cite")} tag="cite" className="mt-4 block text-sm not-italic" style={{ color: "var(--c-muted)" }} /> : null}
    </Wrap>
  );
}

/* ------------------------------ countdown ------------------------------ */
function CountdownSection(p: Props) {
  const { section: s, path, offsets } = p;
  const c = s.content;
  return (
    <Wrap align="center">
      <Editable sec={s} offsets={offsets} path={path} k="headline" value={get(c, "headline", "The countdown begins")} tag="p" className="font-display mb-6 text-sm uppercase tracking-[0.3em]" style={{ color: "var(--c-primary)" }} />
      <Countdown targetDate={get(c, "targetDate")} headline="" subtext={get(c, "subtext")} />
    </Wrap>
  );
}

/* -------------------------------- story -------------------------------- */
function Story(p: Props) {
  const { section: s, path, offsets } = p;
  const c = s.content;
  const items = (Array.isArray(c.items) ? c.items : []) as { photo?: string; caption?: string }[];
  const v = s.variant;
  return (
    <Wrap align="center">
      <Editable sec={s} offsets={offsets} path={path} k="heading" value={get(c, "heading", "Our Story")} tag="h2" className="font-display text-2xl uppercase tracking-[0.2em] sm:text-3xl" style={{ color: "var(--c-primary)" }} />
      {get(c, "subtext") ? <Editable sec={s} offsets={offsets} path={path} k="subtext" value={get(c, "subtext")} tag="p" className="mt-2 text-sm" style={{ color: "var(--c-muted)" }} /> : null}
      <div className={`mt-8 w-full ${v === "grid" ? "grid grid-cols-2 gap-3 sm:grid-cols-3" : v === "timeline" ? "space-y-6" : "flex snap-x snap-mandatory gap-4 overflow-x-auto"}`}>
        {items.map((it, i) => (
          <figure key={i} className={v === "carousel" ? "w-64 shrink-0 snap-center" : v === "timeline" ? "flex items-center gap-4 text-left" : ""}>
            {it.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.photo} alt={it.caption || ""} data-photo={`${path}.content.items.${i}.photo`} className={`${v === "timeline" ? "h-24 w-24 shrink-0" : "w-full"} rounded-xl object-cover`} />
            ) : (
              <div className={`${v === "timeline" ? "h-24 w-24 shrink-0" : "aspect-[4/5] w-full"} grid place-items-center rounded-xl border border-dashed`} style={{ borderColor: "var(--c-muted)", color: "var(--c-muted)" }}>photo</div>
            )}
            {it.caption ? <figcaption className="mt-2 text-sm" style={{ color: "var(--c-secondary)" }}>{it.caption}</figcaption> : null}
          </figure>
        ))}
      </div>
    </Wrap>
  );
}

/* ------------------------------- gallery ------------------------------- */
function Gallery(p: Props) {
  const { section: s, path, offsets } = p;
  const c = s.content;
  const images = (Array.isArray(c.images) ? c.images : []) as string[];
  const v = s.variant;
  return (
    <Wrap align="center">
      {get(c, "heading") ? <Editable sec={s} offsets={offsets} path={path} k="heading" value={get(c, "heading")} tag="h2" className="font-display mb-6 text-2xl uppercase tracking-[0.2em]" style={{ color: "var(--c-primary)" }} /> : null}
      <div className={`w-full ${v === "strip" ? "flex gap-3 overflow-x-auto" : v === "masonry" ? "columns-2 gap-3 sm:columns-3 [&>img]:mb-3" : "grid grid-cols-2 gap-3 sm:grid-cols-3"}`}>
        {images.length ? (
          images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" data-photo={`${path}.content.images.${i}`} className={`${v === "strip" ? "h-40 w-40 shrink-0" : "w-full"} rounded-xl object-cover`} />
          ))
        ) : (
          <p className="col-span-full text-sm" style={{ color: "var(--c-muted)" }}>Add images in the editor.</p>
        )}
      </div>
    </Wrap>
  );
}

/* ------------------------------- schedule ------------------------------ */
function Schedule(p: Props) {
  const { section: s, path, offsets } = p;
  const c = s.content;
  const events = (Array.isArray(c.events) ? c.events : []) as Record<string, string>[];
  const v = s.variant;
  return (
    <Wrap align="center">
      <Editable sec={s} offsets={offsets} path={path} k="heading" value={get(c, "heading", "Schedule")} tag="h2" className="font-display text-2xl uppercase tracking-[0.2em] sm:text-3xl" style={{ color: "var(--c-primary)" }} />
      {get(c, "subtext") ? <Editable sec={s} offsets={offsets} path={path} k="subtext" value={get(c, "subtext")} tag="p" className="mt-2 text-sm" style={{ color: "var(--c-muted)" }} /> : null}
      <div className={`mx-auto mt-8 w-full max-w-xl ${v === "cards" ? "grid gap-4 sm:grid-cols-2" : "space-y-4"}`}>
        {events.map((e, i) => (
          <div key={i} className={`${v === "list" ? "flex items-baseline justify-between gap-3 border-b pb-3 text-left" : "rounded-xl border p-4 text-center"}`} style={{ borderColor: "color-mix(in srgb, var(--c-accent) 30%, transparent)" }}>
            <div>
              <p className="font-display text-lg" style={{ color: "var(--c-primary)" }}>{e.name}</p>
              <p className="text-sm" style={{ color: "var(--c-secondary)" }}>{[e.date, e.time].filter(Boolean).join(" · ")}</p>
              {e.venue ? <p className="mt-1 text-sm" style={{ color: "var(--c-muted)" }}>{e.venue}{e.address ? `, ${e.address}` : ""}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </Wrap>
  );
}

/* --------------------------------- rsvp -------------------------------- */
function Rsvp(p: Props) {
  const { section: s, path, offsets, live, slug } = p;
  const c = s.content;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(true);
  const [attending, setAttending] = useState<"accept" | "decline">("accept");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!live || !slug) return;
    if (!name.trim()) { setErr("Please enter your name"); return; }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) { setErr("That email doesn't look right — please check it."); return; }
    setBusy(true); setErr("");
    try {
      await api.createRsvp(slug, {
        guestName: name.trim(),
        attending,
        message: message.trim() || undefined,
        ...(email.trim() ? { email: email.trim(), subscribed } : {}),
      });
      setSent(true);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const input = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
  const bd = { borderColor: "color-mix(in srgb, var(--c-accent) 30%, transparent)" };
  return (
    // when this section isn't wrapped in a card, keep the form from stretching too wide
    <Wrap align="center" className={s.style?.card ? "" : "mx-auto max-w-md"}>
      <Editable sec={s} offsets={offsets} path={path} k="heading" value={get(c, "heading", "RSVP")} tag="h2" className="font-display text-2xl uppercase tracking-[0.2em]" style={{ color: "var(--c-primary)" }} />
      <Editable sec={s} offsets={offsets} path={path} k="prompt" value={get(c, "prompt", "Will you be attending?")} tag="p" className="mt-2 text-sm" style={{ color: "var(--c-secondary)" }} />
      {sent ? (
        <p className="mt-6 text-sm" style={{ color: "var(--c-primary)" }}>Thank you — your response has been recorded. 💛</p>
      ) : (
        <div className="mt-5 w-full space-y-3 text-left">
          <input className={input} style={bd} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={input} style={bd} type="email" placeholder="Email (optional — for your confirmation & details)" value={email} onChange={(e) => setEmail(e.target.value)} />
          {email.trim() ? (
            <label className="flex cursor-pointer items-start gap-2 text-sm" style={{ color: "var(--c-text)" }}>
              <input type="checkbox" checked={subscribed} onChange={(e) => setSubscribed(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
              <span>Receive all updates from {p.coupleNames || "the couple"}&apos;s wedding</span>
            </label>
          ) : null}
          <div className="flex gap-2">
            {(["accept", "decline"] as const).map((a) => (
              <button key={a} type="button" onClick={() => setAttending(a)} className={`flex-1 rounded-lg border px-3 py-2 text-sm ${attending === a ? "text-white" : ""}`}
                style={attending === a ? { background: "var(--c-primary)", borderColor: "var(--c-primary)" } : { ...bd, color: "var(--c-primary)" }}>
                {a === "accept" ? get(c, "acceptLabel", "Joyfully accept") : get(c, "declineLabel", "Regretfully decline")}
              </button>
            ))}
          </div>
          <textarea className={`${input} min-h-[64px]`} style={bd} placeholder="A note (optional)" value={message} onChange={(e) => setMessage(e.target.value)} />
          {err ? <p className="text-sm text-rose-600">{err}</p> : null}
          <button type="button" onClick={submit} disabled={busy} className="w-full rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-60" style={{ background: "var(--c-primary)" }}>
            {busy ? "Sending…" : get(c, "submitLabel", "Send RSVP")}
          </button>
        </div>
      )}
      {get(c, "footer") ? <Editable sec={s} offsets={offsets} path={path} k="footer" value={get(c, "footer")} tag="p" className="mt-4 text-center text-xs" style={{ color: "var(--c-muted)" }} /> : null}
      {(p.venues?.length ?? 0) > 0 ? (
        <div className="mt-6 w-full">
          <VenueMap venues={p.venues!} />
        </div>
      ) : null}
    </Wrap>
  );
}

/* --------------------------------- text -------------------------------- */
function TextBlock(p: Props) {
  const { section: s, path, offsets } = p;
  const c = s.content;
  const align = s.variant === "left" ? "left" : "center";
  const banner = s.variant === "banner";
  return (
    <Wrap align={align} className={`mx-auto max-w-2xl ${banner ? "border-y py-8" : ""}`}>
      {get(c, "heading") ? <Editable sec={s} offsets={offsets} path={path} k="heading" value={get(c, "heading")} tag="h2" className={`font-display ${banner ? "text-3xl" : "text-2xl"} uppercase tracking-[0.18em]`} style={{ color: "var(--c-primary)" }} /> : null}
      {get(c, "body") ? <Editable sec={s} offsets={offsets} path={path} k="body" value={get(c, "body")} tag="p" className="mt-4 whitespace-pre-wrap leading-relaxed" style={{ color: "var(--c-text)" }} /> : null}
    </Wrap>
  );
}

/* ------------------------------ dispatcher ----------------------------- */
export function SectionBody(props: Props) {
  switch (props.section.type) {
    case "cover": return <Cover {...props} />;
    case "names": return <Names {...props} />;
    case "families": return <Families {...props} />;
    case "quote": return <Quote {...props} />;
    case "countdown": return <CountdownSection {...props} />;
    case "story": return <Story {...props} />;
    case "gallery": return <Gallery {...props} />;
    case "schedule": return <Schedule {...props} />;
    case "rsvp": return <Rsvp {...props} />;
    case "text": return <TextBlock {...props} />;
    default: return null;
  }
}
