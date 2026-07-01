"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { getTheme, themeList } from "@/themes";
import { getMotif } from "@/motifs";
import { templates } from "@/templates/registry";
import { sampleSurajLibina } from "@/data/sampleSurajLibina";
import { Field, TextInput, Select, ColorInput, Btn } from "@/studio/ui";
import type { Theme } from "@/engine/types";

const COMMUNITIES = [
  { value: "kerala-christian", label: "Christian" },
  { value: "hindu", label: "Hindu" },
  { value: "muslim", label: "Muslim" },
  { value: "secular", label: "Secular" },
];

const FONTS = [
  { value: "var(--font-cinzel)", label: "Cinzel (serif caps)" },
  { value: "var(--font-cormorant)", label: "Cormorant (serif)" },
  { value: "var(--font-greatvibes)", label: "Great Vibes (script)" },
  { value: "var(--font-jost)", label: "Jost (sans)" },
];

const COLOR_TOKENS: { key: keyof Theme["colors"]; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent (gold)" },
  { key: "text", label: "Text" },
  { key: "muted", label: "Muted" },
  { key: "bg", label: "Background" },
  { key: "surface", label: "Surface" },
  { key: "gradientFrom", label: "Gradient from" },
  { key: "gradientTo", label: "Gradient to" },
];

const SECTIONS: { key: string; label: string }[] = [
  { key: "hero", label: "Hero / Couple" },
  { key: "families", label: "Families" },
  { key: "story", label: "Our Story" },
  { key: "schedule", label: "Schedule" },
  { key: "rsvp", label: "RSVP" },
  { key: "all", label: "Fallback (all sections)" },
  { key: "envelopeCorner", label: "Envelope corner art (PNG, optional)" },
];

