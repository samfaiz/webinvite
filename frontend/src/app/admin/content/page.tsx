"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, type CmsDoc } from "@/lib/api";
import { AdminHeader } from "../AdminHeader";

type Tab = "post" | "page";

export default function AdminContentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("post");
  const [docs, setDocs] = useState<CmsDoc[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async (t: Tab) => {
    setDocs(null);
    setErr("");
    try {
      setDocs(await api.adminListContent(t));
    } catch (e) {
      setErr((e as Error).message);
      setDocs([]);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) return void router.push("/login");
    if (user.role !== "admin") return void router.push("/dashboard");
    load(tab);
  }, [loading, user, router, tab, load]);

  const createNew = async () => {
    setBusy(true);
    setErr("");
    try {
      const slug = `${tab === "post" ? "post" : "page"}-${Date.now().toString(36)}`;
      const doc = await api.createContent({ type: tab, slug, title: "Untitled", blocks: [] });
      router.push(`/admin/content/${doc.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  const togglePublish = async (d: CmsDoc) => {
    try {
      const updated = d.status === "published" ? await api.unpublishContent(d.id) : await api.publishContent(d.id);
      setDocs((prev) => (prev ? prev.map((x) => (x.id === d.id ? updated : x)) : prev));
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const remove = async (d: CmsDoc) => {
    if (!confirm(`Delete "${d.title}"? This can't be undone.`)) return;
    try {
      await api.deleteContent(d.id);
      setDocs((prev) => (prev ? prev.filter((x) => x.id !== d.id) : prev));
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  if (loading || !user || user.role !== "admin") {
    return <div className="flex h-screen items-center justify-center text-slate-400">Loading…</div>;
  }

  const publicHref = (d: CmsDoc) => (d.type === "post" ? `/blog/${d.slug}` : `/p/${d.slug}`);

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      <AdminHeader active="/admin/content" />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {(["post", "page"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium ${tab === t ? "bg-[#2b3a67] text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {t === "post" ? "Blog posts" : "Pages"}
              </button>
            ))}
          </div>
          <button
            onClick={createNew}
            disabled={busy}
            className="rounded-lg bg-[#2b3a67] px-4 py-2 text-sm font-medium text-white hover:bg-[#23315a] disabled:opacity-60"
          >
            {busy ? "…" : tab === "post" ? "+ New post" : "+ New page"}
          </button>
        </div>

        {err ? <p className="mb-4 text-sm text-rose-600">{err}</p> : null}

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-2.5">Title</th>
                <th className="px-4 py-2.5">Slug</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Updated</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs === null ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
              ) : docs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Nothing here yet. Create your first {tab === "post" ? "post" : "page"}.</td></tr>
              ) : (
                docs.map((d) => (
                  <tr key={d.id} className="border-b border-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      <Link href={`/admin/content/${d.id}`} className="hover:text-[#2b3a67] hover:underline">{d.title || "Untitled"}</Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">/{d.type === "post" ? "blog" : "p"}/{d.slug}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${d.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{d.updatedAt ? new Date(d.updatedAt).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-3 text-xs">
                        <Link href={`/admin/content/${d.id}`} className="text-slate-600 hover:text-[#2b3a67]">Edit</Link>
                        {d.status === "published" ? (
                          <a href={publicHref(d)} target="_blank" rel="noreferrer" className="text-slate-600 hover:text-[#2b3a67]">View</a>
                        ) : null}
                        <button onClick={() => togglePublish(d)} className="text-slate-600 hover:text-[#2b3a67]">
                          {d.status === "published" ? "Unpublish" : "Publish"}
                        </button>
                        <button onClick={() => remove(d)} className="text-rose-500 hover:text-rose-700">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
