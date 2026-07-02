"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, type CmsDoc } from "@/lib/api";
import { normalizeBlocks, type Block } from "@/cms/blocks";

/**
 * `/admin/pages` — inventory of every marketing page (ContentDoc where
 * type === "page"). Hero eyebrow / heading / image are pulled out of the
 * first "hero" block if present; otherwise we fall back to excerpt/title/
 * coverImage. Row-order acts as "sort" for now (real ordering is a follow-up).
 */

type Row = {
  doc: CmsDoc;
  heroEyebrow?: string;
  heroHeading?: string;
  heroImage?: string;
};

const COL_KEYS = ["key", "title", "eyebrow", "heading", "hero", "published", "sort"] as const;
type ColKey = (typeof COL_KEYS)[number];

const COL_LABELS: Record<ColKey, string> = {
  key: "Key",
  title: "Title",
  eyebrow: "Hero eyebrow",
  heading: "Hero heading",
  hero: "Hero image",
  published: "Published",
  sort: "Sort",
};

function extractHero(doc: CmsDoc): { eyebrow?: string; heading?: string; image?: string } {
  const blocks = normalizeBlocks(doc.blocks);
  const first = blocks.find((b): b is Extract<Block, { type: "hero" }> => b.type === "hero");
  if (first) return { eyebrow: first.sub, heading: first.heading, image: first.image };
  return {
    eyebrow: doc.excerpt || undefined,
    heading: doc.title || undefined,
    image: doc.coverImage || undefined,
  };
}