export default function AdminDesignsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const base = getTheme("dusty-blue");
  const [name, setName] = useState("");
  const [community, setCommunity] = useState("kerala-christian");
  const [templateId, setTemplateId] = useState("flagship-lakecomo");
  const [colors, setColors] = useState<Theme["colors"]>({ ...base.colors });
  const [fonts, setFonts] = useState<Theme["fonts"]>({ ...base.fonts });
  const [particles, setParticles] = useState<Theme["particles"]>({ ...base.particles });
  const [backgrounds, setBackgrounds] = useState<Record<string, string>>({});
  const [designs, setDesigns] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [embedReady, setEmbedReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) return void router.push("/login");
    if (user.role !== "admin") return void router.push("/dashboard");
    api.adminListDesigns().then(setDesigns).catch((e) => setMsg((e as Error).message));
  }, [loading, user, router]);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data?.type === "embed-ready") setEmbedReady(true);
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // push the in-progress design into the iframe preview
  useEffect(() => {
    if (!embedReady) return;
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "render",
        payload: {
          templateId,
          theme: { id: "preview", name: name || "Preview", colors, fonts, particles, backgrounds },
          motifId: community,
          content: sampleSurajLibina,
        },
      },
      "*",
    );
  }, [embedReady, templateId, name, colors, fonts, particles, backgrounds, community]);

  if (loading || !user || user.role !== "admin") {
    return <div className="flex h-dvh items-center justify-center text-slate-400">Loading…</div>;
  }

  const refresh = () => api.adminListDesigns().then(setDesigns).catch(() => {});

  const prefill = (themeId: string) => {
    const t = getTheme(themeId);
    setColors({ ...t.colors });
    setFonts({ ...t.fonts });
    setParticles({ ...t.particles });
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setCommunity("kerala-christian");
    setTemplateId("flagship-lakecomo");
    setColors({ ...base.colors });
    setFonts({ ...base.fonts });
    setParticles({ ...base.particles });
    setBackgrounds({});
    setStatus({});
  };

  // load an existing design into the form so its images/colours can be edited
  const startEdit = (d: any) => {
    setEditingId(d.id);
    setName(d.name);
    setCommunity(d.community);
    setTemplateId(d.templateId);
    setColors({ ...base.colors, ...d.colors });
    setFonts({ ...base.fonts, ...d.fonts });
    setParticles({ ...base.particles, ...d.particles });
    setBackgrounds({ ...(d.backgrounds || {}) });
    setStatus({});
    setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const upload = async (file: File | undefined, key: string) => {
    if (!file) return;
    setStatus((s) => ({ ...s, [key]: "Uploading…" }));
    try {
      const { url } = await api.uploadImage(file);
      setBackgrounds((b) => ({ ...b, [key]: url }));
      setStatus((s) => ({ ...s, [key]: "✓ uploaded" }));
    } catch (e) {
      setStatus((s) => ({ ...s, [key]: `⚠ ${(e as Error).message}` }));
    }
  };

  const save = async () => {
    if (!name.trim()) return setMsg("Please name the design.");
    setBusy(true);
    setMsg("");
    const body = {
      name: name.trim(),
      community,
      templateId,
      colors,
      fonts,
      particles,
      backgrounds,
      previewUrl: backgrounds.hero || backgrounds.all,
    };
    try {
      if (editingId) {
        await api.updateDesign(editingId, body);
        setMsg("Changes saved ✓");
      } else {
        await api.createDesign(body);
        setMsg("Design saved ✓");
      }
      resetForm();
      refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#f4f1ea]">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-800">← Admin</Link>
          <span className="font-display text-lg uppercase tracking-[0.12em] text-[#2b3a67]">Designs</span>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1fr_400px]">
        {/* form */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl uppercase tracking-[0.1em] text-[#2b3a67]">
              {editingId ? "Edit design" : "Create a design"}
            </h2>
            {editingId ? (
              <button onClick={resetForm} className="text-xs text-slate-500 underline hover:text-slate-800">
                Cancel edit · start new
              </button>
            ) : null}
          </div>
          <p className="mb-4 text-sm text-slate-500">
            {editingId
              ? "Replace any background image, tweak the colours & fonts, then save your changes."
              : "Upload background art per section, set the colours & fonts, and assign a community. Couples will pick this and just fill in their details."}
          </p>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Design name"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Royal Lake Como" /></Field>
              <Field label="Community / caste"><Select value={community} onChange={setCommunity} options={COMMUNITIES} /></Field>
              <Field label="Base layout"><Select value={templateId} onChange={setTemplateId} options={templates.map((t) => ({ value: t.id, label: t.name }))} /></Field>
              <Field label="Prefill colours from theme"><Select value="" onChange={(v) => v && prefill(v)} options={[{ value: "", label: "— choose —" }, ...themeList.map((t) => ({ value: t.id, label: t.name }))]} /></Field>
            </div>

            <p className="mb-2 mt-4 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Background art</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SECTIONS.map((s) => (
                <div key={s.key} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2">
                  <div className="h-12 w-16 shrink-0 overflow-hidden rounded bg-slate-100">
                    {backgrounds[s.key] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={backgrounds[s.key]} alt={s.label} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[9px] text-slate-400">none</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-600">{s.label}</p>
                    <input type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0], s.key)} className="mt-1 block w-full text-[11px] text-slate-500 file:mr-2 file:rounded file:border-0 file:bg-slate-800 file:px-2 file:py-1 file:text-white" />
                    {status[s.key] ? (
                      <p className="mt-0.5 text-[10px]" style={{ color: status[s.key].startsWith("⚠") ? "#dc2626" : "#16a34a" }}>
                        {status[s.key]}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <p className="mb-2 mt-4 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Colours</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {COLOR_TOKENS.map((t) => (
                <Field key={t.key} label={t.label}>
                  <ColorInput value={colors[t.key]} onChange={(v) => setColors((c) => ({ ...c, [t.key]: v }))} />
                </Field>
              ))}
            </div>

            <p className="mb-2 mt-4 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Fonts & particles</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Field label="Display"><Select value={fonts.display} onChange={(v) => setFonts((f) => ({ ...f, display: v }))} options={FONTS} /></Field>
              <Field label="Script"><Select value={fonts.script} onChange={(v) => setFonts((f) => ({ ...f, script: v }))} options={FONTS} /></Field>
              <Field label="Body"><Select value={fonts.body} onChange={(v) => setFonts((f) => ({ ...f, body: v }))} options={FONTS} /></Field>
              <Field label="Particles"><Select value={particles.type} onChange={(v) => setParticles((p) => ({ ...p, type: v as Theme["particles"]["type"] }))} options={[{ value: "petals", label: "Petals" }, { value: "sparkles", label: "Sparkles" }, { value: "none", label: "None" }]} /></Field>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Btn variant="primary" onClick={save} {...(busy ? { disabled: true } : {})}>{busy ? "Saving…" : editingId ? "Save changes" : "Save design"}</Btn>
              {msg ? <span className="text-sm text-slate-500">{msg}</span> : null}
            </div>
          </div>

          {/* existing designs */}
          <h3 className="font-display mt-8 text-lg uppercase tracking-[0.1em] text-[#2b3a67]">Existing designs ({designs.length})</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {designs.map((d) => (
              <div
                key={d.id}
                className={`overflow-hidden rounded-lg border bg-white ${editingId === d.id ? "border-[#2b3a67] ring-2 ring-[#2b3a67]/30" : "border-slate-200"}`}
              >
                <div className="h-24 bg-slate-100">
                  {d.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.previewUrl} alt={d.name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="p-2">
                  <p className="truncate text-xs font-medium text-slate-700">{d.name}</p>
                  <p className="text-[10px] text-slate-400">{getMotif(d.community).name}</p>
                  <div className="mt-1 flex items-center gap-3">
                    <button
                      onClick={() => startEdit(d)}
                      className="text-[10px] font-medium text-[#2b3a67] hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete "${d.name}"?`)) api.deleteDesign(d.id).then(refresh); }}
                      className="text-[10px] text-rose-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {designs.length === 0 ? <p className="text-sm text-slate-400">No designs yet.</p> : null}
          </div>
        </div>

        {/* live device preview */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-center text-[11px] uppercase tracking-[0.16em] text-slate-400">Live preview</p>
          <div className="mx-auto aspect-[9/16] w-full max-w-[300px] overflow-hidden rounded-[1.5rem] border border-slate-300 bg-white shadow-xl">
            <iframe ref={iframeRef} src="/studio/embed" title="Live preview" className="h-full w-full border-0" />
          </div>
        </div>
      </main>
    </div>
  );
}
