"use client";

import { useRef, useState } from "react";
import type { Draft } from "@/studio/draft";
import type { CustomSection, SectionType } from "@/engine/types";
import { TextInput, TextArea, Select, ColorInput } from "@/studio/ui";
import { fileToScaledDataUrl } from "@/lib/image";
import { SECTIONS, getSectionDef, newSection, type SectionField } from "./registry";

type Props = { draft: Draft; update: (m: (d: Draft) => void) => void };

const FONTS = [
  { value: "", label: "Theme default" },
  { value: "var(--font-cinzel)", label: "Cinzel (serif caps)" },
  { value: "var(--font-marcellus)", label: "Marcellus (serif)" },
  { value: "var(--font-playfair)", label: "Playfair (serif)" },
  { value: "var(--font-cormorant)", label: "Cormorant (serif)" },
  { value: "var(--font-ebgaramond)", label: "EB Garamond (serif)" },
  { value: "var(--font-greatvibes)", label: "Great Vibes (script)" },
  { value: "var(--font-dancing)", label: "Dancing Script (script)" },
  { value: "var(--font-parisienne)", label: "Parisienne (script)" },
  { value: "var(--font-jost)", label: "Jost (sans)" },
  { value: "var(--font-inter)", label: "Inter (sans)" },
];

export function CustomBuilder({ draft, update }: Props) {
  const sections = draft.content.customSections ?? [];
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(sections[0]?.id ?? null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const pending = useRef<((url: string) => void) | null>(null);

  const mutate = (fn: (list: CustomSection[]) => void) =>
    update((d) => {
      d.content.customSections = d.content.customSections ?? [];
      fn(d.content.customSections);
    });

  const addSection = (type: SectionType) => {
    const s = newSection(type);
    mutate((l) => void l.push(s));
    setOpenId(s.id);
    setAdding(false);
  };
  const removeSection = (id: string) => mutate((l) => { const i = l.findIndex((x) => x.id === id); if (i >= 0) l.splice(i, 1); });
  const move = (id: string, dir: -1 | 1) =>
    mutate((l) => {
      const i = l.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= l.length) return;
      [l[i], l[j]] = [l[j], l[i]];
    });
  const patch = (id: string, p: Partial<CustomSection>) => mutate((l) => { const s = l.find((x) => x.id === id); if (s) Object.assign(s, p); });
  const setContent = (id: string, key: string, val: unknown) => mutate((l) => { const s = l.find((x) => x.id === id); if (s) s.content = { ...s.content, [key]: val }; });
  const setBg = (id: string, key: string, val: unknown) => mutate((l) => { const s = l.find((x) => x.id === id); if (s) s.background = { ...(s.background ?? {}), [key]: val }; });
  const setStyle = (id: string, key: string, val: unknown) => mutate((l) => { const s = l.find((x) => x.id === id); if (s) s.style = { ...(s.style ?? {}), [key]: val }; });

  const pickImage = (cb: (url: string) => void) => { pending.current = cb; fileInput.current?.click(); };
  const onFile = async (file?: File) => {
    const cb = pending.current;
    pending.current = null;
    if (!file || !cb) return;
    setUploading(true);
    try { cb(await fileToScaledDataUrl(file, 1600, 0.82)); } catch (e) { alert((e as Error).message); } finally { setUploading(false); }
  };

  const openSection = (id: string) => {
    setOpenId((cur) => (cur === id ? null : id));
    try { window.dispatchEvent(new CustomEvent("preview:scrollTo", { detail: `sec-${id}` })); } catch { /* ignore */ }
  };

  return (
    <div>
      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <p className="mb-3 text-[11px] text-slate-500">Design section by section — add sections, pick a layout, set a background, edit the content. Colours &amp; fonts come from the Colors tab; override any section below.</p>

      <div className="space-y-2">
        {sections.map((s, i) => (
          <SectionCard
            key={s.id}
            section={s}
            index={i}
            count={sections.length}
            open={openId === s.id}
            uploading={uploading}
            onToggle={() => openSection(s.id)}
            onMove={(dir) => move(s.id, dir)}
            onRemove={() => { if (confirm("Delete this section?")) removeSection(s.id); }}
            setVariant={(v) => patch(s.id, { variant: v })}
            setContent={(k, v) => setContent(s.id, k, v)}
            setBg={(k, v) => setBg(s.id, k, v)}
            setStyle={(k, v) => setStyle(s.id, k, v)}
            pickImage={pickImage}
          />
        ))}
        {sections.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-400">No sections yet. Add your first below.</p> : null}
      </div>

      <div className="relative mt-3">
        <button onClick={() => setAdding((v) => !v)} className="w-full rounded-lg border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-50">
          ＋ Add section
        </button>
        {adding ? (
          <div className="absolute z-10 mt-1 grid w-full grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            {SECTIONS.map((def) => (
              <button key={def.type} onClick={() => addSection(def.type)} className="flex items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
                <span className="text-base">{def.icon}</span>
                <span>{def.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------ section card ------------------------------ */

function SectionCard({
  section, index, count, open, uploading, onToggle, onMove, onRemove,
  setVariant, setContent, setBg, setStyle, pickImage,
}: {
  section: CustomSection;
  index: number;
  count: number;
  open: boolean;
  uploading: boolean;
  onToggle: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  setVariant: (v: string) => void;
  setContent: (k: string, v: unknown) => void;
  setBg: (k: string, v: unknown) => void;
  setStyle: (k: string, v: unknown) => void;
  pickImage: (cb: (url: string) => void) => void;
}) {
  const def = getSectionDef(section.type);
  const bg = section.background ?? {};
  const st = section.style ?? {};
  const [tab, setTab] = useState<"content" | "layout" | "design">("content");

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60">
      <div className="flex items-center gap-2 px-3 py-2">
        <button onClick={onToggle} className="flex flex-1 items-center gap-2 text-left text-sm font-semibold text-slate-700">
          <span>{def.icon}</span>
          <span>{def.label}</span>
          <span className="text-[10px] font-normal uppercase tracking-wide text-slate-400">{section.variant}</span>
        </button>
        <div className="flex items-center gap-1 text-slate-400">
          <button onClick={() => onMove(-1)} disabled={index === 0} title="Move up" className="px-1 hover:text-slate-700 disabled:opacity-30">↑</button>
          <button onClick={() => onMove(1)} disabled={index === count - 1} title="Move down" className="px-1 hover:text-slate-700 disabled:opacity-30">↓</button>
          <button onClick={onRemove} title="Delete" className="px-1 hover:text-rose-600">✕</button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-slate-200 p-3">
          {/* prominent background photo — the most-wanted per-section control */}
          <div className="mb-3 rounded-lg border border-slate-200 bg-white p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Background photo</span>
              {bg.image ? <button onClick={() => setBg("image", "")} className="text-[11px] text-rose-500 hover:underline">Remove</button> : null}
            </div>
            <div className="mt-2 flex items-center gap-2">
              {bg.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bg.image} alt="" className="h-12 w-16 shrink-0 rounded object-cover" />
              ) : (
                <div className="grid h-12 w-16 shrink-0 place-items-center rounded bg-slate-100 text-lg text-slate-400">🖼</div>
              )}
              <button onClick={() => pickImage((url) => setBg("image", url))} disabled={uploading} className="rounded-md bg-[#2b3a67] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#23315a] disabled:opacity-60">
                {uploading ? "Uploading…" : bg.image ? "Change photo" : "Upload photo"}
              </button>
            </div>
            {bg.image ? (
              <label className="mt-2 block text-[11px] text-slate-500">
                Darken for legibility · {bg.tint ?? 0}%
                <input type="range" min={0} max={80} value={bg.tint ?? 0} onChange={(e) => setBg("tint", Number(e.target.value))} className="w-full" />
              </label>
            ) : null}
          </div>

          <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-0.5 text-xs">
            {(["content", "layout", "design"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-md py-1 capitalize ${tab === t ? "bg-white font-medium text-slate-800 shadow-sm" : "text-slate-500"}`}>{t}</button>
            ))}
          </div>

          {tab === "layout" ? (
            <div className="grid grid-cols-2 gap-2">
              {def.variants.map((v) => (
                <button key={v.key} onClick={() => setVariant(v.key)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs ${section.variant === v.key ? "border-[#2b3a67] bg-[#2b3a67]/5" : "border-slate-200 hover:bg-white"}`}>
                  <span className="block font-medium text-slate-700">{v.label}</span>
                  {v.hint ? <span className="block text-[10px] text-slate-400">{v.hint}</span> : null}
                </button>
              ))}
            </div>
          ) : null}

          {tab === "design" ? (
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Background colour (used when there's no photo)</p>
                <div className="grid grid-cols-3 gap-2">
                  <label className="block text-[11px] text-slate-500">Solid<ColorInput value={bg.color || "#f7f4ec"} onChange={(v) => setBg("color", v)} /></label>
                  <label className="block text-[11px] text-slate-500">Gradient from<ColorInput value={bg.gradientFrom || "#f7f4ec"} onChange={(v) => setBg("gradientFrom", v)} /></label>
                  <label className="block text-[11px] text-slate-500">Gradient to<ColorInput value={bg.gradientTo || "#efe9dc"} onChange={(v) => setBg("gradientTo", v)} /></label>
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Fonts &amp; colours (this section)</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-[11px] text-slate-500">Heading font<Select value={st.fontDisplay ?? ""} onChange={(v) => setStyle("fontDisplay", v || undefined)} options={FONTS} /></label>
                  <label className="block text-[11px] text-slate-500">Body font<Select value={st.fontBody ?? ""} onChange={(v) => setStyle("fontBody", v || undefined)} options={FONTS} /></label>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <label className="block text-[11px] text-slate-500">Text colour<ColorInput value={st.textColor || "#2b3a67"} onChange={(v) => setStyle("textColor", v)} /></label>
                  <label className="block text-[11px] text-slate-500">Accent colour<ColorInput value={st.accentColor || "#b08d57"} onChange={(v) => setStyle("accentColor", v)} /></label>
                </div>
                <label className="mt-1 block text-[11px] text-slate-500">Align
                  <Select value={st.align ?? "center"} onChange={(v) => setStyle("align", v)} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} />
                </label>
              </div>
              <div>
                <label className="flex cursor-pointer items-center gap-2 text-[11px] font-medium uppercase tracking-[0.1em] text-slate-600">
                  <input type="checkbox" checked={!!st.card} onChange={(e) => setStyle("card", e.target.checked)} />
                  Show inside a card
                </label>
                {st.card ? (
                  <div className="mt-2">
                    <label className="block text-[11px] text-slate-500">
                      Card width · {st.cardWidth ?? 460}px
                      <input type="range" min={300} max={720} step={10} value={st.cardWidth ?? 460} onChange={(e) => setStyle("cardWidth", Number(e.target.value))} className="w-full" />
                    </label>
                    <label className="block text-[11px] text-slate-500">
                      Card height · {st.cardHeight ? `${st.cardHeight}px` : "Auto"}
                      <input type="range" min={0} max={900} step={20} value={st.cardHeight ?? 0} onChange={(e) => setStyle("cardHeight", Number(e.target.value))} className="w-full" />
                    </label>
                    <label className="mt-1 block text-[11px] text-slate-500">Card colour<ColorInput value={st.cardColor || "#fbf7ef"} onChange={(v) => setStyle("cardColor", v)} /></label>
                    <label className="mt-1 block text-[11px] text-slate-500">
                      Transparency · {100 - (st.cardOpacity ?? 100)}%
                      <input type="range" min={0} max={100} step={5} value={100 - (st.cardOpacity ?? 100)} onChange={(e) => setStyle("cardOpacity", 100 - Number(e.target.value))} className="w-full" />
                    </label>
                    <label className="block text-[11px] text-slate-500">
                      Blur · {st.cardBlur ?? 0}px
                      <input type="range" min={0} max={30} step={1} value={st.cardBlur ?? 0} onChange={(e) => setStyle("cardBlur", Number(e.target.value))} className="w-full" />
                    </label>
                    <p className="mt-1 text-[10px] leading-snug text-slate-400">Tip: raise transparency + blur over a background photo for a frosted-glass card.</p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {tab === "content" ? (
            <ContentEditor section={section} def={def} setContent={setContent} pickImage={pickImage} uploading={uploading} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ----------------------------- content editor ----------------------------- */

function Field({ field, value, onChange, pickImage, uploading }: {
  field: SectionField; value: string; onChange: (v: string) => void; pickImage: (cb: (url: string) => void) => void; uploading: boolean;
}) {
  if (field.type === "image") {
    return (
      <div className="mb-2">
        <p className="mb-1 text-[11px] text-slate-500">{field.label}</p>
        <div className="flex items-center gap-2">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-12 w-12 rounded object-cover" />
          ) : null}
          <button onClick={() => pickImage(onChange)} disabled={uploading} className="rounded-md bg-[#2b3a67] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#23315a] disabled:opacity-60">
            {uploading ? "…" : value ? "Change" : "Upload"}
          </button>
        </div>
      </div>
    );
  }
  return (
    <label className="mb-2 block text-[11px] text-slate-500">
      {field.label}
      {field.type === "textarea" ? (
        <TextArea value={value} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <TextInput value={value} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function ContentEditor({ section, def, setContent, pickImage, uploading }: {
  section: CustomSection;
  def: ReturnType<typeof getSectionDef>;
  setContent: (k: string, v: unknown) => void;
  pickImage: (cb: (url: string) => void) => void;
  uploading: boolean;
}) {
  const c = section.content;
  const str = (k: string) => (typeof c[k] === "string" ? (c[k] as string) : "");

  const list = def.list;
  const items = list ? (Array.isArray(c[list.key]) ? (c[list.key] as unknown[]) : []) : [];
  const setItems = (next: unknown[]) => setContent(list!.key, next);

  return (
    <div>
      {def.fields.map((f) => (
        <Field key={f.key} field={f} value={str(f.key)} onChange={(v) => setContent(f.key, v)} pickImage={pickImage} uploading={uploading} />
      ))}

      {list ? (
        <div className="mt-2 rounded-lg border border-slate-200 p-2">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">{list.label}</p>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="rounded-md border border-slate-100 bg-white p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">{list.itemLabel} {i + 1}</span>
                  <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-600" title="Remove">✕</button>
                </div>
                {list.imageOnly ? (
                  <div className="flex items-center gap-2">
                    {typeof it === "string" && it ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it} alt="" className="h-12 w-12 rounded object-cover" />
                    ) : null}
                    <button onClick={() => pickImage((url) => setItems(items.map((x, j) => (j === i ? url : x))))} disabled={uploading} className="rounded-md bg-[#2b3a67] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#23315a] disabled:opacity-60">
                      {uploading ? "…" : it ? "Change" : "Upload"}
                    </button>
                  </div>
                ) : (
                  (list.fields ?? []).map((f) => {
                    const obj = (it ?? {}) as Record<string, unknown>;
                    const val = typeof obj[f.key] === "string" ? (obj[f.key] as string) : "";
                    return (
                      <Field key={f.key} field={f} value={val} uploading={uploading} pickImage={pickImage}
                        onChange={(v) => setItems(items.map((x, j) => (j === i ? { ...(x as object), [f.key]: v } : x)))} />
                    );
                  })
                )}
              </div>
            ))}
          </div>
          {!list.max || items.length < list.max ? (
            <button onClick={() => setItems([...items, list.imageOnly ? "" : structuredClone(list.defaultItem ?? {})])} className="mt-2 w-full rounded-md border border-dashed border-slate-300 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
              ＋ Add {list.itemLabel.toLowerCase()}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
