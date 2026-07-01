"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, type SeoProposal, type SeoInsights } from "@/lib/api";
import { AdminHeader } from "../AdminHeader";

function ScoreDot({ score }: { score?: number | null }) {
  if (score == null) return null;
  const color = score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-rose-500";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
      <span className={`h-2 w-2 rounded-full ${color}`} /> current score {score}/100
    </span>
  );
}

export default function AdminSeoPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<{ configured: boolean; model: string } | null>(null);
  const [proposals, setProposals] = useState<SeoProposal[] | null>(null);
  const [insights, setInsights] = useState<SeoInsights | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [topic, setTopic] = useState("");
  const [drafting, setDrafting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [st, ps, ins] = await Promise.all([api.seoStatus(), api.seoProposals("pending"), api.seoInsights(30)]);
      setStatus(st);
      setProposals(ps);
      setInsights(ins);
    } catch (e) {
      setMsg((e as Error).message);
      setProposals([]);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) return void router.push("/login");
    if (user.role !== "admin") return void router.push("/dashboard");
    load();
  }, [loading, user, router, load]);

  const runAudit = async () => {
    setBusy(true);
    setMsg("Running audit…");
    try {
      const r = await api.seoRunAudit();
      setMsg(`Audit complete — ${r.proposed} new suggestion(s) across ${r.total} published page(s).`);
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const decide = async (p: SeoProposal, approve: boolean) => {
    try {
      if (approve) await api.seoApprove(p.id);
      else await api.seoReject(p.id);
      setProposals((prev) => (prev ? prev.filter((x) => x.id !== p.id) : prev));
      setMsg(approve ? `Applied to "${p.content.title}".` : "Suggestion dismissed.");
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const generateDraft = async () => {
    if (!topic.trim()) return;
    setDrafting(true);
    setMsg("Writing your draft with AI…");
    try {
      const draft = await api.seoBlogDraft(topic.trim());
      const doc = await api.createContent({
        type: "post",
        slug: draft.title,
        title: draft.title,
        excerpt: draft.excerpt,
        tags: draft.tags,
        blocks: draft.blocks,
      });
      router.push(`/admin/content/${doc.id}`);
    } catch (e) {
      setMsg((e as Error).message);
      setDrafting(false);
    }
  };

  if (loading || !user || user.role !== "admin") {
    return <div className="flex h-screen items-center justify-center text-slate-400">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      <AdminHeader active="/admin/seo" />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl uppercase tracking-[0.1em] text-[#2b3a67]">AI SEO</h1>
            <p className="mt-1 text-sm text-slate-500">
              Claude reviews your pages and <strong>suggests</strong> improvements — nothing changes until you approve it.
            </p>
          </div>
          {status ? (
            status.configured ? (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> AI on · {status.model}
                </span>
                <button onClick={runAudit} disabled={busy} className="rounded-lg bg-[#2b3a67] px-4 py-2 text-sm font-medium text-white hover:bg-[#23315a] disabled:opacity-60">
                  {busy ? "…" : "Run audit now"}
                </button>
              </div>
            ) : (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">AI not configured</span>
            )
          ) : null}
        </div>

        {msg ? <p className="mb-4 rounded-lg bg-white px-4 py-2 text-sm text-slate-600 ring-1 ring-slate-200">{msg}</p> : null}

        {status && !status.configured ? (
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50/60 p-5 text-sm text-amber-800">
            <p className="font-medium">Turn on AI features</p>
            <p className="mt-1">
              Add <code className="rounded bg-white px-1">ANTHROPIC_API_KEY</code> to the backend environment
              (<code className="rounded bg-white px-1">backend/.env</code>) and restart the API. Optionally set{" "}
              <code className="rounded bg-white px-1">ANTHROPIC_MODEL</code>. Until then, audits and drafting are disabled.
            </p>
          </div>
        ) : null}

        {/* AI blog drafting */}
        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Write a blog post with AI</h2>
          <p className="mt-1 text-xs text-slate-400">Give a topic; Claude drafts a full SEO-friendly post and opens it in the editor for you to review.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. 10 wording ideas for a Christian wedding invitation"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
            <button
              onClick={generateDraft}
              disabled={drafting || !status?.configured || !topic.trim()}
              className="rounded-lg bg-[#2b3a67] px-4 py-2 text-sm font-medium text-white hover:bg-[#23315a] disabled:opacity-50"
            >
              {drafting ? "Writing…" : "Generate draft"}
            </button>
          </div>
        </section>

        {/* pages ranked by traffic — the AI prioritises the quiet ones */}
        {insights && insights.pages.length ? (
          <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Pages by traffic</h2>
              <span className="text-xs text-slate-400">
                {insights.siteViews.toLocaleString()} views · avg {insights.avgViews}/page · last {insights.days} days
              </span>
            </div>
            <p className="mb-3 text-xs text-slate-400">Lowest-traffic first — the weekly audit optimises these before the rest.</p>
            <div className="divide-y divide-slate-100">
              {insights.pages.slice(0, 8).map((p) => (
                <div key={p.contentId} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <Link href={`/admin/content/${p.contentId}`} className="truncate text-sm font-medium text-slate-800 hover:text-[#2b3a67] hover:underline">
                      {p.title}
                    </Link>
                    <span className="ml-2 text-xs text-slate-400">{p.path}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {p.pending ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">suggestion pending</span> : null}
                    <span className="w-20 text-right text-sm text-slate-600">{p.views.toLocaleString()} views</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* review queue */}
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
          Pending suggestions {proposals ? `(${proposals.length})` : ""}
        </h2>

        {proposals === null ? (
          <p className="text-slate-400">Loading…</p>
        ) : proposals.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400">
            No pending suggestions. {status?.configured ? "Run an audit to generate some." : ""}
          </p>
        ) : (
          <div className="space-y-4">
            {proposals.map((p) => (
              <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">{p.content.type}</span>
                    <span className="font-medium text-slate-800">{p.content.title}</span>
                    <span className="text-xs text-slate-400">/{p.content.type === "post" ? "blog" : "p"}/{p.content.slug}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {p.traffic ? (
                      <span className="text-xs text-slate-500">{p.traffic.views.toLocaleString()} views · {p.traffic.days}d</span>
                    ) : null}
                    <ScoreDot score={p.score} />
                    <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] text-slate-400">{p.source}</span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <DiffCol label="Current" title={p.current.seoTitle} desc={p.current.seoDescription} muted />
                  <DiffCol label="Proposed" title={p.proposed.seoTitle} desc={p.proposed.seoDescription} />
                </div>

                {p.issues.length ? (
                  <div className="mt-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Issues found</p>
                    <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                      {p.issues.map((it, i) => <li key={i}>{it}</li>)}
                    </ul>
                  </div>
                ) : null}
                {p.rationale ? <p className="mt-2 text-xs italic text-slate-500">{p.rationale}</p> : null}

                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => decide(p, false)} className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-50">Dismiss</button>
                  <button onClick={() => decide(p, true)} className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">Approve &amp; apply</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function DiffCol({ label, title, desc, muted }: { label: string; title?: string | null; desc?: string | null; muted?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${muted ? "border-slate-200 bg-slate-50/60" : "border-emerald-200 bg-emerald-50/40"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-medium ${muted ? "text-slate-500" : "text-slate-800"}`}>{title || <span className="text-slate-300">— none —</span>}</p>
      <p className={`mt-1 text-xs ${muted ? "text-slate-400" : "text-slate-600"}`}>{desc || <span className="text-slate-300">— none —</span>}</p>
    </div>
  );
}
