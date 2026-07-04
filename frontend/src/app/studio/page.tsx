"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Draft } from "@/studio/draft";
import { loadDraft, saveDraft, defaultDraft, defaultCustomDraft, draftFromPreset, setByPath } from "@/studio/draft";
import { hasEmbeddedMedia, flushEmbeddedMedia } from "@/studio/media";
import { getPreset } from "@/templates/registry";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { ImageEditorModal, urlToDataUrl } from "@/components/ImageEditorModal";
import {
  DesignPanel,
  ContentPanel,
  ColorsPanel,
  PhotosPanel,
  SettingsPanel,
  FormatPanel,
  type PanelProps,
  type SelectedText,
} from "@/studio/panels";

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
  // live-editable preview (iframe) wiring — same as the Create builder
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null); // read-only "guest view" (3rd pane, wide screens)
  const suppressPost = useRef(false);
  const draftRef = useRef<Draft | null>(null); // latest draft, for pushing to an iframe the moment it's ready
  const [embedReady, setEmbedReady] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [selected, setSelected] = useState<SelectedText | null>(null);
  // photo clicked in the WYSIWYG preview → its content path + editable data URL
  const [photoEdit, setPhotoEdit] = useState<{ path: string; src: string } | null>(null);

  const renderPayload = (d: Draft) => ({
    type: "render" as const,
    payload: { templateId: d.templateId, theme: d.theme, motifId: d.motifId, content: d.content },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const presetId = params.get("preset");
    const startNew = params.get("new");
    if (startNew === "custom") {
      setDraft(defaultCustomDraft());
      return;
    }
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
    draftRef.current = draft;
    if (draft && !saveDraft(draft)) {
      setMsg("⚠ This browser's storage is full — recent changes aren't auto-saved. Save or publish to keep them.");
    }
  }, [draft]);

  // messages from the editable preview: ready + inline (WYSIWYG) edits
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data?.type === "embed-ready") {
        // both iframes announce readiness — flag whichever one sent it AND push it
        // the current draft immediately (covers late loads, reloads and re-inits,
        // where the ready flag was already set so no effect would re-post).
        if (e.source === previewRef.current?.contentWindow) setPreviewReady(true);
        else setEmbedReady(true);
        const d = draftRef.current;
        if (d && e.source) (e.source as Window).postMessage(renderPayload(d), "*");
      }
      if (e.data?.type === "edit" && e.data.path) {
        suppressPost.current = true;
        setDraft((prev) => {
          if (!prev) return prev;
          const next: Draft = structuredClone(prev);
          setByPath(next.content as unknown as Record<string, unknown>, e.data.path, e.data.value);
          // an inline venue/address edit invalidates that event's pasted map
          // link — clear it so Get Directions never points at the old place
          const ev = /^schedule\.events\.(\d+)\.(venue|address)$/.exec(e.data.path);
          if (ev && next.content.schedule.events[Number(ev[1])]) {
            next.content.schedule.events[Number(ev[1])].mapUrl = "";
          }
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
      if (e.data?.type === "photo" && e.data.path) {
        const path = e.data.path as string;
        const current = path
          .split(".")
          .reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k as never], draftRef.current?.content);
        if (typeof current === "string" && current) {
          urlToDataUrl(current)
            .then((src) => setPhotoEdit({ path, src }))
            .catch(() => setMsg("⚠ Couldn't load that photo for editing — replace it from the panel instead."));
        }
      }
      if (e.data?.type === "select" && e.data.path) {
        setSelected({ path: e.data.path, current: e.data.current });
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // push the live draft into both preview iframes
  useEffect(() => {
    if (!draft) return;
    const payload = renderPayload(draft);
    // the read-only "guest view" always mirrors the latest draft
    if (previewReady) previewRef.current?.contentWindow?.postMessage(payload, "*");
    // the editable view skips echoing back its own inline edit (keeps the caret)
    if (embedReady) {
      if (suppressPost.current) suppressPost.current = false;
      else iframeRef.current?.contentWindow?.postMessage(payload, "*");
    }
  }, [draft, embedReady, previewReady]);

  // expanding a section group scrolls the preview to that section
  useEffect(() => {
    function onScroll(e: Event) {
      const frame = (e as CustomEvent).detail;
      if (frame) iframeRef.current?.contentWindow?.postMessage({ type: "scrollTo", frame }, "*");
    }
    window.addEventListener("preview:scrollTo", onScroll);
    return () => window.removeEventListener("preview:scrollTo", onScroll);
  }, []);

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

  // upload any inline base64 media (photos / intro video / crest logo) and keep
  // the returned URLs locally so the saved invitation JSON stays small.
  const flushMedia = async (): Promise<Draft> => {
    const flushed = structuredClone(draft!);
    if (hasEmbeddedMedia(flushed.content)) {
      setMsg("Uploading media…");
      await flushEmbeddedMedia(flushed.content);
      setDraft(flushed);
      setMsg("");
    }
    return flushed;
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setMsg("");
    try {
      const flushed = await flushMedia();
      if (serverId) {
        await api.updateInvitation(serverId, buildBody(flushed));
      } else {
        const inv = await api.createInvitation(buildBody(flushed));
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
      const flushed = await flushMedia();
      let id = serverId;
      if (id) {
        await api.updateInvitation(id, buildBody(flushed));
      } else {
        const inv = await api.createInvitation(buildBody(flushed));
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

        {/* previews: editable (middle) + a read-only "guest view" (right, wide screens) */}
        <main className="flex min-h-0 flex-1 bg-slate-200">
          {/* editable preview — click any text/photo to edit inline */}
          <div className="flex min-h-0 flex-1 flex-col items-center p-3">
            <p className="mb-2 shrink-0 text-center text-[11px] font-medium text-slate-500">
              ✎ Edit — click any text or photo
            </p>
            <div className="flex min-h-0 w-full flex-1 items-center justify-center">
              <div className="aspect-[9/16] h-full max-h-full overflow-hidden rounded-[1.75rem] border border-slate-300 bg-white shadow-2xl">
                <iframe ref={iframeRef} src="/studio/embed?edit=1" title="Live editable preview — click text to edit" className="h-full w-full border-0" />
              </div>
            </div>
          </div>

          {/* guest view — how it looks to guests, with animations. Wide screens only. */}
          <div className="hidden min-h-0 flex-1 flex-col items-center border-l border-slate-300 p-3 2xl:flex">
            <p className="mb-2 shrink-0 text-center text-[11px] font-medium text-slate-500">
              👁 Guest view — live result with animations
            </p>
            <div className="flex min-h-0 w-full flex-1 items-center justify-center">
              <div className="aspect-[9/16] h-full max-h-full overflow-hidden rounded-[1.75rem] border border-slate-300 bg-white shadow-2xl">
                <iframe ref={previewRef} src="/studio/embed" title="Guest view — final animated result" className="h-full w-full border-0" />
              </div>
            </div>
          </div>
        </main>
      </div>

      {selected ? (
        <div className="fixed right-5 top-16 z-50">
          <FormatPanel draft={draft} update={update} selected={selected} onClose={() => setSelected(null)} />
        </div>
      ) : null}

      {photoEdit ? (
        <ImageEditorModal
          src={photoEdit.src}
          title="Edit photo"
          mime="image/jpeg"
          maxDim={1280}
          onApply={(url) => {
            update((d) => setByPath(d.content as unknown as Record<string, unknown>, photoEdit.path, url));
            setPhotoEdit(null);
          }}
          onClose={() => setPhotoEdit(null)}
        />
      ) : null}
    </div>
  );
}
