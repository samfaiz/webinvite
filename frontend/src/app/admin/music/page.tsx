"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, type Track } from "@/lib/api";

const inputCls =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400";

export default function AdminMusicPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [mood, setMood] = useState("");
  const [url, setUrl] = useState("");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [previewing, setPreviewing] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const refresh = () => api.adminListTracks().then(setTracks).catch((e) => setMsg((e as Error).message));

  useEffect(() => {
    if (loading) return;
    if (!user) return void router.push("/login");
    if (user.role !== "admin") return void router.push("/dashboard");
    refresh();
  }, [loading, user, router]);

  useEffect(() => () => audioRef.current?.pause(), []);

  if (loading || !user || user.role !== "admin") {
    return <div className="flex h-dvh items-center justify-center text-slate-400">Loading…</div>;
  }

  const reset = () => {
    setEditingId(null);
    setTitle("");
    setMood("");
    setUrl("");
    setActive(true);
    setMsg("");
  };

  const startEdit = (t: Track) => {
    setEditingId(t.id);
    setTitle(t.title);
    setMood(t.mood ?? "");
    setUrl(t.url);
    setActive(t.active);
    setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onUpload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setMsg("");
    try {
      const { url: u } = await api.uploadAudio(file);
      setUrl(u);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!title.trim()) return setMsg("Give the track a title.");
    if (!url.trim()) return setMsg("Upload a file or paste a song link.");
    setBusy(true);
    setMsg("");
    try {
      const body = { title: title.trim(), mood: mood.trim() || undefined, url: url.trim(), active };
      if (editingId) await api.updateTrack(editingId, body);
      else await api.createTrack(body);
      reset();
      refresh();
      setMsg("Saved ✓");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (t: Track) => {
    await api.updateTrack(t.id, { title: t.title, mood: t.mood ?? undefined, url: t.url, active: !t.active });
    refresh();
  };

  const remove = (t: Track) => {
    if (!confirm(`Delete "${t.title}"? Couples already using it keep their saved copy.`)) return;
    api.deleteTrack(t.id).then(refresh);
  };

  const preview = (u: string) => {
    const a = audioRef.current;
    if (!a) return;
    if (previewing === u) {
      a.pause();
      setPreviewing(null);
      return;
    }
    a.src = u;
    a.play().then(() => setPreviewing(u)).catch(() => setPreviewing(null));
  };

  return (
    <div className="min-h-dvh bg-[#f4f1ea]">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-800">← Admin</Link>
          <span className="font-display text-lg uppercase tracking-[0.12em] text-[#2b3a67]">Music library</span>
        </div>
      </header>

      <audio ref={audioRef} onEnded={() => setPreviewing(null)} className="hidden" />

      <main className="mx-auto max-w-2xl px-6 py-8">
        <p className="mb-5 text-sm text-slate-500">
          Tracks couples can pick for their invitation. Upload an <strong>MP3</strong> (you host it) or paste a link.
          Use only music you’re licensed to use — replace the “(sample)” seeds with proper tracks.
        </p>

        {/* add / edit */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm uppercase tracking-[0.12em] text-[#2b3a67]">{editingId ? "Edit track" : "Add a track"}</h2>
            {editingId ? <button onClick={reset} className="text-xs text-slate-500 underline hover:text-slate-800">Cancel · new</button> : null}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title — e.g. A Thousand Years" />
            <input className={inputCls} value={mood} onChange={(e) => setMood(e.target.value)} placeholder="Mood — e.g. Romantic (optional)" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className={`cursor-pointer rounded-md px-3 py-2 text-xs font-medium text-white ${uploading ? "bg-slate-400" : "bg-[#2b3a67] hover:bg-[#23315a]"}`}>
              {uploading ? "Uploading…" : "Upload MP3"}
              <input type="file" accept="audio/*" className="hidden" disabled={uploading} onChange={(e) => { onUpload(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            {url ? (
              <button type="button" onClick={() => preview(url)} className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">
                {previewing === url ? "❚❚ Stop" : "▶ Preview"}
              </button>
            ) : null}
            <label className="ml-auto flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Visible to couples
            </label>
          </div>

          <input className={`${inputCls} mt-3`} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="…or paste a song link (https://…/song.mp3)" />

          <div className="mt-4 flex items-center gap-3">
            <button onClick={save} disabled={busy} className="rounded-lg bg-[#2b3a67] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#23315a] disabled:opacity-60">
              {busy ? "Saving…" : editingId ? "Save changes" : "Add track"}
            </button>
            {msg ? <span className="text-sm text-slate-500">{msg}</span> : null}
          </div>
        </section>

        {/* list */}
        <h3 className="font-display mt-8 text-sm uppercase tracking-[0.12em] text-[#2b3a67]">Library ({tracks.length})</h3>
        <div className="mt-3 space-y-2">
          {tracks.map((t) => (
            <div key={t.id} className={`flex items-center gap-3 rounded-lg border bg-white p-3 ${editingId === t.id ? "border-[#2b3a67] ring-1 ring-[#2b3a67]/30" : "border-slate-200"}`}>
              <button onClick={() => preview(t.url)} aria-label="Preview" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#2b3a67] text-white">
                {previewing === t.url ? "❚❚" : "▶"}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700">{t.title}{!t.active ? <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-600">hidden</span> : null}</p>
                <p className="truncate text-[11px] text-slate-400">{t.mood ? `${t.mood} · ` : ""}{t.url}</p>
              </div>
              <button onClick={() => toggleActive(t)} className="shrink-0 text-[11px] text-slate-500 hover:underline">{t.active ? "Hide" : "Show"}</button>
              <button onClick={() => startEdit(t)} className="shrink-0 text-[11px] font-medium text-[#2b3a67] hover:underline">Edit</button>
              <button onClick={() => remove(t)} className="shrink-0 text-[11px] text-rose-600 hover:underline">Delete</button>
            </div>
          ))}
          {tracks.length === 0 ? <p className="text-sm text-slate-400">No tracks yet.</p> : null}
        </div>
      </main>
    </div>
  );
}
