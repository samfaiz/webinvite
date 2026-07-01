"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, type CmsDoc, type CmsInput } from "@/lib/api";
import { TextInput, TextArea } from "@/studio/ui";
import { BlockEditor } from "@/cms/BlockEditor";
import { normalizeBlocks, type Block } from "@/cms/blocks";

type Form = {
  type: "page" | "post";
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  authorName: string;
  tags: string;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
  noindex: boolean;
};

export default function ContentEditorPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [form, setForm] = useState<Form | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const ogInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) return void router.push("/login");
    if (user.role !== "admin") return void router.push("/dashboard");
    api
      .adminGetContent(id)
      .then((d: CmsDoc) => {
        setForm({
          type: d.type,
          title: d.title ?? "",
          slug: d.slug ?? "",
          excerpt: d.excerpt ?? "",
          coverImage: d.coverImage ?? "",
          authorName: d.authorName ?? "",
          tags: (d.tags ?? []).join(", "),
          seoTitle: d.seoTitle ?? "",
          seoDescription: d.seoDescription ?? "",
          ogImage: d.ogImage ?? "",
          noindex: !!d.noindex,
        });
        setStatus(d.status);
        setBlocks(normalizeBlocks(d.blocks));
      })
      .catch((e) => setMsg((e as Error).message));
  }, [loading, user, router, id]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const buildInput = (): CmsInput => ({
    type: form!.type,
    title: form!.title || "Untitled",
    slug: form!.slug || form!.title,
    excerpt: form!.excerpt || undefined,
    coverImage: form!.coverImage || undefined,
    authorName: form!.authorName || undefined,
    tags: form!.tags ? form!.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    seoTitle: form!.seoTitle || undefined,
    seoDescription: form!.seoDescription || undefined,
    ogImage: form!.ogImage || undefined,
    noindex: form!.noindex,
    blocks,
  });

  const applyServer = (d: CmsDoc) => {
    setForm((f) => (f ? { ...f, slug: d.slug } : f));
    setStatus(d.status);
  };

  const save = async (): Promise<boolean> => {
    if (!form) return false;
    setSaving(true);
    setMsg("");
    try {
      applyServer(await api.updateContent(id, buildInput()));
      setMsg("Saved ✓");
      return true;
    } catch (e) {
      setMsg((e as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!(await save())) return;
    try {
      const p = await api.publishContent(id);
      setStatus(p.status);
      setMsg(`Published ✓  ·  ${window.location.origin}${publicPath}`);
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const unpublish = async () => {
    try {
      const p = await api.unpublishContent(id);
      setStatus(p.status);
      setMsg("Moved back to draft");
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const uploadOg = async (file?: File) => {
    if (!file) return;
    try {
      const { url } = await api.uploadImage(file);
      set("ogImage", url);
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  if (loading || !user || user.role !== "admin" || !form) {
    return <div className="flex h-screen items-center justify-center text-slate-400">Loading…</div>;
  }

  const publicPath = form.type === "post" ? `/blog/${form.slug}` : `/p/${form.slug}`;

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      {/* top bar */}
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/admin/content" className="shrink-0 text-sm text-slate-500 hover:text-slate-800">← Content</Link>
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Untitled"
            className="min-w-0 flex-1 border-0 text-lg font-semibold text-slate-800 outline-none placeholder:text-slate-300"
          />
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            {status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {msg ? <span className="max-w-[36ch] truncate text-[11px] text-slate-500">{msg}</span> : null}
          <button onClick={() => setShowDetails((v) => !v)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
            Details &amp; SEO
          </button>
          <button onClick={save} disabled={saving} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60">
            {saving ? "…" : "Save"}
          </button>
          {status === "published" ? (
            <button onClick={unpublish} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Unpublish</button>
          ) : null}
          <button onClick={publish} disabled={saving} className="rounded-lg bg-[#2b3a67] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#23315a] disabled:opacity-60">
            {status === "published" ? "Update" : "Publish"}
          </button>
        </div>
      </header>

      {/* details & SEO */}
      {showDetails ? (
        <div className="border-b border-slate-200 bg-white px-5 py-4">
          <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Details</p>
              <label className="mb-2 block text-xs text-slate-500">URL slug
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-xs text-slate-400">/{form.type === "post" ? "blog" : "p"}/</span>
                  <TextInput value={form.slug} onChange={(e) => set("slug", e.target.value)} />
                </div>
              </label>
              <label className="mb-2 block text-xs text-slate-500">Excerpt / summary
                <TextArea value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={2} />
              </label>
              <label className="mb-2 block text-xs text-slate-500">Cover image URL
                <TextInput value={form.coverImage} onChange={(e) => set("coverImage", e.target.value)} />
              </label>
              {form.type === "post" ? (
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs text-slate-500">Author
                    <TextInput value={form.authorName} onChange={(e) => set("authorName", e.target.value)} />
                  </label>
                  <label className="block text-xs text-slate-500">Tags (comma-sep)
                    <TextInput value={form.tags} onChange={(e) => set("tags", e.target.value)} />
                  </label>
                </div>
              ) : null}
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">SEO</p>
              <label className="mb-2 block text-xs text-slate-500">Meta title <span className="text-slate-300">(defaults to the page title)</span>
                <TextInput value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
              </label>
              <label className="mb-2 block text-xs text-slate-500">Meta description
                <TextArea value={form.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} rows={2} />
              </label>
              <label className="mb-2 block text-xs text-slate-500">Social (OG) image
                <div className="mt-1 flex items-center gap-2">
                  <TextInput value={form.ogImage} onChange={(e) => set("ogImage", e.target.value)} />
                  <input ref={ogInput} type="file" accept="image/*" className="hidden" onChange={(e) => { uploadOg(e.target.files?.[0]); e.target.value = ""; }} />
                  <button onClick={() => ogInput.current?.click()} className="shrink-0 rounded-lg bg-[#2b3a67] px-3 py-2 text-xs font-medium text-white hover:bg-[#23315a]">Upload</button>
                </div>
              </label>
              <label className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={form.noindex} onChange={(e) => set("noindex", e.target.checked)} />
                Hide from search engines (noindex)
              </label>
              {status === "published" ? (
                <p className="mt-3 text-[11px] text-slate-400">Live at <a href={publicPath} target="_blank" rel="noreferrer" className="underline">{publicPath}</a></p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* block studio */}
      <main className="mx-auto max-w-6xl px-5 py-6">
        <BlockEditor blocks={blocks} onChange={setBlocks} />
      </main>
    </div>
  );
}
