"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

function StatCard({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div
      className="rounded-2xl border border-[rgba(201,73,124,0.15)] bg-white p-5 shadow-[0_10px_30px_rgba(122,44,44,0.05)]"
      style={{ fontFamily: "var(--f-body)" }}
    >
      <p
        className="text-[32px] font-semibold italic leading-none"
        style={{ color: tone || "#5a2338", fontFamily: "var(--f-serif)" }}
      >
        {value}
      </p>
      <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[rgba(90,35,56,0.5)]">
        {label}
      </p>
    </div>
  );
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [invites, setInvites] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [resetUser, setResetUser] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) return void router.push("/login");
    if (user.role !== "admin") return void router.push("/dashboard");
    Promise.all([api.adminStats(), api.adminInvitations(), api.adminUsers()])
      .then(([s, i, u]) => {
        setStats(s);
        setInvites(i);
        setUsers(u);
      })
      .catch((e) => setError((e as Error).message));
  }, [loading, user, router]);

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
          <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-[#c9497c]">
            Overview
          </span>
          <h1
            className="mt-1 text-4xl font-medium italic text-[#5a2338] sm:text-[42px]"
            style={{ fontFamily: "var(--f-serif)" }}
          >
            Dashboard
          </h1>
        </div>
        <Link
          href="/create"
          className="rounded-full bg-[#d95f48] px-5 py-2.5 text-[13px] font-medium text-white shadow-[0_10px_24px_rgba(217,95,72,0.3)] transition-colors hover:bg-[#c14e38]"
        >
          + New invitation
        </Link>
      </div>

      {error ? <p className="mt-4 text-sm text-[#c14e38]">{error}</p> : null}

      {/* Stats */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Users" value={stats?.users ?? "—"} />
        <StatCard label="Invitations" value={stats?.invitations ?? "—"} />
        <StatCard label="Published" value={stats?.published ?? "—"} tone="#5c8a5e" />
        <StatCard label="Drafts" value={stats?.drafts ?? "—"} tone="#c98f2e" />
        <StatCard label="RSVPs" value={stats?.rsvps ?? "—"} tone="#c9497c" />
        <StatCard label="Total views" value={stats?.totalViews ?? "—"} tone="#7a5ba6" />
      </div>

      {/* Invitations table */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[20px] font-medium italic text-[#5a2338]" style={{ fontFamily: "var(--f-serif)" }}>
            All invitations
          </h2>
          <span className="text-[12px] text-[rgba(90,35,56,0.55)]">
            {invites.length} total
          </span>
        </div>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-[rgba(201,73,124,0.15)] bg-white shadow-[0_10px_30px_rgba(122,44,44,0.05)]">
          <table className="w-full text-left text-[13.5px]">
            <thead className="bg-[#fdf4ec] text-[11px] font-medium uppercase tracking-[0.14em] text-[rgba(90,35,56,0.55)]">
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
              {invites.map((i) => (
                <tr key={i.id} className="border-t border-[rgba(90,35,56,0.06)] transition-colors hover:bg-[#fdf4ec]/60">
                  <td className="px-5 py-3 text-[#5a2338]">{i.owner}</td>
                  <td className="px-5 py-3">
                    <StatusPill status={i.status} />
                  </td>
                  <td className="px-5 py-3 text-[rgba(90,35,56,0.65)]">{i.templateId}</td>
                  <td className="px-5 py-3 text-[#5a2338]">{i.views}</td>
                  <td className="px-5 py-3 text-[#5a2338]">{i.rsvpCount}</td>
                  <td className="px-5 py-3 text-[rgba(90,35,56,0.55)]">{i.slug ?? "—"}</td>
                </tr>
              ))}
              {invites.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[rgba(90,35,56,0.45)]">
                    No invitations yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* Users table */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[20px] font-medium italic text-[#5a2338]" style={{ fontFamily: "var(--f-serif)" }}>
            Users
          </h2>
          <span className="text-[12px] text-[rgba(90,35,56,0.55)]">
            {users.length} total
          </span>
        </div>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-[rgba(201,73,124,0.15)] bg-white shadow-[0_10px_30px_rgba(122,44,44,0.05)]">
          <table className="w-full text-left text-[13.5px]">
            <thead className="bg-[#fdf4ec] text-[11px] font-medium uppercase tracking-[0.14em] text-[rgba(90,35,56,0.55)]">
              <tr>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Invitations</th>
                <th className="px-5 py-3">Can duplicate</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-[rgba(90,35,56,0.06)] transition-colors hover:bg-[#fdf4ec]/60">
                  <td className="px-5 py-3 text-[#5a2338]">{u.email}</td>
                  <td className="px-5 py-3 text-[rgba(90,35,56,0.75)]">{u.name ?? "—"}</td>
                  <td className="px-5 py-3">
                    <RolePill role={u.role} />
                  </td>
                  <td className="px-5 py-3 text-[#5a2338]">{u.invitations}</td>
                  <td className="px-5 py-3">
                    {/* per-user permission: duplicate own invitations (off by default) */}
                    <button
                      onClick={async () => {
                        try {
                          const r = await api.setUserPermissions(u.id, { canDuplicate: !u.canDuplicate });
                          setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, canDuplicate: r.canDuplicate } : x)));
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                      title={u.canDuplicate ? "Click to revoke duplicating" : "Click to allow duplicating"}
                      className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                        u.canDuplicate
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {u.canDuplicate ? "Allowed ✓" : "Off"}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setResetUser({ id: u.id, email: u.email })}
                      className="rounded-lg border border-[rgba(201,73,124,0.3)] px-3 py-1.5 text-[12px] font-medium text-[#c9497c] transition-colors hover:bg-[#fdf4ec]"
                    >
                      Reset password
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[rgba(90,35,56,0.45)]">
                    No users yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {resetUser ? (
        <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />
      ) : null}
    </div>
  );
}

/* ---------- reset-password modal ---------- */

function ResetPasswordModal({ user, onClose }: { user: { id: string; email: string }; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ generated?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await api.resetUserPassword(user.id, pw.trim() || undefined);
      setDone({ generated: r.password });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!done?.generated) return;
    try {
      await navigator.clipboard.writeText(done.generated);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(40,20,30,0.35)] p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_20px_60px_rgba(60,20,40,0.25)]"
        style={{ fontFamily: "var(--f-body)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[18px] font-medium italic text-[#5a2338]" style={{ fontFamily: "var(--f-serif)" }}>
          Reset password
        </h3>
        <p className="mt-1 text-[13px] text-[rgba(90,35,56,0.7)]">
          for <strong className="text-[#5a2338]">{user.email}</strong>
        </p>

        {done ? (
          <div className="mt-4">
            <p className="text-[13px] font-medium text-emerald-700">Password updated ✓</p>
            {done.generated ? (
              <div className="mt-3">
                <p className="text-[12px] text-[rgba(90,35,56,0.7)]">
                  Temporary password — share it securely; it won&apos;t be shown again:
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-[#fdf4ec] px-3 py-2 text-[14px] tracking-wide text-[#5a2338]">
                    {done.generated}
                  </code>
                  <button onClick={copy} className="rounded-lg border border-[rgba(201,73,124,0.3)] px-3 py-2 text-[12px] font-medium text-[#c9497c] hover:bg-[#fdf4ec]">
                    {copied ? "Copied ✓" : "Copy"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-[12px] text-[rgba(90,35,56,0.7)]">The password you set is now active.</p>
            )}
            <div className="mt-5 flex justify-end">
              <button onClick={onClose} className="rounded-lg bg-[#c9497c] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90">
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <label className="block text-[12px] text-[rgba(90,35,56,0.7)]">
              New password
              <input
                type="text"
                autoComplete="off"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Leave blank to auto-generate"
                className="mt-1 w-full rounded-lg border border-[rgba(201,73,124,0.25)] px-3 py-2 text-[14px] text-[#5a2338] outline-none focus:border-[#c9497c]"
              />
            </label>
            <p className="mt-1 text-[11px] text-[rgba(90,35,56,0.5)]">
              Minimum 8 characters. Leave blank to generate a secure temporary password.
            </p>
            {err ? <p className="mt-2 text-[12px] text-rose-600">{err}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg border border-[rgba(90,35,56,0.2)] px-4 py-2 text-[13px] text-[rgba(90,35,56,0.75)] hover:bg-[#fdf4ec]">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={busy}
                className="rounded-lg bg-[#c9497c] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {busy ? "Resetting…" : "Reset password"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- small helpers ---------- */

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    published: { bg: "#dcfce7", fg: "#166534" },
    draft: { bg: "#fdf1e2", fg: "#c98f2e" },
    expired: { bg: "#fbe0d8", fg: "#b04a36" },
  };
  const c = map[status] || { bg: "#fdf4ec", fg: "#8a5f6c" };
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.1em]"
      style={{ background: c.bg, color: c.fg }}
    >
      {status}
    </span>
  );
}

function RolePill({ role }: { role: string }) {
  const admin = role === "admin";
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.1em]"
      style={{
        background: admin ? "#f9dce9" : "#fdf4ec",
        color: admin ? "#a53a66" : "#8a5f6c",
      }}
    >
      {role}
    </span>
  );
}
