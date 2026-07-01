"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, API_BASE } from "@/lib/api";

const PUBLIC_ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "";

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState("");
  const [rsvpFor, setRsvpFor] = useState<string | null>(null);
  const [rsvpData, setRsvpData] = useState<any>(null);

  const refresh = useCallback(() => {
    api
      .listInvitations()
      .then(setItems)
      .catch((e) => setError((e as Error).message));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    refresh();
  }, [loading, user, router, refresh]);

  if (loading || !user) {
    return <div className="flex h-screen items-center justify-center text-slate-400">Loading…</div>;
  }

  const act = async (fn: () => Promise<any>) => {
    try {
      await fn();
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const viewRsvps = async (id: string) => {
    if (rsvpFor === id) {
      setRsvpFor(null);
      return;
    }
    setRsvpFor(id);
    setRsvpData(null);
    try {
      setRsvpData(await api.listRsvps(id));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const downloadExcel = async (inv: any) => {
    try {
      const blob = await api.downloadRsvpsXlsx(inv.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${inv.slug || inv.id}-rsvps.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const emailExport = async (inv: any) => {
    try {
      const r = await api.sendExport(inv.id);
      alert(
        r.sent
          ? `Emailed the RSVP list to ${r.recipient} (${r.count} responses).`
          : `Dev mode: no SMTP configured, so nothing was emailed. The Excel was saved on the server at backend/exports/. Add SMTP credentials in backend/.env to send for real.`,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="font-display text-lg uppercase tracking-[0.12em] text-[#2b3a67]">
            Eternal
          </span>
          <Link href="/gallery" className="text-sm text-slate-500 hover:text-slate-800">Designs</Link>
          {user.role === "admin" ? (
            <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-800">Admin</Link>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{user.email}</span>
          <button onClick={logout} className="text-sm text-rose-600 hover:underline">Log out</button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl uppercase tracking-[0.12em] text-[#2b3a67]">
            My Invitations
          </h1>
          <Link
            href="/create"
            className="rounded-lg bg-[#2b3a67] px-4 py-2 text-sm text-white hover:bg-[#23315a]"
          >
            + New invitation
          </Link>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

        {items === null ? (
          <p className="mt-8 text-slate-400">Loading…</p>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
            <p className="font-body text-lg text-slate-500">No invitations yet.</p>
            <Link href="/gallery" className="mt-3 inline-block text-sm text-[#b08d57] hover:underline">
              Pick a design to get started →
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {items.map((inv) => (
              <div key={inv.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-sm uppercase tracking-[0.1em] text-[#2b3a67]">
                      {inv.names || "Untitled"}
                    </p>
                    <p className="text-xs text-slate-500">
                      <span
                        className="mr-2 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide"
                        style={{
                          background:
                            inv.status === "published"
                              ? "#dcfce7"
                              : inv.status === "expired"
                                ? "#fee2e2"
                                : "#f1f5f9",
                          color:
                            inv.status === "published"
                              ? "#166534"
                              : inv.status === "expired"
                                ? "#991b1b"
                                : "#475569",
                        }}
                      >
                        {inv.status}
                      </span>
                      {inv.views} views · {inv.rsvpCount} RSVPs
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Link href={`/studio?id=${inv.id}`} className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50">Edit</Link>
                    {inv.status === "published" && inv.slug ? (
                      <a href={`/i/${inv.slug}`} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50">View live ↗</a>
                    ) : null}
                    {inv.status === "published" ? (
                      <button onClick={() => act(() => api.unpublishInvitation(inv.id))} className="rounded-lg border border-amber-200 px-3 py-1.5 text-amber-700 hover:bg-amber-50">Unpublish</button>
                    ) : (
                      <button onClick={() => act(() => api.publishInvitation(inv.id))} className="rounded-lg border border-emerald-200 px-3 py-1.5 text-emerald-700 hover:bg-emerald-50">Publish</button>
                    )}
                    <button onClick={() => viewRsvps(inv.id)} className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50">RSVPs</button>
                    <button onClick={() => downloadExcel(inv)} className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50">Excel ↓</button>
                    <button onClick={() => emailExport(inv)} className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50">Email me</button>
                    <button
                      onClick={() => { if (confirm("Delete this invitation?")) act(() => api.deleteInvitation(inv.id)); }}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-rose-600 hover:bg-rose-50"
                    >Delete</button>
                  </div>
                </div>

                {inv.status === "published" && inv.slug ? (
                  <p className="mt-2 text-xs text-slate-400">
                    {PUBLIC_ORIGIN}/i/{inv.slug}
                  </p>
                ) : null}

                {rsvpFor === inv.id ? (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                    {!rsvpData ? (
                      <p className="text-slate-400">Loading RSVPs…</p>
                    ) : rsvpData.total === 0 ? (
                      <p className="text-slate-500">No RSVPs yet.</p>
                    ) : (
                      <>
                        <p className="mb-2 text-slate-600">
                          {rsvpData.accepted} accepting ({rsvpData.headcount} guests) · {rsvpData.declined} declining
                        </p>
                        <ul className="space-y-1">
                          {rsvpData.rsvps.map((r: any) => (
                            <li key={r.id} className="flex justify-between border-b border-slate-100 py-1">
                              <span>{r.guestName}</span>
                              <span style={{ color: r.attending === "accept" ? "#166534" : "#991b1b" }}>
                                {r.attending === "accept" ? `Accepts (${r.guests})` : "Declines"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
        <p className="mt-6 text-[11px] text-slate-400">API: {API_BASE}</p>
      </main>
    </div>
  );
}
