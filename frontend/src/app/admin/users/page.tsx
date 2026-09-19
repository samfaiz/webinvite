"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

/** A row from `GET /admin/users` (see backend AdminService.listUsers). */
type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  canDuplicate: boolean;
  invitations: number;
  createdAt: string;
};

/**
 * `/admin/users` — every registered account, with the per-user feature
 * permissions and password reset. Split out of the dashboard, where it sat
 * below the full invitations table and was effectively unreachable once a
 * few dozen invitations existed.
 */
export default function AdminUsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [query, setQuery] = useState("");
  const [resetUser, setResetUser] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) return void router.push("/login");
    if (user.role !== "admin") return void router.push("/dashboard");
    api
      .adminUsers()
      .then(setUsers)
      .catch((e) => setError((e as Error).message))
      .finally(() => setBusy(false));
  }, [loading, user, router]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div
        className="flex h-[80vh] items-center justify-center text-[rgba(43,27,18,0.5)]"
        style={{ fontFamily: "var(--f-body)" }}
      >
        Loading…
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const shown = q
    ? users.filter(
        (u) =>
          u.email?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q),
      )
    : users;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10 sm:py-10" style={{ fontFamily: "var(--f-body)" }}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--b-gold)]">
            Couples
          </span>
          <h1
            className="mt-1 text-4xl font-medium italic text-[var(--b-ink)] sm:text-[42px]"
            style={{ fontFamily: "var(--f-serif)" }}
          >
            Users
          </h1>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search email or name…"
          className="w-full max-w-xs rounded-full border border-[rgba(43,27,18,0.25)] px-4 py-2 text-[13px] text-[var(--b-ink)] outline-none focus:border-[var(--b-gold)] sm:w-64"
        />
      </div>

      {error ? <p className="mt-4 text-sm text-[#b3423a]">{error}</p> : null}

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[20px] font-medium italic text-[var(--b-ink)]" style={{ fontFamily: "var(--f-serif)" }}>
            All users
          </h2>
          <span className="text-[12px] text-[rgba(43,27,18,0.55)]">
            {q ? `${shown.length} of ${users.length}` : `${users.length} total`}
          </span>
        </div>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-[rgba(43,27,18,0.15)] bg-white shadow-[0_10px_30px_rgba(43,27,18,0.05)]">
          <table className="w-full text-left text-[13.5px]">
            <thead className="bg-[var(--b-tint)] text-[11px] font-medium uppercase tracking-[0.14em] text-[rgba(43,27,18,0.55)]">
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
              {shown.map((u) => (
                <tr key={u.id} className="border-t border-[rgba(43,27,18,0.06)] transition-colors hover:bg-[var(--b-tint)]/60">
                  <td className="px-5 py-3 text-[var(--b-ink)]">{u.email}</td>
                  <td className="px-5 py-3 text-[rgba(43,27,18,0.75)]">{u.name ?? "—"}</td>
                  <td className="px-5 py-3">
                    <RolePill role={u.role} />
                  </td>
                  <td className="px-5 py-3 text-[var(--b-ink)]">{u.invitations}</td>
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
                          : "bg-[var(--b-tint)] text-[var(--b-muted)] hover:bg-[var(--b-border)]"
                      }`}
                    >
                      {u.canDuplicate ? "Allowed ✓" : "Off"}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setResetUser({ id: u.id, email: u.email })}
                      className="rounded-lg border border-[rgba(43,27,18,0.3)] px-3 py-1.5 text-[12px] font-medium text-[var(--b-gold)] transition-colors hover:bg-[var(--b-tint)]"
                    >
                      Reset password
                    </button>
                  </td>
                </tr>
              ))}
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[rgba(43,27,18,0.45)]">
                    {busy ? "Loading…" : q ? "No users match that search." : "No users yet."}
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
        <h3 className="text-[18px] font-medium italic text-[var(--b-ink)]" style={{ fontFamily: "var(--f-serif)" }}>
          Reset password
        </h3>
        <p className="mt-1 text-[13px] text-[rgba(43,27,18,0.7)]">
          for <strong className="text-[var(--b-ink)]">{user.email}</strong>
        </p>

        {done ? (
          <div className="mt-4">
            <p className="text-[13px] font-medium text-emerald-700">Password updated ✓</p>
            {done.generated ? (
              <div className="mt-3">
                <p className="text-[12px] text-[rgba(43,27,18,0.7)]">
                  Temporary password — share it securely; it won&apos;t be shown again:
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-[var(--b-tint)] px-3 py-2 text-[14px] tracking-wide text-[var(--b-ink)]">
                    {done.generated}
                  </code>
                  <button onClick={copy} className="rounded-lg border border-[rgba(43,27,18,0.3)] px-3 py-2 text-[12px] font-medium text-[var(--b-gold)] hover:bg-[var(--b-tint)]">
                    {copied ? "Copied ✓" : "Copy"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-[12px] text-[rgba(43,27,18,0.7)]">The password you set is now active.</p>
            )}
            <div className="mt-5 flex justify-end">
              <button onClick={onClose} className="rounded-lg bg-[var(--b-gold)] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90">
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <label className="block text-[12px] text-[rgba(43,27,18,0.7)]">
              New password
              <input
                type="text"
                autoComplete="off"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Leave blank to auto-generate"
                className="mt-1 w-full rounded-lg border border-[rgba(43,27,18,0.25)] px-3 py-2 text-[14px] text-[var(--b-ink)] outline-none focus:border-[var(--b-gold)]"
              />
            </label>
            <p className="mt-1 text-[11px] text-[rgba(43,27,18,0.5)]">
              Minimum 8 characters. Leave blank to generate a secure temporary password.
            </p>
            {err ? <p className="mt-2 text-[12px] text-rose-600">{err}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg border border-[rgba(43,27,18,0.2)] px-4 py-2 text-[13px] text-[rgba(43,27,18,0.75)] hover:bg-[var(--b-tint)]">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={busy}
                className="rounded-lg bg-[var(--b-gold)] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-60"
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

function RolePill({ role }: { role: string }) {
  const admin = role === "admin";
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.1em]"
      style={{
        background: admin ? "#f9dce9" : "var(--b-tint)",
        color: admin ? "#a53a66" : "#8a5f6c",
      }}
    >
      {role}
    </span>
  );
}
