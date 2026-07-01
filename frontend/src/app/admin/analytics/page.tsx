"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, type AnalyticsSummary } from "@/lib/api";
import { AdminHeader } from "../AdminHeader";
import { LineChart, BarList } from "@/components/charts";

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 font-display text-3xl text-[#2b3a67]">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-slate-400">{sub}</p> : null}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async (d: number) => {
    setData(null);
    setErr("");
    try {
      setData(await api.adminAnalytics(d));
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) return void router.push("/login");
    if (user.role !== "admin") return void router.push("/dashboard");
    load(days);
  }, [loading, user, router, days, load]);

  if (loading || !user || user.role !== "admin") {
    return <div className="flex h-screen items-center justify-center text-slate-400">Loading…</div>;
  }

  const avgPerDay = data ? Math.round(data.totals.views / Math.max(1, data.range.days)) : 0;

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      <AdminHeader active="/admin/analytics" />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl uppercase tracking-[0.1em] text-[#2b3a67]">Analytics</h1>
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${days === r.days ? "bg-[#2b3a67] text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {err ? <p className="mb-4 text-sm text-rose-600">{err}</p> : null}

        {!data ? (
          <p className="text-slate-400">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label="Page views" value={data.totals.views.toLocaleString()} sub={`last ${data.range.days} days`} />
              <StatCard label="Visitors" value={data.totals.visitors.toLocaleString()} sub="unique (privacy-friendly)" />
              <StatCard label="Views / day" value={avgPerDay.toLocaleString()} sub="average" />
            </div>

            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Traffic</h2>
              <LineChart data={data.timeseries} />
            </section>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Top pages</h2>
                <BarList items={data.topPages.map((p) => ({ label: p.path, value: p.views }))} />
              </section>
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Referrers</h2>
                <BarList items={data.referrers.map((r) => ({ label: r.source, value: r.views }))} />
              </section>
            </div>

            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Devices</h2>
              <div className="max-w-md">
                <BarList items={data.devices.map((d) => ({ label: d.device, value: d.views }))} />
              </div>
            </section>

            {/* Google Analytics 4 */}
            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-1 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Google Analytics 4</h2>
              {data.ga.configured ? (
                data.ga.error ? (
                  <p className="text-sm text-rose-600">GA connected, but the report failed: {data.ga.error}</p>
                ) : (
                  <>
                    <p className="mb-3 text-xs text-slate-400">Last {data.ga.range} · via the GA Data API</p>
                    <div className="grid grid-cols-3 gap-3">
                      <StatCard label="Active users" value={(data.ga.users ?? 0).toLocaleString()} />
                      <StatCard label="Sessions" value={(data.ga.sessions ?? 0).toLocaleString()} />
                      <StatCard label="Views" value={(data.ga.pageviews ?? 0).toLocaleString()} />
                    </div>
                    {data.ga.topPages?.length ? (
                      <div className="mt-4">
                        <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-400">GA top pages</p>
                        <BarList items={data.ga.topPages.map((p) => ({ label: p.path, value: p.views }))} />
                      </div>
                    ) : null}
                  </>
                )
              ) : (
                <p className="text-sm text-slate-500">
                  Not connected. Set <code className="rounded bg-slate-100 px-1">GA4_PROPERTY_ID</code> and{" "}
                  <code className="rounded bg-slate-100 px-1">GA_SERVICE_ACCOUNT_JSON</code> in the backend to pull GA stats here, and{" "}
                  <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_GA4_ID</code> in the frontend for the tracking tag.
                  The built-in analytics above always work.
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
