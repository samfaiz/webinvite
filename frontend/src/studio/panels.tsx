"use client";

import { useEffect, useRef, useState } from "react";
import type { Draft } from "./draft";
import { expiryFromDate, formatDisplayDate } from "./draft";
import { Field, TextInput, TextArea, Select, ColorInput, Btn, Group } from "./ui";
import { templates } from "@/templates/registry";
import { themeList, getTheme } from "@/themes";
import { motifList, getMotif } from "@/motifs";
import { googleMapsUrl, targetFromEvent } from "@/lib/maps";
import { sealInitials } from "@/lib/initials";
import { api, type Track } from "@/lib/api";

export type PanelProps = {
  draft: Draft;
  update: (mutator: (d: Draft) => void) => void;
};

const splitList = (s: string) =>
  s.split(",").map((x) => x.trim()).filter(Boolean);

/**
 * Read an image File and return a downscaled JPEG data URL. Couples upload phone
 * photos (often 3–5 MB each) and several at once; raw base64 would overflow
 * localStorage and bloat the saved invitation, so we cap the longest edge and
 * re-encode before storing.
 */
function fileToScaledDataUrl(file: File, maxDim = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't a valid image"));
      img.onload = () => {
        let { width, height } = img;
        if (Math.max(width, height) > maxDim) {
          const s = maxDim / Math.max(width, height);
          width = Math.round(width * s);
          height = Math.round(height * s);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(String(reader.result));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/* ------------------------------- DESIGN ------------------------------- */

export function DesignPanel({ draft, update }: PanelProps) {
  return (
    <div>
      <Field label="Layout">
        <Select
          value={draft.templateId}
          onChange={(v) => update((d) => { d.templateId = v; })}
          options={templates.map((t) => ({ value: t.id, label: t.name }))}
        />
      </Field>

      <Field label="Community (motifs & blessings)">
        <Select
          value={draft.motifId}
          onChange={(v) => update((d) => { d.motifId = v; })}
          options={motifList.map((m) => ({ value: m.id, label: m.name }))}
        />
      </Field>

      <ThemeSwatches draft={draft} update={update} />
    </div>
  );
}

/** Reusable colour-theme picker (used in Design panel + wizard quick-strip). */
export function ThemeSwatches({ draft, update }: PanelProps) {
  return (
    <>
      <p className="mb-2 mt-4 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
        Color Theme
      </p>
      <div className="grid grid-cols-2 gap-2">
        {themeList.map((t) => {
          const active = draft.theme.id === t.id;
          return (
            <button
              key={t.id}
              onClick={() => update((d) => { d.theme = structuredClone(getTheme(t.id)); })}
              className="overflow-hidden rounded-lg border text-left transition-all"
              style={{ borderColor: active ? t.colors.primary : "#e2e8f0", borderWidth: active ? 2 : 1 }}
            >
              <div className="flex h-8" style={{ background: `linear-gradient(90deg, ${t.colors.gradientFrom}, ${t.colors.gradientTo})` }}>
                {[t.colors.primary, t.colors.accent, t.colors.secondary].map((c) => (
                  <span key={c} className="my-auto ml-1 h-4 w-4 rounded-full ring-1 ring-black/10" style={{ background: c }} />
                ))}
              </div>
              <span className="block px-2 py-1 text-[11px] text-slate-600">{t.name}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* --------------------- per-section field groups --------------------- */

export function CoupleFields({ draft, update }: PanelProps) {
  const c = draft.content;
  return (
    <div>
      <Field label="Name 1">
        <TextInput value={c.couple.partner1.name} onChange={(e) => update((d) => { d.content.couple.partner1.name = e.target.value; })} />
      </Field>
      <Field label="Name 2">
        <TextInput value={c.couple.partner2.name} onChange={(e) => update((d) => { d.content.couple.partner2.name = e.target.value; })} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Connector"><TextInput value={c.couple.connector ?? ""} onChange={(e) => update((d) => { d.content.couple.connector = e.target.value; })} /></Field>
        <Field label="Monogram"><TextInput value={c.couple.monogram ?? ""} onChange={(e) => update((d) => { d.content.couple.monogram = e.target.value; })} /></Field>
      </div>
      <Field label="Marriage line"><TextInput value={c.hero.marriageText} onChange={(e) => update((d) => { d.content.hero.marriageText = e.target.value; })} /></Field>
    </div>
  );
}

export function FamilyFields({ draft, update }: PanelProps) {
  const c = draft.content;
  return (
    <div>
      <Field label={`${c.couple.partner1.name || "Name 1"} — parents (father, mother)`}>
        <TextInput
          value={[c.couple.partner1.father, c.couple.partner1.mother].filter(Boolean).join(", ")}
          onChange={(e) => update((d) => { const [f, m] = splitList(e.target.value); d.content.couple.partner1.father = f ?? ""; d.content.couple.partner1.mother = m ?? ""; })}
        />
      </Field>
      <Field label={`${c.couple.partner1.name || "Name 1"} — siblings (comma separated)`}>
        <TextInput value={(c.couple.partner1.siblings ?? []).join(", ")} onChange={(e) => update((d) => { d.content.couple.partner1.siblings = splitList(e.target.value); })} />
      </Field>
      <Field label={`${c.couple.partner2.name || "Name 2"} — parents (father, mother)`}>
        <TextInput
          value={[c.couple.partner2.father, c.couple.partner2.mother].filter(Boolean).join(", ")}
          onChange={(e) => update((d) => { const [f, m] = splitList(e.target.value); d.content.couple.partner2.father = f ?? ""; d.content.couple.partner2.mother = m ?? ""; })}
        />
      </Field>
      <Field label={`${c.couple.partner2.name || "Name 2"} — siblings (comma separated)`}>
        <TextInput value={(c.couple.partner2.siblings ?? []).join(", ")} onChange={(e) => update((d) => { d.content.couple.partner2.siblings = splitList(e.target.value); })} />
      </Field>
      <Field label="Heading"><TextInput value={c.families.heading} onChange={(e) => update((d) => { d.content.families.heading = e.target.value; })} /></Field>
      <Field label="Footer line"><TextInput value={c.families.footer ?? ""} onChange={(e) => update((d) => { d.content.families.footer = e.target.value; })} /></Field>
    </div>
  );
}

/** Upload (or link) a custom MP4 that plays as the opening instead of the
 *  default envelope. Uploading needs a signed-in account; a link works anytime. */
function IntroVideoField({ draft, update }: PanelProps) {
  const url = draft.content.envelope.videoUrl ?? "";
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onUpload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      const { url: u } = await api.uploadMedia(file);
      update((d) => { d.content.envelope.videoUrl = u; });
    } catch (e) {
      setErr(`${(e as Error).message} — log in to upload, or paste a link instead.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Field label="Custom intro video (MP4, optional)">
      <div className="space-y-2">
        {url ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-black">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={url} controls playsInline className="h-36 w-full object-contain" />
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <label className={`cursor-pointer rounded-md px-3 py-2 text-xs font-medium text-white ${busy ? "bg-slate-400" : "bg-[#2b3a67] hover:bg-[#23315a]"}`}>
            {busy ? "Uploading…" : url ? "Replace video" : "Upload MP4"}
            <input type="file" accept="video/*" className="hidden" disabled={busy} onChange={(e) => { onUpload(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {url ? (
            <button type="button" onClick={() => update((d) => { d.content.envelope.videoUrl = ""; })} className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">
              Remove (use envelope)
            </button>
          ) : null}
        </div>
        <TextInput value={url} placeholder="…or paste a video link (https://…/intro.mp4)" onChange={(e) => update((d) => { d.content.envelope.videoUrl = e.target.value; })} />
        <p className="text-[10px] text-slate-400">Plays full-screen instead of the envelope. Leave empty to keep the default envelope intro.</p>
        {err ? <p className="text-[11px] text-rose-600">{err}</p> : null}
      </div>
    </Field>
  );
}

export function SaveDateFields({ draft, update }: PanelProps) {
  const c = draft.content;
  return (
    <div>
      <Field label="Date (as shown)"><TextInput value={c.dateReveal.eventDate} onChange={(e) => update((d) => { d.content.dateReveal.eventDate = e.target.value; })} /></Field>
      <Field label="Location"><TextInput value={c.dateReveal.location} onChange={(e) => update((d) => { d.content.dateReveal.location = e.target.value; })} /></Field>
      <Field label="Envelope tagline"><TextInput value={c.envelope.tagline ?? ""} onChange={(e) => update((d) => { d.content.envelope.tagline = e.target.value; })} /></Field>
      <Field label="Wax seal initials (optional — defaults to your initials)">
        <TextInput
          value={c.envelope.seal ?? ""}
          placeholder={sealInitials(c.couple.partner1?.name, c.couple.partner2?.name)}
          onChange={(e) => update((d) => { d.content.envelope.seal = e.target.value; })}
        />
      </Field>
      <IntroVideoField draft={draft} update={update} />
      <Field label="Countdown headline"><TextInput value={c.countdown.headline} onChange={(e) => update((d) => { d.content.countdown.headline = e.target.value; })} /></Field>
    </div>
  );
}

/** Pick the background song from the curated library (with ▶ preview) or paste
 *  your own link. The chosen track plays when guests open the invitation. */
export function MusicFields({ draft, update }: PanelProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const current = draft.content.music.trackUrl ?? "";

  useEffect(() => {
    api.listTracks().then(setTracks).catch(() => setTracks([]));
  }, []);
  useEffect(() => () => audioRef.current?.pause(), []);

  const choose = (url: string) => update((d) => { d.content.music.trackUrl = url; });

  const preview = (url: string) => {
    const a = audioRef.current;
    if (!a) return;
    if (previewing === url) {
      a.pause();
      setPreviewing(null);
      return;
    }
    a.src = url;
    a.play().then(() => setPreviewing(url)).catch(() => setPreviewing(null));
  };

  const inLibrary = tracks.some((t) => t.url === current);
  const customUrl = current && !inLibrary ? current : "";

  const rowCls = (selected: boolean) =>
    `flex items-center gap-2 rounded-lg border p-2.5 mb-2 ${selected ? "border-[#2b3a67] ring-1 ring-[#2b3a67]/30 bg-[#2b3a67]/[0.03]" : "border-slate-200"}`;

  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">
        Choose a song that plays when guests open your invitation. It starts on the “tap to open” and they can mute anytime.
      </p>
      <audio ref={audioRef} onEnded={() => setPreviewing(null)} className="hidden" />

      <button type="button" onClick={() => choose("")} className={rowCls(current === "")}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-400">✕</span>
        <span className="text-sm font-medium text-slate-700">No music</span>
      </button>

      {tracks.map((t) => {
        const selected = current === t.url;
        const isPreview = previewing === t.url;
        return (
          <div key={t.id} className={rowCls(selected)}>
            <button
              type="button"
              onClick={() => preview(t.url)}
              aria-label={isPreview ? "Stop preview" : "Preview"}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#2b3a67] text-white"
            >
              {isPreview ? "❚❚" : "▶"}
            </button>
            <button type="button" onClick={() => choose(t.url)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-slate-700">{t.title}</p>
              {t.mood ? <p className="text-[11px] text-slate-400">{t.mood}</p> : null}
            </button>
            {selected ? <span className="shrink-0 text-xs font-medium text-[#2b3a67]">Selected ✓</span> : null}
          </div>
        );
      })}

      {tracks.length === 0 ? (
        <p className="mb-2 text-xs text-slate-400">No library tracks yet — paste a link below.</p>
      ) : null}

      <div className="mt-3">
        <Field label="Or paste your own song link (.mp3)">
          <TextInput value={customUrl} placeholder="https://…/song.mp3" onChange={(e) => choose(e.target.value)} />
        </Field>
      </div>
    </div>
  );
}

export function StoryFields({ draft, update }: PanelProps) {
  const c = draft.content;
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState("");

  const setPhoto = async (idx: number, file?: File) => {
    if (!file) return;
    setErr("");
    setBusy(idx);
    try {
      const url = await fileToScaledDataUrl(file);
      update((d) => { d.content.story.items[idx].photo = url; });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const removeItem = (idx: number, caption: string) => {
    const label = caption ? ` “${caption}”` : "";
    if (!window.confirm(`Delete this photo and caption${label}? This can’t be undone.`)) return;
    update((d) => { d.content.story.items.splice(idx, 1); });
  };

  return (
    <div>
      <Field label="Heading subtitle"><TextInput value={c.story.subtext ?? ""} onChange={(e) => update((d) => { d.content.story.subtext = e.target.value; })} /></Field>

      {c.story.items.map((item, i) => (
        <div key={i} className="relative mb-3 rounded-lg border border-slate-200 p-3">
          {/* delete the whole moment (photo + caption) — top right, with confirm */}
          <button
            type="button"
            onClick={() => removeItem(i, item.caption)}
            aria-label="Delete photo and caption"
            title="Delete photo & caption"
            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            ✕
          </button>

          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Photo {i + 1}</p>

          <div className="flex gap-3">
            <div className="h-20 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
              {item.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.photo} alt={item.caption} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-center text-[9px] leading-tight text-slate-400">No photo yet</div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2">
                <label className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium text-white ${busy === i ? "bg-slate-400" : "bg-[#2b3a67] hover:bg-[#23315a]"}`}>
                  {busy === i ? "Adding…" : item.photo ? "Change photo" : "+ Add photo"}
                  <input type="file" accept="image/*" className="hidden" disabled={busy === i} onChange={(e) => { setPhoto(i, e.target.files?.[0]); e.target.value = ""; }} />
                </label>
                {item.photo ? (
                  <button
                    type="button"
                    onClick={() => update((d) => { d.content.story.items[i].photo = ""; })}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Remove photo
                  </button>
                ) : null}
              </div>
              <p className="mt-1.5 text-[10px] text-slate-400">Portrait photos look best.</p>
            </div>
          </div>

          <div className="mt-3">
            <Field label="Caption">
              <TextInput value={item.caption} onChange={(e) => update((d) => { d.content.story.items[i].caption = e.target.value; })} />
            </Field>
          </div>
        </div>
      ))}

      {err ? <p className="mb-2 text-xs text-rose-600">{err}</p> : null}
      <Btn onClick={() => update((d) => { d.content.story.items.push({ photo: "", caption: "New moment" }); })}>+ Add another photo</Btn>
    </div>
  );
}

export function ScheduleFields({ draft, update }: PanelProps) {
  const c = draft.content;
  const motif = getMotif(draft.motifId);
  const iconOptions = Object.keys(motif.icons).map((k) => ({ value: k, label: k }));
  return (
    <div>
      <Field label="Subtitle"><TextInput value={c.schedule.subtext ?? ""} onChange={(e) => update((d) => { d.content.schedule.subtext = e.target.value; })} /></Field>
      {c.schedule.events.map((ev, i) => (
        <div key={ev.id} className="mb-2 rounded-md border border-slate-200 p-2">
          <Field label="Event name"><TextInput value={ev.name} onChange={(e) => update((d) => { d.content.schedule.events[i].name = e.target.value; })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Date"><TextInput value={ev.date} onChange={(e) => update((d) => { d.content.schedule.events[i].date = e.target.value; })} /></Field>
            <Field label="Time"><TextInput value={ev.time} onChange={(e) => update((d) => { d.content.schedule.events[i].time = e.target.value; })} /></Field>
          </div>
          <Field label="Venue"><TextInput value={ev.venue} onChange={(e) => update((d) => { d.content.schedule.events[i].venue = e.target.value; })} /></Field>
          <Field label="Address"><TextInput value={ev.address ?? ""} onChange={(e) => update((d) => { d.content.schedule.events[i].address = e.target.value; })} /></Field>
          <Field label="Map location (Get Directions)">
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <TextInput
                  value={ev.mapUrl ?? ""}
                  placeholder="Paste a map link — optional"
                  onChange={(e) => update((d) => { d.content.schedule.events[i].mapUrl = e.target.value; })}
                />
                <a
                  href={googleMapsUrl(targetFromEvent(ev))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex shrink-0 items-center whitespace-nowrap rounded-md bg-[#2b3a67] px-3 text-xs font-medium text-white hover:bg-[#23315a]"
                >
                  📍 Find on map
                </a>
              </div>
              <p className="text-[10px] text-slate-400">
                Leave blank to use the venue &amp; address. Guests’ “Get Directions” opens Apple Maps on iPhone and Google Maps on Android &amp; web.
              </p>
            </div>
          </Field>
          <Field label="Icon"><Select value={ev.icon ?? "heart"} onChange={(v) => update((d) => { d.content.schedule.events[i].icon = v; })} options={iconOptions} /></Field>
          <Field label="Verse / blessing (optional)"><TextArea value={ev.verse ?? ""} onChange={(e) => update((d) => { d.content.schedule.events[i].verse = e.target.value; })} /></Field>
          <Field label="Verse reference"><TextInput value={ev.verseRef ?? ""} onChange={(e) => update((d) => { d.content.schedule.events[i].verseRef = e.target.value; })} /></Field>
          <Btn variant="danger" onClick={() => update((d) => { d.content.schedule.events.splice(i, 1); })}>Remove event</Btn>
        </div>
      ))}
      <Btn onClick={() => update((d) => { d.content.schedule.events.push({ id: `event-${d.content.schedule.events.length + 1}-${Date.now()}`, name: "New Event", date: "", time: "", venue: "", icon: "heart" }); })}>+ Add event</Btn>
    </div>
  );
}

export function RsvpFields({ draft, update }: PanelProps) {
  const c = draft.content;
  return (
    <div>
      <Field label="Heading"><TextInput value={c.rsvp.heading} onChange={(e) => update((d) => { d.content.rsvp.heading = e.target.value; })} /></Field>
      <Field label="Prompt"><TextInput value={c.rsvp.prompt} onChange={(e) => update((d) => { d.content.rsvp.prompt = e.target.value; })} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Accept label"><TextInput value={c.rsvp.acceptLabel} onChange={(e) => update((d) => { d.content.rsvp.acceptLabel = e.target.value; })} /></Field>
        <Field label="Decline label"><TextInput value={c.rsvp.declineLabel} onChange={(e) => update((d) => { d.content.rsvp.declineLabel = e.target.value; })} /></Field>
      </div>
      <Field label="Submit button"><TextInput value={c.rsvp.submitLabel} onChange={(e) => update((d) => { d.content.rsvp.submitLabel = e.target.value; })} /></Field>
      <Field label="Footer line"><TextInput value={c.rsvp.footer ?? ""} onChange={(e) => update((d) => { d.content.rsvp.footer = e.target.value; })} /></Field>
    </div>
  );
}

/** All content groups in one scroll (used by the advanced Studio). */
export function ContentPanel({ draft, update }: PanelProps) {
  return (
    <div>
      <Group title="Couple" open><CoupleFields draft={draft} update={update} /></Group>
      <Group title="Families"><FamilyFields draft={draft} update={update} /></Group>
      <Group title="Save the date"><SaveDateFields draft={draft} update={update} /></Group>
      <Group title="Our Story"><StoryFields draft={draft} update={update} /></Group>
      <Group title="Schedule of Events"><ScheduleFields draft={draft} update={update} /></Group>
      <Group title="RSVP"><RsvpFields draft={draft} update={update} /></Group>
    </div>
  );
}

/* ------------------------------ COLORS ------------------------------ */

const FONTS = [
  { value: "var(--font-cinzel)", label: "Cinzel (serif caps)" },
  { value: "var(--font-cormorant)", label: "Cormorant (serif)" },
  { value: "var(--font-greatvibes)", label: "Great Vibes (script)" },
  { value: "var(--font-jost)", label: "Jost (sans)" },
];

const COLOR_TOKENS: { key: keyof Draft["theme"]["colors"]; label: string }[] = [
  { key: "primary", label: "Primary (headings)" },
  { key: "secondary", label: "Secondary (script)" },
  { key: "accent", label: "Accent (gold/ornaments)" },
  { key: "text", label: "Body text" },
  { key: "muted", label: "Muted text" },
  { key: "bg", label: "Background" },
  { key: "surface", label: "Surface (cards)" },
  { key: "gradientFrom", label: "Gradient from" },
  { key: "gradientTo", label: "Gradient to" },
];

export function ColorsPanel({ draft, update }: PanelProps) {
  const markCustom = (d: Draft) => { d.theme.id = "custom"; d.theme.name = "Custom"; };
  return (
    <div>
      <ThemeSwatches draft={draft} update={update} />
      <p className="mb-3 mt-4 text-[11px] text-slate-400">
        Or fine-tune individual colours (creates a “Custom” theme):
      </p>
      {COLOR_TOKENS.map((t) => (
        <Field key={t.key} label={t.label}>
          <ColorInput
            value={draft.theme.colors[t.key]}
            onChange={(v) => update((d) => { d.theme.colors[t.key] = v; markCustom(d); })}
          />
        </Field>
      ))}

      <Group title="Fonts">
        <Field label="Display (headings)"><Select value={draft.theme.fonts.display} onChange={(v) => update((d) => { d.theme.fonts.display = v; markCustom(d); })} options={FONTS} /></Field>
        <Field label="Script (names)"><Select value={draft.theme.fonts.script} onChange={(v) => update((d) => { d.theme.fonts.script = v; markCustom(d); })} options={FONTS} /></Field>
        <Field label="Body"><Select value={draft.theme.fonts.body} onChange={(v) => update((d) => { d.theme.fonts.body = v; markCustom(d); })} options={FONTS} /></Field>
      </Group>

      <Group title="Particles">
        <Field label="Type">
          <Select
            value={draft.theme.particles.type}
            onChange={(v) => update((d) => { d.theme.particles.type = v as "petals" | "sparkles" | "none"; markCustom(d); })}
            options={[{ value: "petals", label: "Petals" }, { value: "sparkles", label: "Sparkles" }, { value: "none", label: "None" }]}
          />
        </Field>
        <Field label="Color"><ColorInput value={draft.theme.particles.color} onChange={(v) => update((d) => { d.theme.particles.color = v; markCustom(d); })} /></Field>
      </Group>
    </div>
  );
}

/* ------------------------------ PHOTOS ------------------------------ */

export function PhotoUploaders({ draft, update }: PanelProps) {
  const items = draft.content.story.items;
  const onFile = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update((d) => { d.content.story.items[idx].photo = String(reader.result); });
    reader.readAsDataURL(file);
  };
  if (items.length === 0)
    return <p className="text-xs text-slate-400">Add photo slots first.</p>;
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} className="mb-3 flex items-center gap-3 rounded-lg border border-slate-200 p-2">
          <div className="h-16 w-14 shrink-0 overflow-hidden rounded bg-slate-100">
            {item.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.photo} alt={item.caption} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">none</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-slate-600">{item.caption}</p>
            <input type="file" accept="image/*" onChange={(e) => onFile(e, i)} className="mt-1 block w-full text-[11px] text-slate-500 file:mr-2 file:rounded file:border-0 file:bg-slate-800 file:px-2 file:py-1 file:text-white" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PhotosPanel({ draft, update }: PanelProps) {
  return (
    <div>
      <p className="mb-3 text-[11px] text-slate-400">
        Photos are stored in your browser for now and upload with your account later.
      </p>
      <PhotoUploaders draft={draft} update={update} />
    </div>
  );
}

/* ------------------------------ SETTINGS ------------------------------ */

export function SettingsPanel({ draft, update }: PanelProps) {
  const [autoExpiry, setAutoExpiry] = useState(true);
  const dt = draft.content.countdown.targetDate.slice(0, 16);

  const onDate = (value: string) => {
    update((d) => {
      d.content.countdown.targetDate = value;
      d.content.dateReveal.eventDate = formatDisplayDate(value);
      if (autoExpiry) d.content.expiry.expiresAt = expiryFromDate(value);
    });
  };

  return (
    <div>
      <Field label="Your email" hint="We’ll email you the RSVP attendee list (Excel) for this invite.">
        <TextInput type="email" value={draft.ownerEmail} placeholder="you@example.com" onChange={(e) => update((d) => { d.ownerEmail = e.target.value; })} />
      </Field>

      <Field label="URL slug" hint="Your invite will live at /i/<slug>">
        <TextInput value={draft.content.meta.slug} onChange={(e) => update((d) => { d.content.meta.slug = e.target.value.replace(/\s+/g, "-").toLowerCase(); })} />
      </Field>

      <Field label="Wedding date & time">
        <TextInput type="datetime-local" value={dt} onChange={(e) => onDate(e.target.value)} />
      </Field>

      <label className="mb-2 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={autoExpiry}
          onChange={(e) => {
            setAutoExpiry(e.target.checked);
            if (e.target.checked) update((d) => { d.content.expiry.expiresAt = expiryFromDate(d.content.countdown.targetDate); });
          }}
        />
        Auto-expire 1 day after the wedding date
      </label>

      <Field label="Invitation expires on" hint={autoExpiry ? "Auto-set to wedding date + 1 day." : "Set a custom expiry date."}>
        <TextInput
          type="date"
          disabled={autoExpiry}
          value={draft.content.expiry.expiresAt}
          onChange={(e) => update((d) => { d.content.expiry.expiresAt = e.target.value; })}
        />
      </Field>

      <Field label="Directions button URL">
        <TextInput value={draft.content.map.directionsUrl ?? ""} onChange={(e) => update((d) => { d.content.map.directionsUrl = e.target.value; })} />
      </Field>
    </div>
  );
}
