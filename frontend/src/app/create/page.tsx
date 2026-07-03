"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Draft } from "@/studio/draft";
import { loadDraft, saveDraft, draftFromPreset, draftFromDesign, setByPath } from "@/studio/draft";
import { hasEmbeddedMedia, flushEmbeddedMedia } from "@/studio/media";
import { getPreset, presets } from "@/templates/registry";
import {
  CoupleFields,
  FamilyFields,
  SaveDateFields,
  StoryFields,
  ScheduleFields,
  RsvpFields,
  CoverFields,
  SettingsPanel,
  FormatPanel,
  type PanelProps,
  type SelectedText,
} from "@/studio/panels";
import { getTheme } from "@/themes";
import { getMotif } from "@/motifs";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

type Phase = "caste" | "design" | "preview" | "build";

const COMMUNITIES = [
  { id: "kerala-christian", label: "Christian", sub: "Syrian · Latin · Marthoma · CSI" },
  { id: "hindu", label: "Hindu", sub: "Nair · Ezhava · Brahmin & more" },
  { id: "muslim", label: "Muslim", sub: "Mappila · Sunni" },
  { id: "secular", label: "Secular / Interfaith", sub: "Non-religious" },
];

type Option = {
  id: string;
  kind: "design" | "preset";
  name: string;
  community: string;
  previewUrl?: string;
  primary: string;
  accent: string;
  gradFrom: string;
  gradTo: string;
  icons: string[];
};

type Step = {
  id: string;
  frame: string;
  title: string;
  Comp: ((p: PanelProps) => React.ReactNode) | null;
};

const STEPS: Step[] = [
  { id: "couple", frame: "frame-couple", title: "The couple", Comp: CoupleFields },
  { id: "families", frame: "frame-families", title: "The families", Comp: FamilyFields },
  { id: "savedate", frame: "frame-couple", title: "Save the date", Comp: SaveDateFields },
  { id: "story", frame: "frame-story", title: "Your story", Comp: StoryFields },
  { id: "schedule", frame: "frame-schedule", title: "Schedule of events", Comp: ScheduleFields },
  { id: "rsvp", frame: "frame-rsvp", title: "RSVP", Comp: RsvpFields },
  { id: "cover", frame: "frame-couple", title: "Cover & music", Comp: CoverFields },
  { id: "details", frame: "frame-couple", title: "Date & contact", Comp: SettingsPanel },
  { id: "finish", frame: "frame-rsvp", title: "Finish & publish", Comp: null },
];

function Review({
  draft,
  user,
  msg,
  publishedUrl,
}: {
  draft: Draft;
  user: unknown;
  msg: string;
  publishedUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const c = draft.content;
  const names = `${c.couple.partner1.name || "—"} & ${c.couple.partner2.name || "—"}`;

  if (publishedUrl) {
    const wa = `https://wa.me/?text=${encodeURIComponent(`💍 You're invited to ${names}'s wedding! ${publishedUrl}`)}`;
    return (
      <div className="text-center">
        <p className="font-script text-3xl text-[#5a2338]">It's live! 🎉</p>
        <p className="mt-1 text-sm text-slate-500">Share your invitation:</p>
        <a href={publishedUrl} target="_blank" rel="noreferrer" className="mt-3 block break-all rounded-lg bg-slate-50 px-3 py-2 text-sm text-[#5a2338] underline">
          {publishedUrl}
        </a>
        <div className="mt-4 flex flex-col gap-2">
          <a href={wa} target="_blank" rel="noreferrer" className="rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">
            Share on WhatsApp
          </a>
          <button
            onClick={() => navigator.clipboard?.writeText(publishedUrl).then(() => setCopied(true))}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            {copied ? "Copied ✓" : "Copy link"}
          </button>
          <Link href="/dashboard" className="mt-1 text-sm text-slate-500 underline">My invitations →</Link>
        </div>
      </div>
    );
  }

  const rows: [string, string][] = [
    ["Couple", names],
    ["Wedding date", c.dateReveal?.eventDate || "—"],
    ["Events", String(c.schedule?.events?.length ?? 0)],
    ["Photos", String(c.story?.items?.length ?? 0)],
    ["Your email", draft.ownerEmail || "— (set in Date & contact)"],
  ];
  return (
    <div>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {rows.map(([k, v]) => (
          <li key={k} className="flex justify-between px-3 py-1.5 text-sm">
            <span className="text-slate-500">{k}</span>
            <span className="text-right font-medium text-slate-800">{v}</span>
          </li>
        ))}
      </ul>
      {!user ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Log in or sign up to publish — your design is saved and reopens right after.
        </p>
      ) : null}
      {msg ? <p className="mt-3 text-sm text-slate-600">{msg}</p> : null}
    </div>
  );
}

