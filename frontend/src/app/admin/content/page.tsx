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
    return <div className="flex h-screen items-center justify-center text-[var(--b-muted)]">Loading…</div>;
  }

  const publicHref = (d: CmsDoc) => (d.type === "post" ? `/blog/${d.slug}` : `/p/${d.slug}`);

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      <AdminHeader active="/admin/content" />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg border border-[var(--b-border)] bg-white p-1">
            {(["post", "page"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium ${tab === t ? "bg-[var(--b-primary)] text-white" : "text-[var(--b-body)] hover:bg-[var(--b-bg)]"}`}
              >
                {t === "post" ? "Blog posts" : "Pages"}
              </button>
            ))}
          </div>
          <button
            onClick={createNew}
            disabled={busy}
            className="rounded-lg bg-[var(--b-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[#23315a] disabled:opacity-60"
          >
            {busy ? "…" : tab === "post" ? "+ New post" : "+ New page"}
          </button>
        </div>

        {err ? <p className="mb-4 text-sm text-rose-600">{err}</p> : null}

        <div className="overflow-x-auto rounded-xl border border-[var(--b-border)] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--b-tint)] text-xs uppercase tracking-wide text-[var(--b-muted)]">
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
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--b-muted)]">Loading…</td></tr>
              ) : docs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--b-muted)]">Nothing here yet. Create your first {tab === "post" ? "post" : "page"}.</td></tr>
              ) : (
                docs.map((d) => (
                  <tr key={d.id} className="border-b border-[var(--b-bg)]">
                    <td className="px-4 py-2.5 font-medium text-[var(--b-ink)]">
                      <Link href={`/admin/content/${d.id}`} className="hover:text-[var(--b-ink)] hover:underline">{d.title || "Untitled"}</Link>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--b-muted)]">/{d.type === "post" ? "blog" : "p"}/{d.slug}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${d.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-[var(--b-tint)] text-[var(--b-muted)]"}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--b-muted)]">{d.updatedAt ? new Date(d.updatedAt).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-3 text-xs">
                        <Link href={`/admin/content/${d.id}`} className="text-[var(--b-body)] hover:text-[var(--b-ink)]">Edit</Link>
                        {d.status === "published" ? (
                          <a href={publicHref(d)} target="_blank" rel="noreferrer" className="text-[var(--b-body)] hover:text-[var(--b-ink)]">View</a>
                        ) : null}
                        <button onClick={() => togglePublish(d)} className="text-[var(--b-body)] hover:text-[var(--b-ink)]">
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