export default function AdminPagesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [seedInfo, setSeedInfo] = useState<string | null>(null);
  const [autoSeeded, setAutoSeeded] = useState(false);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visible, setVisible] = useState<Set<ColKey>>(new Set(COL_KEYS));
  const [showCols, setShowCols] = useState(false);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const hydrate = async (docs: CmsDoc[]): Promise<Row[]> =>
    Promise.all(
      docs.map(async (d) => {
        try {
          const withBlocks = await api.adminGetContent(d.id);
          const hero = extractHero(withBlocks);
          return { doc: withBlocks, heroEyebrow: hero.eyebrow, heroHeading: hero.heading, heroImage: hero.image } as Row;
        } catch {
          const hero = extractHero(d);
          return { doc: d, heroEyebrow: hero.eyebrow, heroHeading: hero.heading, heroImage: hero.image } as Row;
        }
      }),
    );

  const load = useCallback(async () => {
    setRows(null);
    setErr("");
    try {
      const docs = await api.adminListContent("page");
      setRows(await hydrate(docs));
    } catch (e) {
      setErr((e as Error).message);
      setRows([]);
    }
  }, []);

  const seedNow = async (auto = false) => {
    setBusy(true);
    setErr("");
    try {
      const res = await api.seedDefaultPages();
      setRows(await hydrate(res.pages));
      if (res.created.length > 0) {
        setSeedInfo(
          `${auto ? "Auto-seeded" : "Seeded"} ${res.created.length} default page${res.created.length === 1 ? "" : "s"} (${res.created.join(", ")}).`,
        );
      } else if (!auto) {
        setSeedInfo("All default pages already exist — nothing to add.");
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) return void router.push("/login");
    if (user.role !== "admin") return void router.push("/dashboard");
    load();
  }, [loading, user, router, load]);

  // First-time visit: if no pages exist yet, silently seed the default set so
  // the admin isn't empty and every /p/{slug} the site links to actually works.
  useEffect(() => {
    if (autoSeeded || rows === null || rows.length > 0) return;
    setAutoSeeded(true);
    void seedNow(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const createNew = async () => {
    setBusy(true);
    setErr("");
    try {
      const slug = `page-${Date.now().toString(36)}`;
      const doc = await api.createContent({ type: "page", slug, title: "Untitled", blocks: [] });
      router.push(`/admin/pages/${doc.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  const togglePublish = async (r: Row) => {
    try {
      const updated = r.doc.status === "published" ? await api.unpublishContent(r.doc.id) : await api.publishContent(r.doc.id);
      setRows((prev) => (prev ? prev.map((x) => (x.doc.id === r.doc.id ? { ...x, doc: updated } : x)) : prev));
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const bulkPublish = async (publish: boolean) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    try {
      await Promise.all(
        ids.map((id) => (publish ? api.publishContent(id) : api.unpublishContent(id))),
      );
      setSelected(new Set());
      load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const bulkDelete = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} page${ids.length === 1 ? "" : "s"}? This can't be undone.`)) return;
    try {
      await Promise.all(ids.map((id) => api.deleteContent(id)));
      setSelected(new Set());
      load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const filtered = useMemo(() => {
    if (!rows) return null;
    const q = search.trim().toLowerCase();
    const list = q
      ? rows.filter((r) =>
          [r.doc.slug, r.doc.title, r.heroEyebrow, r.heroHeading]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q)),
        )
      : rows.slice();
    // Sort by explicit sortOrder first, then by title as a tiebreaker.
    list.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const so = (a.doc.sortOrder ?? 0) - (b.doc.sortOrder ?? 0);
      if (so !== 0) return dir * so;
      return dir * a.doc.title.localeCompare(b.doc.title);
    });
    return list;
  }, [rows, search, sortDir]);

  const paged = useMemo(() => {
    if (!filtered) return null;
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  const total = filtered?.length ?? 0;
  const rangeStart = total === 0 ? 0 : (page - 1) * perPage + 1;
  const rangeEnd = Math.min(page * perPage, total);

  const allOnPageSelected = paged !== null && paged.length > 0 && paged.every((r) => selected.has(r.doc.id));
  const toggleAllOnPage = () => {
    if (!paged) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) paged.forEach((r) => next.delete(r.doc.id));
      else paged.forEach((r) => next.add(r.doc.id));
      return next;
    });
  };

  if (loading || !user || user.role !== "admin") {
    return (
      <div
        className="flex h-[80vh] items-center justify-center text-[rgba(90,35,56,0.5)]"
        style={{ fontFamily: "var(--f-body)" }}
      >
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10 sm:py-10" style={{ fontFamily: "var(--f-body)" }}>
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-[12px] text-[rgba(90,35,56,0.55)]">
            <Link href="/admin" className="hover:text-[#d95f48]">Admin</Link>
            <span className="text-[rgba(90,35,56,0.3)]">›</span>
            <span className="text-[rgba(90,35,56,0.75)]">Pages</span>
            <span className="text-[rgba(90,35,56,0.3)]">›</span>
            <span className="text-[rgba(90,35,56,0.55)]">List</span>
          </nav>
          <h1
            className="mt-1 text-4xl font-medium italic text-[#5a2338] sm:text-[42px]"
            style={{ fontFamily: "var(--f-serif)" }}
          >
            Pages
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => seedNow(false)}
            disabled={busy}
            title="Recreate any missing default pages (Home, About, Pricing, Contact, FAQ, Help, Privacy, Terms)."
            className="rounded-full border border-[rgba(90,35,56,0.2)] px-4 py-2.5 text-[12.5px] font-medium text-[#5a2338] transition-colors hover:border-[#c9497c] hover:text-[#c9497c] disabled:opacity-60"
          >
            Seed defaults
          </button>
          <button
            onClick={createNew}
            disabled={busy}
            className="rounded-full bg-[#d95f48] px-5 py-2.5 text-[13px] font-medium text-white shadow-[0_10px_24px_rgba(217,95,72,0.3)] transition-colors hover:bg-[#c14e38] disabled:opacity-60"
          >
            {busy ? "Working…" : "+ New page"}
          </button>
        </div>
      </div>

      {err ? <p className="mt-4 text-sm text-[#c14e38]">{err}</p> : null}
      {seedInfo ? (
        <p className="mt-4 rounded-lg border border-[rgba(92,138,94,0.3)] bg-[#eaf6ea] px-4 py-2 text-[13px] text-[#2f6b50]">
          {seedInfo}
        </p>
      ) : null}

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[rgba(201,73,124,0.15)] bg-white px-4 py-3 shadow-[0_10px_30px_rgba(122,44,44,0.05)]">
        <button
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          title={`Sort by title (${sortDir === "asc" ? "A→Z" : "Z→A"})`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(90,35,56,0.12)] text-[rgba(90,35,56,0.6)] transition-colors hover:border-[#d95f48] hover:text-[#d95f48]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {sortDir === "asc" ? <path d="M7 4v16M7 4l-3 3M7 4l3 3M14 6h6M14 12h4M14 18h2" /> : <path d="M7 20V4M7 20l-3-3M7 20l3-3M14 6h6M14 12h4M14 18h2" />}
          </svg>
        </button>

        {selected.size > 0 ? (
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-[rgba(90,35,56,0.65)]">{selected.size} selected</span>
            <button onClick={() => bulkPublish(true)} className="rounded-full border border-emerald-200 px-3 py-1 text-emerald-700 hover:bg-emerald-50">Publish</button>
            <button onClick={() => bulkPublish(false)} className="rounded-full border border-amber-200 px-3 py-1 text-amber-700 hover:bg-amber-50">Unpublish</button>
            <button onClick={bulkDelete} className="rounded-full border border-[rgba(217,95,72,0.4)] px-3 py-1 text-[#c14e38] hover:bg-[#fbe0d8]">Delete</button>
          </div>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-full border border-[rgba(90,35,56,0.12)] bg-[#fdf4ec] px-3 py-1.5">
            <svg className="h-3.5 w-3.5 text-[rgba(90,35,56,0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search"
              className="w-40 border-none bg-transparent text-[13px] text-[#5a2338] outline-none placeholder:text-[rgba(90,35,56,0.4)]"
            />
          </label>

          <div className="relative">
            <button
              onClick={() => setShowCols((v) => !v)}
              title="Show / hide columns"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(90,35,56,0.12)] text-[rgba(90,35,56,0.6)] transition-colors hover:border-[#c9497c] hover:text-[#c9497c]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="4" height="16" rx="1" />
                <rect x="10" y="4" width="4" height="16" rx="1" />
                <rect x="17" y="4" width="4" height="16" rx="1" />
              </svg>
            </button>
            {showCols ? (
              <div className="absolute right-0 top-10 z-10 w-52 rounded-xl border border-[rgba(201,73,124,0.2)] bg-white p-2 shadow-[0_20px_40px_rgba(122,44,44,0.15)]">
                {COL_KEYS.map((k) => (
                  <label key={k} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-[#5a2338] hover:bg-[#fdf4ec]">
                    <input
                      type="checkbox"
                      checked={visible.has(k)}
                      onChange={() =>
                        setVisible((prev) => {
                          const next = new Set(prev);
                          if (next.has(k)) next.delete(k);
                          else next.add(k);
                          return next;
                        })
                      }
                      className="accent-[#d95f48]"
                    />
                    <span>{COL_LABELS[k]}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-[rgba(201,73,124,0.15)] bg-white shadow-[0_10px_30px_rgba(122,44,44,0.05)]">
        <table className="w-full text-left text-[13.5px]">
          <thead className="bg-[#fdf4ec] text-[11px] font-medium uppercase tracking-[0.14em] text-[rgba(90,35,56,0.55)]">
            <tr>
              <th className="w-8 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleAllOnPage}
                  className="accent-[#d95f48]"
                />
              </th>
              {visible.has("key") ? <th className="px-4 py-3">Key</th> : null}
              {visible.has("title") ? <th className="px-4 py-3">Title</th> : null}
              {visible.has("eyebrow") ? <th className="px-4 py-3">Hero eyebrow</th> : null}
              {visible.has("heading") ? <th className="px-4 py-3">Hero heading</th> : null}
              {visible.has("hero") ? <th className="px-4 py-3">Hero image</th> : null}
              {visible.has("published") ? <th className="px-4 py-3">Published</th> : null}
              {visible.has("sort") ? (
                <th className="px-4 py-3">
                  <button
                    onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                    className="inline-flex items-center gap-1 uppercase tracking-[0.14em] hover:text-[#c9497c]"
                  >
                    Sort
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                </th>
              ) : null}
              <th className="px-4 py-3 text-right">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {paged === null ? (
              <tr>
                <td colSpan={12} className="px-4 py-10 text-center text-[rgba(90,35,56,0.45)]">
                  Loading pages…
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-10 text-center text-[rgba(90,35,56,0.5)]">
                  {rows && rows.length > 0
                    ? "No pages match your search."
                    : "No pages yet. Click “+ New page” to create your first."}
                </td>
              </tr>
            ) : (
              paged.map((r, i) => {
                const isSelected = selected.has(r.doc.id);
                const publishedDate = r.doc.publishedAt ? new Date(r.doc.publishedAt).toLocaleDateString() : null;
                return (
                  <tr
                    key={r.doc.id}
                    className={
                      "border-t border-[rgba(90,35,56,0.06)] transition-colors " +
                      (isSelected ? "bg-[#fbe0d8]/40" : "hover:bg-[#fdf4ec]/60")
                    }
                  >
                    <td className="px-4 py-3 align-middle">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(r.doc.id)) next.delete(r.doc.id);
                            else next.add(r.doc.id);
                            return next;
                          })
                        }
                        className="accent-[#d95f48]"
                      />
                    </td>
                    {visible.has("key") ? (
                      <td className="px-4 py-3 align-middle">
                        <span className="rounded-md border border-[rgba(90,35,56,0.15)] bg-[#fdf4ec] px-2 py-0.5 font-mono text-[11.5px] text-[rgba(90,35,56,0.75)]">
                          {r.doc.slug}
                        </span>
                      </td>
                    ) : null}
                    {visible.has("title") ? (
                      <td className="px-4 py-3 align-middle font-medium text-[#5a2338]">
                        <Link href={`/admin/pages/${r.doc.id}`} className="hover:text-[#d95f48] hover:underline">
                          {r.doc.title || "Untitled"}
                        </Link>
                      </td>
                    ) : null}
                    {visible.has("eyebrow") ? (
                      <td className="px-4 py-3 align-middle text-[rgba(90,35,56,0.72)]">
                        <Truncate value={r.heroEyebrow} />
                      </td>
                    ) : null}
                    {visible.has("heading") ? (
                      <td className="px-4 py-3 align-middle text-[#5a2338]">
                        <Truncate value={r.heroHeading} />
                      </td>
                    ) : null}
                    {visible.has("hero") ? (
                      <td className="px-4 py-3 align-middle">
                        {r.heroImage ? (
                          <span className="inline-flex h-8 w-12 items-center justify-center overflow-hidden rounded-md border border-[rgba(90,35,56,0.1)] bg-[#fdf4ec]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={r.heroImage} alt="" className="h-full w-full object-cover" />
                          </span>
                        ) : (
                          <span className="text-[rgba(90,35,56,0.35)]">—</span>
                        )}
                      </td>
                    ) : null}
                    {visible.has("published") ? (
                      <td className="px-4 py-3 align-middle">
                        <button
                          onClick={() => togglePublish(r)}
                          title={r.doc.status === "published" ? `Published${publishedDate ? " on " + publishedDate : ""}` : "Draft — click to publish"}
                          className="group inline-flex items-center gap-1"
                        >
                          {r.doc.status === "published" ? (
                            <span
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e0f2e5] text-[#166534]"
                            >
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12l5 5 9-11" />
                              </svg>
                            </span>
                          ) : (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[rgba(90,35,56,0.15)] text-[rgba(90,35,56,0.35)] transition-colors group-hover:border-[#e3a23c] group-hover:text-[#c98f2e]">
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="8" />
                              </svg>
                            </span>
                          )}
                        </button>
                      </td>
                    ) : null}
                    {visible.has("sort") ? (
                      <td className="px-4 py-3 align-middle text-[rgba(90,35,56,0.7)]">{r.doc.sortOrder ?? 0}</td>
                    ) : null}
                    <td className="whitespace-nowrap px-4 py-3 align-middle text-right">
                      <div className="inline-flex items-center gap-4 text-[12.5px]">
                        <a
                          href={`/p/${r.doc.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#c9497c] hover:underline"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9M4 20h4l10-10-4-4L4 16z" />
                          </svg>
                          Edit visually
                        </a>
                        <Link
                          href={`/admin/pages/${r.doc.id}`}
                          className="inline-flex items-center gap-1 text-[#d95f48] hover:underline"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9M4 20h4l10-10-4-4L4 16z" />
                          </svg>
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Paginator */}
        {filtered && filtered.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(90,35,56,0.08)] bg-[#fdf4ec]/50 px-5 py-3 text-[12.5px] text-[rgba(90,35,56,0.7)]">
            <span>
              Showing {rangeStart} to {rangeEnd} of {total} results
            </span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <span>Per page</span>
                <select
                  value={perPage}
                  onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                  className="rounded-full border border-[rgba(90,35,56,0.15)] bg-white px-2.5 py-1 text-[12.5px] text-[#5a2338] outline-none focus:border-[#c9497c]"
                >
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-full border border-[rgba(90,35,56,0.15)] px-2.5 py-1 disabled:opacity-40 hover:border-[#d95f48] hover:text-[#d95f48]"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setPage((p) => (p * perPage < total ? p + 1 : p))}
                  disabled={page * perPage >= total}
                  className="rounded-full border border-[rgba(90,35,56,0.15)] px-2.5 py-1 disabled:opacity-40 hover:border-[#d95f48] hover:text-[#d95f48]"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Truncate({ value, max = 60 }: { value?: string; max?: number }) {
  if (!value) return <span className="text-[rgba(90,35,56,0.35)]">—</span>;
  const s = value.length > max ? value.slice(0, max - 1) + "…" : value;
  return <span title={value.length > max ? value : undefined}>{s}</span>;
}
