"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { AdminHeader } from "./AdminHeader";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
      <p className="font-display text-3xl text-[#2b3a67]">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
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
    return <div className="flex h-screen items-center justify-center text-slate-400">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      <AdminHeader active="/admin" />

      <main className="mx-auto max-w-5xl px-6 py-10">
        {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Users" value={stats?.users ?? "—"} />
          <StatCard label="Invitations" value={stats?.invitations ?? "—"} />
          <StatCard label="Published" value={stats?.published ?? "—"} />
          <StatCard label="Drafts" value={stats?.drafts ?? "—"} />
          <StatCard label="RSVPs" value={stats?.rsvps ?? "—"} />
          <StatCard label="Total views" value={stats?.totalViews ?? "—"} />
        </div>

        <section className="mt-10">
          <h2 className="font-display text-lg uppercase tracking-[0.1em] text-[#2b3a67]">All Invitations</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-2">Owner</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Template</th>
                  <th className="px-4 py-2">Views</th>
                  <th className="px-4 py-2">RSVPs</th>
                  <th className="px-4 py-2">Slug</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((i) => (
                  <tr key={i.id} className="border-b border-slate-50">
                    <td className="px-4 py-2">{i.owner}</td>
                    <td className="px-4 py-2">{i.status}</td>
                    <td className="px-4 py-2 text-slate-500">{i.templateId}</td>
                    <td className="px-4 py-2">{i.views}</td>
                    <td className="px-4 py-2">{i.rsvpCount}</td>
                    <td className="px-4 py-2 text-slate-500">{i.slug ?? "—"}</td>
                  </tr>
                ))}
                {invites.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No invitations yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-lg uppercase tracking-[0.1em] text-[#2b3a67]">Users</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Invitations</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50">
                    <td className="px-4 py-2">{u.email}</td>
                    <td className="px-4 py-2">{u.name ?? "—"}</td>
                    <td className="px-4 py-2">{u.role}</td>
                    <td className="px-4 py-2">{u.invitations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
