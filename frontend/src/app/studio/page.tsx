"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Draft } from "@/studio/draft";
import { loadDraft, saveDraft, defaultDraft, draftFromPreset } from "@/studio/draft";
import { getPreset } from "@/templates/registry";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  DesignPanel,
  ContentPanel,
  ColorsPanel,
  PhotosPanel,
  SettingsPanel,
  type PanelProps,
} from "@/studio/panels";
import { getTemplateComponent } from "@/templates/components";
import { getMotif } from "@/motifs";

const TABS: { id: string; label: string; Comp: (p: PanelProps) => React.ReactNode }[] = [
  { id: "design", label: "Design", Comp: DesignPanel },
  { id: "content", label: "Content", Comp: ContentPanel },
  { id: "colors", label: "Colors", Comp: ColorsPanel },
  { id: "photos", label: "Photos", Comp: PhotosPanel },
  { id: "settings", label: "Settings", Comp: SettingsPanel },
];

export default function StudioPage() {
  const { user } = useAuth();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [tab, setTab] = useState("design");
  const [serverId, setServerId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const presetId = params.get("preset");
    (async () => {
      if (id) {
        try {
          const inv = await api.getInvitation(id);
          setServerId(inv.id);
          setDraft({
            templateId: inv.templateId,
            motifId: inv.motifId,
            theme: inv.theme,
            content: inv.content,
            ownerEmail: inv.ownerEmail || "",
          });
          return;
        } catch {
          /* not found / not authed — fall back to local draft */
        }
      }
      const preset = presetId ? getPreset(presetId) : undefined;
      setDraft(preset ? draftFromPreset(preset) : loadDraft());
    })();
  }, []);
  useEffect(() => {
    if (draft) saveDraft(draft);
  }, [draft]);

  if (!draft) {
    return <div className="flex h-screen items-center justify-center text-slate-400">Loading Studio…</div>;
  }

  const update = (mutator: (d: Draft) => void) =>
    setDraft((prev) => {
      const next: Draft = structuredClone(prev!);
      mutator(next);
      return next;
    });

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft.content.meta.slug || "invitation"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const buildBody = (d: Draft) => ({
    templateId: d.templateId,
    themeId: d.theme.id,
    motifId: d.motifId,
    theme: d.theme,
    content: d.content,
    ownerEmail: d.ownerEmail || undefined,
  });

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setMsg("");
    try {
      if (serverId) {
        await api.updateInvitation(serverId, buildBody(draft));
      } else {
        const inv = await api.createInvitation(buildBody(draft));
        setServerId(inv.id);
        window.history.replaceState(null, "", `/studio?id=${inv.id}`);
      }
      setMsg("Saved to your account ✓");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!draft) return;
    setSaving(true);
    setMsg("");
    try {
      let id = serverId;
      if (id) {
        await api.updateInvitation(id, buildBody(draft));
      } else {
        const inv = await api.createInvitation(buildBody(draft));
        id = inv.id;
        setServerId(id);
        window.history.replaceState(null, "", `/studio?id=${id}`);
      }
      const pub = await api.publishInvitation(id!);
      setMsg(`Published → ${window.location.origin}/i/${pub.slug}`);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const ActivePanel = TABS.find((t) => t.id === tab)!.Comp;
  const Template = getTemplateComponent(draft.templateId);

  return (
    <div className="flex h-dvh flex-col bg-slate-100">
      {/* top bar */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Link href={user ? "/dashboard" : "/gallery"} className="text-sm text-slate-500 hover:text-slate-800">
            ← {user ? "Dashboard" : "Gallery"}
          </Link>
          <span className="font-semibold text-slate-800">Studio</span>
          {msg ? (
            <span className="max-w-[40ch] truncate text-[11px] text-slate-500">{msg}</span>
          ) : (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-600">Auto-saved locally</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportJson} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Export</button>
          <button
            onClick={() => { if (confirm("Reset all changes to defaults?")) { setServerId(null); setDraft(defaultDraft()); } }}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
          >Reset</button>
          <Link href="/studio/preview" target="_blank" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Preview ↗</Link>
          {user ? (
            <>
              <button onClick={save} disabled={saving} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60">
                {saving ? "…" : "Save"}
              </button>
              <button onClick={publish} disabled={saving} className="rounded-lg bg-[#2b3a67] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#23315a] disabled:opacity-60">
                {saving ? "…" : "Publish"}
              </button>
            </>
          ) : (
            <Link href="/login" className="rounded-lg bg-[#2b3a67] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#23315a]">
              Log in to save &amp; publish
            </Link>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* controls */}
        <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white lg:w-[380px] lg:border-b-0 lg:border-r">
          <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-100 px-2 py-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: tab === t.id ? "#1e293b" : "transparent",
                  color: tab === t.id ? "#fff" : "#475569",
                }}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <ActivePanel draft={draft} update={update} />
          </div>
        </aside>

        {/* live preview — transform creates a containing block so the template's
            fixed elements (particles, music toggle) stay inside this pane */}
        <main className="min-h-0 flex-1 overflow-y-auto bg-slate-200 p-4" style={{ transform: "translateZ(0)" }}>
          <div className="mx-auto max-w-[440px] overflow-hidden rounded-2xl bg-white shadow-xl">
            <Template
              content={draft.content}
              theme={draft.theme}
              motif={getMotif(draft.motifId)}
              intro={false}
              compact
            />
          </div>
        </main>
      </div>
    </div>
  );
}