export default function CreateWizard() {
  const { user } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const suppressPost = useRef(false);

  const [phase, setPhase] = useState<Phase>("caste");
  const [community, setCommunity] = useState("kerala-christian");
  const [chosen, setChosen] = useState<Option | null>(null);
  const [designs, setDesigns] = useState<any[]>([]);

  const [embedReady, setEmbedReady] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [step, setStep] = useState(0);
  const [serverId, setServerId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [publishedUrl, setPublishedUrl] = useState("");
  const [selected, setSelected] = useState<SelectedText | null>(null);

  // initial routing: ?design / ?preset jump straight to build; else start at caste
  useEffect(() => {
    api.listDesigns().then(setDesigns).catch(() => setDesigns([]));
    const params = new URLSearchParams(window.location.search);
    const designId = params.get("design");
    const presetId = params.get("preset");
    (async () => {
      if (designId) {
        try {
          setDraft(draftFromDesign(await api.getDesign(designId)));
          setPhase("build");
          return;
        } catch {
          /* fall through */
        }
      }
      if (presetId) {
        const p = getPreset(presetId);
        if (p) {
          setDraft(draftFromPreset(p));
          setPhase("build");
          return;
        }
      }
      // returning from login (?resume=1) → restore the in-progress draft so the
      // design isn't lost, and drop them at the finish step ready to publish
      if (params.get("resume")) {
        const local = loadDraft();
        if (local) {
          setDraft(local);
          setStep(STEPS.length - 1);
          setPhase("build");
          return;
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (draft && !saveDraft(draft)) {
      setMsg("⚠ This browser's storage is full — recent changes aren't auto-saved. Publish to keep them.");
    }
  }, [draft]);

  // messages from the iframe preview: ready + inline (WYSIWYG) edits
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data?.type === "embed-ready") setEmbedReady(true);
      if (e.data?.type === "edit" && e.data.path) {
        suppressPost.current = true;
        setDraft((prev) => {
          if (!prev) return prev;
          const next: Draft = structuredClone(prev);
          setByPath(next.content as unknown as Record<string, unknown>, e.data.path, e.data.value);
          return next;
        });
      }
      if (e.data?.type === "move" && e.data.key) {
        setDraft((prev) => {
          if (!prev) return prev;
          const next: Draft = structuredClone(prev);
          // new embeds post {x, y}; older ones posted a vertical-only `value`
          const off = typeof e.data.x === "number" || typeof e.data.y === "number"
            ? { x: Math.round(e.data.x || 0), y: Math.round(e.data.y || 0) }
            : e.data.value;
          next.content.offsets = { ...(next.content.offsets || {}), [e.data.key]: off };
          return next;
        });
      }
      if (e.data?.type === "select" && e.data.path) {
        setSelected({ path: e.data.path, current: e.data.current });
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // push the live draft into the build iframe (skip echoes of inline edits)
  useEffect(() => {
    if (phase !== "build" || !embedReady || !draft) return;
    if (suppressPost.current) {
      suppressPost.current = false;
      return;
    }
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "render",
        payload: {
          templateId: draft.templateId,
          theme: draft.theme,
          motifId: draft.motifId,
          content: draft.content,
        },
      },
      "*",
    );
  }, [draft, embedReady, phase]);

  useEffect(() => {
    if (phase !== "build" || !embedReady) return;
    const t = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage({ type: "scrollTo", frame: STEPS[step].frame }, "*");
    }, 150);
    return () => clearTimeout(t);
  }, [step, embedReady, phase]);

  /* ----- caste / design selection helpers ----- */

  function optionsFor(comm: string): Option[] {
    const fromDesigns: Option[] = designs
      .filter((d) => d.community === comm)
      .map((d) => ({
        id: d.id,
        kind: "design" as const,
        name: d.name,
        community: comm,
        previewUrl: d.previewUrl,
        primary: d.colors.primary,
        accent: d.colors.accent,
        gradFrom: d.colors.gradientFrom,
        gradTo: d.colors.gradientTo,
        icons: Object.values(getMotif(comm).icons).slice(0, 4),
      }));
    const fromPresets: Option[] = presets
      .filter((p) => p.community === comm)
      .map((p) => {
        const t = getTheme(p.themeId);
        return {
          id: p.id,
          kind: "preset" as const,
          name: p.name,
          community: comm,
          primary: t.colors.primary,
          accent: t.colors.accent,
          gradFrom: t.colors.gradientFrom,
          gradTo: t.colors.gradientTo,
          icons: Object.values(getMotif(comm).icons).slice(0, 4),
        };
      });
    return [...fromDesigns, ...fromPresets].slice(0, 3);
  }

  async function selectChosen() {
    if (!chosen) return;
    if (chosen.kind === "design") {
      try {
        setDraft(draftFromDesign(await api.getDesign(chosen.id)));
      } catch {
        return;
      }
    } else {
      const p = getPreset(chosen.id);
      if (p) setDraft(draftFromPreset(p));
    }
    setStep(0);
    setPhase("build");
  }

  /* ----- build-phase helpers ----- */

  const update = (m: (d: Draft) => void) =>
    setDraft((prev) => {
      const n = structuredClone(prev!);
      m(n);
      return n;
    });

  const buildBody = (d: Draft) => ({
    templateId: d.templateId,
    themeId: d.theme.id,
    motifId: d.motifId,
    theme: d.theme,
    content: d.content,
    ownerEmail: d.ownerEmail || undefined,
  });

  const save = async (publishAfter: boolean) => {
    if (!draft) return;
    setBusy(true);
    setMsg("");
    try {
      // move any base64 photos/video out of the JSON into uploaded files, so the
      // saved invitation stays small and published pages load fast
      const flushed = structuredClone(draft);
      if (hasEmbeddedMedia(flushed.content)) {
        setMsg("Uploading photos…");
        await flushEmbeddedMedia(flushed.content);
        setDraft(flushed); // keep the URLs locally (autosaves, avoids re-upload)
        setMsg("");
      }

      let id = serverId;
      if (id) await api.updateInvitation(id, buildBody(flushed));
      else {
        const inv = await api.createInvitation(buildBody(flushed));
        id = inv.id;
        setServerId(id);
      }
      if (publishAfter) {
        const pub = await api.publishInvitation(id!);
        setPublishedUrl(`${window.location.origin}/i/${pub.slug}`);
      } else setMsg("Saved to your account ✓");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /* ============================ PHASE: CASTE ============================ */
  if (phase === "caste") {
    return (
      <div className="min-h-dvh bg-[#fff8f0] px-6 py-10">
        <div className="mx-auto max-w-2xl">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">← Home</Link>
          <h1 className="font-display mt-6 text-center text-2xl uppercase tracking-[0.12em] text-[#5a2338]">
            Create your invitation
          </h1>
          <p className="font-body mt-2 text-center text-lg italic text-slate-500">
            Which community is the wedding?
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {COMMUNITIES.map((c) => (
              <button
                key={c.id}
                onClick={() => { setCommunity(c.id); setPhase("design"); }}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[#d95f48] hover:shadow-lg"
              >
                <p className="font-display text-lg tracking-[0.08em] text-[#5a2338]">{c.label}</p>
                <p className="mt-1 text-sm text-slate-500">{c.sub}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ============================ PHASE: DESIGN ============================ */
  if (phase === "design") {
    const opts = optionsFor(community);
    return (
      <div className="min-h-dvh bg-[#fff8f0] px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <button onClick={() => setPhase("caste")} className="text-sm text-slate-500 hover:text-slate-800">← Community</button>
          <h1 className="font-display mt-6 text-center text-2xl uppercase tracking-[0.12em] text-[#5a2338]">
            Choose a design
          </h1>
          <p className="font-body mt-2 text-center text-lg italic text-slate-500">
            {COMMUNITIES.find((c) => c.id === community)?.label} — pick a style to preview
          </p>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {opts.map((o) => (
              <button
                key={`${o.kind}-${o.id}`}
                onClick={() => { setChosen(o); setPhase("preview"); }}
                className="group overflow-hidden rounded-2xl bg-white text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-56 bg-cover bg-center" style={o.previewUrl ? { backgroundImage: `url(${o.previewUrl})` } : { background: `linear-gradient(135deg, ${o.gradFrom}, ${o.gradTo})` }}>
                  {!o.previewUrl ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-script text-5xl" style={{ color: o.primary }}>S &amp; L</span>
                      <span className="font-display mt-1 text-[10px] uppercase tracking-[0.2em]" style={{ color: o.accent }}>{o.icons.join("  ")}</span>
                    </div>
                  ) : null}
                </div>
                <div className="p-4 text-center">
                  <p className="font-display text-sm uppercase tracking-[0.12em] text-[#5a2338]">{o.name}</p>
                  <span className="font-display mt-2 inline-block text-[11px] uppercase tracking-[0.16em] text-[#c98f2e] group-hover:underline">Preview →</span>
                </div>
              </button>
            ))}
            {opts.length === 0 ? <p className="col-span-full text-center text-slate-400">No designs for this community yet.</p> : null}
          </div>
        </div>
      </div>
    );
  }

  /* ============================ PHASE: PREVIEW ============================ */
  if (phase === "preview" && chosen) {
    return (
      <div className="flex h-dvh flex-col bg-[#dbe6ef]">
        <header className="flex shrink-0 items-center justify-between gap-2 bg-white px-4 py-2.5 shadow-sm">
          <button onClick={() => setPhase("design")} className="text-sm text-slate-500 hover:text-slate-800">← Designs</button>
          <span className="font-display text-[13px] uppercase tracking-[0.12em] text-[#5a2338]">{chosen.name}</span>
          <span className="w-16" />
        </header>
        <main className="flex min-h-0 flex-1 items-center justify-center p-3">
          <div className="aspect-[9/16] h-full max-h-full overflow-hidden rounded-[1.75rem] border border-slate-300 bg-white shadow-2xl">
            <iframe src={`/preview/${chosen.id}`} title="Live sample" className="h-full w-full border-0" />
          </div>
        </main>
        <div className="shrink-0 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center shadow-[0_-8px_24px_rgba(20,30,60,0.1)]">
          <button onClick={selectChosen} className="rounded-lg bg-[#d95f48] px-8 py-3 text-sm font-medium text-white hover:bg-[#c14e38]">
            Select this design →
          </button>
        </div>
      </div>
    );
  }

  /* ============================ PHASE: BUILD ============================ */
  if (!draft) {
    return <div className="flex h-dvh items-center justify-center text-slate-400">Loading…</div>;
  }

  const current = STEPS[step];
  const isFinish = current.id === "finish";
  const pct = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="flex h-dvh flex-col bg-[#dbe6ef]">
      <header className="flex shrink-0 items-center justify-between gap-2 bg-white px-4 py-2.5 shadow-sm">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">← Exit</Link>
        <span className="font-display text-[13px] uppercase tracking-[0.12em] text-[#5a2338]">Create your invitation</span>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">✏️ You can edit live</span>
      </header>
      <div className="h-1 w-full bg-slate-200">
        <div className="h-full bg-[#d95f48] transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* device-frame live editable preview */}
        <main className="flex h-[46dvh] shrink-0 items-center justify-center p-3 lg:h-auto lg:min-h-0 lg:flex-1">
          <div className="aspect-[9/16] h-full max-h-full overflow-hidden rounded-[1.75rem] border border-slate-300 bg-white shadow-2xl">
            <iframe ref={iframeRef} src="/studio/embed?edit=1" title="Live preview — click any text to edit" className="h-full w-full border-0" />
          </div>
        </main>

        {/* form panel */}
        <aside className="flex min-h-0 flex-1 flex-col border-t border-slate-200 bg-white lg:w-[400px] lg:flex-none lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2 px-5 pt-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#d95f48] text-xs text-white">✎</span>
            <div>
              <p className="font-display text-[13px] uppercase tracking-[0.12em] text-[#5a2338]">{current.title}</p>
              <p className="text-[11px] text-slate-400">Step {step + 1} of {STEPS.length} · or click text on the preview to edit</p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
            {isFinish || !current.Comp ? (
              <Review draft={draft} user={user} msg={msg} publishedUrl={publishedUrl} />
            ) : (
              <current.Comp draft={draft} update={update} />
            )}
          </div>

          {!publishedUrl ? (
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                ← Back
              </button>

              {isFinish ? (
                user ? (
                  <div className="flex gap-2">
                    <button onClick={() => save(false)} disabled={busy} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60">
                      {busy ? "…" : "Save draft"}
                    </button>
                    <button onClick={() => save(true)} disabled={busy} className="rounded-lg bg-[#d95f48] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#c14e38] disabled:opacity-60">
                      {busy ? "…" : "Publish"}
                    </button>
                  </div>
                ) : (
                  <Link href={`/login?redirect=${encodeURIComponent("/create?resume=1")}`} className="rounded-lg bg-[#d95f48] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#c14e38]">
                    Log in to publish
                  </Link>
                )
              ) : (
                <button
                  onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                  className="rounded-lg bg-[#d95f48] px-8 py-2.5 text-sm font-medium text-white hover:bg-[#c14e38]"
                >
                  Next →
                </button>
              )}
            </div>
          ) : null}
        </aside>
      </div>

      {selected ? (
        <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 lg:left-auto lg:right-[420px] lg:translate-x-0">
          <FormatPanel draft={draft} update={update} selected={selected} onClose={() => setSelected(null)} />
        </div>
      ) : null}
    </div>
  );
}
