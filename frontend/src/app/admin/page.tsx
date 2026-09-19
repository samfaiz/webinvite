"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

/** How many invitations the dashboard previews before deferring to the full list. */
const DASHBOARD_ROWS = 10;

function StatCard({
  label,
  value,
  tone,
  href,
}: {
  label: string;
  value: number | string;
  tone?: string;
  /** when set, the whole card links there */
  href?: string;
}) {
  const cls =
    "rounded-2xl border border-[rgba(111,138,184,0.15)] bg-white p-5 shadow-[0_10px_30px_rgba(43,58,103,0.05)]";
  const body = (
    <>
      <p
        className="text-[32px] font-semibold italic leading-none"
        style={{ color: tone || "#2b3a67", fontFamily: "var(--f-serif)" }}
      >
        {value}
      </p>
      <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[rgba(43,58,103,0.5)]">
        {label}
      </p>
    </>
  );

  return href ? (
    <Link
      href={href}
      className={`${cls} block transition-colors hover:border-[rgba(92,123,176,0.45)]`}
      style={{ fontFamily: "var(--f-body)" }}
    >
      {body}
    </Link>
  ) : (
    <div className={cls} style={{ fontFamily: "var(--f-body)" }}>
      {body}
    </div>
  );
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [invites, setInvites] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) return void router.push("/login");
    if (user.role !== "admin") return void router.push("/dashboard");
    Promise.all([api.adminStats(), api.adminInvitations()])
      .then(([s, i]) => {
        setStats(s);
        setInvites(i);
      })
      .catch((e) => setError((e as Error).message));
  }, [loading, user, router]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div
        className="flex h-[80vh] items-center justify-center text-[rgba(43,58,103,0.5)]"
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
          <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-[#5c7bb0]">
            Overview
          </span>
          <h1
            className="mt-1 text-4xl font-medium italic text-[#2b3a67] sm:text-[42px]"
            style={{ fontFamily: "var(--f-serif)" }}
          >
            Dashboard
          </h1>
        </div>
        <Link
          href="/create"
          className="rounded-full bg-[#2b3a67] px-5 py-2.5 text-[13px] font-medium text-white shadow-[0_10px_24px_rgba(43,58,103,0.3)] transition-colors hover:bg-[#22305a]"
        >
          + New invitation
        </Link>
      </div>

      {error ? <p className="mt-4 text-sm text-[#b3423a]">{error}</p> : null}

      {/* Stats */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Users" value={stats?.users ?? "—"} href="/admin/users" />
        <StatCard label="Invitations" value={stats?.invitations ?? "—"} />
        <StatCard label="Published" value={stats?.published ?? "—"} tone="#5c8a5e" />
        <StatCard label="Drafts" value={stats?.drafts ?? "—"} tone="#b08d57" />
        <StatCard label="RSVPs" value={stats?.rsvps ?? "—"} tone="#5c7bb0" />
        <StatCard label="Total views" value={stats?.totalViews ?? "—"} tone="#7a5ba6" />
      </div>

      {/* Recent invitations — capped, so the dashboard stays scannable as the
          list grows. The full list lives at /admin/invitations. */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[20px] font-medium italic text-[#2b3a67]" style={{ fontFamily: "var(--f-serif)" }}>
            Recent invitations
          </h2>
          <Link
            href="/admin/invitations"
            className="text-[12px] font-medium text-[#5c7bb0] transition-colors hover:text-[#2b3a67]"
          >
            View all {invites.length} →
          </Link>
        </div>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-[rgba(111,138,184,0.15)] bg-white shadow-[0_10px_30px_rgba(43,58,103,0.05)]">
          <table className="w-full text-left text-[13.5px]">
            <thead className="bg-[#eef2f8] text-[11px] font-medium uppercase tracking-[0.14em] text-[rgba(43,58,103,0.55)]">
              <tr>
                <th className="px-5 py-3">Owner</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Template</th>
                <th className="px-5 py-3">Views</th>
                <th className="px-5 py-3">RSVPs</th>
                <th className="px-5 py-3">Slug</th>
              </tr>
            </thead>
            <tbody>
              {invites.slice(0, DASHBOARD_ROWS).map((i) => (
                <tr key={i.id} className="border-t border-[rgba(43,58,103,0.06)] transition-colors hover:bg-[#eef2f8]/60">
                  <td className="px-5 py-3 text-[#2b3a67]">{i.owner}</td>
                  <td className="px-5 py-3">
                    <StatusPill status={i.status} />
                  </td>
                  <td className="px-5 py-3 text-[rgba(43,58,103,0.65)]">{i.templateId}</td>
                  <td className="px-5 py-3 text-[#2b3a67]">{i.views}</td>
                  <td className="px-5 py-3 text-[#2b3a67]">{i.rsvpCount}</td>
                  <td className="px-5 py-3 text-[rgba(43,58,103,0.55)]">{i.slug ?? "—"}</td>
                </tr>
              ))}
              {invites.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[rgba(43,58,103,0.45)]">
                    No invitations yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ---------- small helpers ---------- */

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    published: { bg: "#dcfce7", fg: "#166534" },
    draft: { bg: "#e8edf5", fg: "#b08d57" },
    expired: { bg: "#e3eaf5", fg: "#b04a36" },
  };
  const c = map[status] || { bg: "#eef2f8", fg: "#8a5f6c" };
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.1em]"
      style={{ background: c.bg, color: c.fg }}
    >
      {status}
    </span>
  );
}

