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
    return (
      <div
        className="flex h-screen items-center justify-center bg-[#fff8f0] text-[rgba(90,35,56,0.55)]"
        style={{ fontFamily: "var(--f-body)" }}
      >
        Loading…
      </div>
    );
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
    <div className="min-h-screen bg-[#fff8f0]">
      <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#e3a23c,#e0705a,#c9497c,#7a5ba6)" }} />
      <header className="flex items-center justify-between border-b border-[rgba(90,35,56,0.08)] bg-white px-6 py-4">
        <div className="flex items-center gap-5" style={{ fontFamily: "var(--f-body)" }}>
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-[22px] font-semibold italic text-[#5a2338]" style={{ fontFamily: "var(--f-serif)" }}>
              Web Invite
            </span>
            <span className="h-[5px] w-[5px] rotate-45 bg-[#e0705a]" />
          </Link>
          <Link href="/gallery" className="text-sm text-[rgba(90,35,56,0.7)] hover:text-[#d95f48]">Designs</Link>
          {user.role === "admin" ? (
            <Link href="/admin" className="text-sm text-[rgba(90,35,56,0.7)] hover:text-[#d95f48]">Admin</Link>
          ) : null}
        </div>
        <div className="flex items-center gap-4" style={{ fontFamily: "var(--f-body)" }}>
          <span className="text-sm text-[rgba(90,35,56,0.6)]">{user.email}</span>
          <button onClick={logout} className="text-sm text-[#c14e38] hover:underline">Log out</button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium tracking-[0.24em] text-[#c9497c]" style={{ fontFamily: "var(--f-body)" }}>
              MY INVITATIONS
            </span>
            <h1 className="mt-1 text-3xl font-medium italic text-[#5a2338] sm:text-4xl" style={{ fontFamily: "var(--f-serif)" }}>
              Your celebrations
            </h1>
          </div>
          <Link
            href="/create"
            className="rounded-full bg-[#d95f48] px-5 py-2.5 text-sm font-medium text-white shadow-[0_10px_24px_rgba(217,95,72,0.3)] transition-colors hover:bg-[#c14e38]"
            style={{ fontFamily: "var(--f-body)" }}
          >
            + New invitation
          </Link>
        </div>

        {error ? <p className="mt-4 text-sm text-[#c14e38]" style={{ fontFamily: "var(--f-body)" }}>{error}</p> : null}

        {items === null ? (
          <p className="mt-8 text-[rgba(90,35,56,0.5)]" style={{ fontFamily: "var(--f-body)" }}>Loading…</p>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-[rgba(201,73,124,0.3)] bg-white/60 p-10 text-center">
            <p className="text-lg italic text-[rgba(90,35,56,0.65)]" style={{ fontFamily: "var(--f-serif)" }}>
              No invitations yet.
            </p>
            <Link href="/gallery" className="mt-3 inline-block text-sm font-medium text-[#c9497c] hover:underline" style={{ fontFamily: "var(--f-body)" }}>
              Pick a design to get started →
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-3" style={{ fontFamily: "var(--f-body)" }}>
            {items.map((inv) => (
              <div key={inv.id} className="rounded-xl border border-[rgba(201,73,124,0.15)] bg-white p-5 shadow-[0_10px_30px_rgba(122,44,44,0.05)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[17px] font-medium italic text-[#5a2338]" style={{ fontFamily: "var(--f-serif)" }}>
                      {inv.names || "Untitled"}
                    </p>
                    <p className="text-xs text-[rgba(90,35,56,0.55)]">
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
                    <Link href={`/studio?id=${inv.id}`} className="rounded-full border border-[rgba(90,35,56,0.2)] px-3 py-1.5 text-[#5a2338] hover:bg-[#fdf4ec]">Edit</Link>
                    {user.canDuplicate ? (
                      <button
                        onClick={() => act(() => api.duplicateInvitation(inv.id))}
                        title="Copy this invitation's content into a new draft"
                        className="rounded-full border border-[rgba(90,35,56,0.2)] px-3 py-1.5 text-[#5a2338] hover:bg-[#fdf4ec]"
                      >
                        Duplicate
                      </button>
                    ) : null}
                    {inv.status === "published" && inv.slug ? (
                      <a href={`/i/${inv.slug}`} target="_blank" rel="noreferrer" className="rounded-full border border-[rgba(90,35,56,0.2)] px-3 py-1.5 text-[#5a2338] hover:bg-[#fdf4ec]">View live ↗</a>
                    ) : null}
                    {inv.status === "published" ? (
                      <button onClick={() => act(() => api.unpublishInvitation(inv.id))} className="rounded-full border border-amber-200 px-3 py-1.5 text-amber-700 hover:bg-amber-50">Unpublish</button>
                    ) : (
                      <button onClick={() => act(() => api.publishInvitation(inv.id))} className="rounded-full border border-emerald-200 px-3 py-1.5 text-emerald-700 hover:bg-emerald-50">Publish</button>
                    )}
                    <button onClick={() => viewRsvps(inv.id)} className="rounded-full border border-[rgba(90,35,56,0.2)] px-3 py-1.5 text-[#5a2338] hover:bg-[#fdf4ec]">RSVPs</button>
                    <button onClick={() => downloadExcel(inv)} className="rounded-full border border-[rgba(90,35,56,0.2)] px-3 py-1.5 text-[#5a2338] hover:bg-[#fdf4ec]">Excel ↓</button>
                    <button onClick={() => emailExport(inv)} className="rounded-full border border-[rgba(90,35,56,0.2)] px-3 py-1.5 text-[#5a2338] hover:bg-[#fdf4ec]">Email me</button>
                    <button
                      onClick={() => { if (confirm("Delete this invitation?")) act(() => api.deleteInvitation(inv.id)); }}
                      className="rounded-full border border-[rgba(217,95,72,0.4)] px-3 py-1.5 text-[#c14e38] hover:bg-[#fbe0d8]"
                    >Delete</button>
                  </div>
                </div>

                {inv.status === "published" && inv.slug ? (
                  <p className="mt-2 text-xs text-[rgba(90,35,56,0.45)]">
                    {PUBLIC_ORIGIN}/i/{inv.slug}
                  </p>
                ) : null}

                {rsvpFor === inv.id ? (
                  <div className="mt-3 rounded-lg bg-[#fdf4ec] p-3 text-sm">
                    {!rsvpData ? (
                      <p className="text-[rgba(90,35,56,0.5)]">Loading RSVPs…</p>
                    ) : rsvpData.total === 0 ? (
                      <p className="text-[rgba(90,35,56,0.6)]">No RSVPs yet.</p>
                    ) : (
                      <>
                        <p className="mb-2 text-[rgba(90,35,56,0.75)]">
                          {rsvpData.accepted} accepting ({rsvpData.headcount} guests) · {rsvpData.declined} declining
                        </p>
                        <ul className="space-y-1">
                          {rsvpData.rsvps.map((r: any) => (
                            <li key={r.id} className="flex justify-between gap-2 border-b border-[rgba(90,35,56,0.08)] py-1">
                              <span className="min-w-0">
                                {r.guestName}
                                {r.email ? (
                                  <span className="block truncate text-[11px] text-[rgba(90,35,56,0.55)]">
                                    {r.email}
                                    {r.subscribed ? " · updates ✓" : ""}
                                  </span>
                                ) : null}
                              </span>
                              <span className="shrink-0" style={{ color: r.attending === "accept" ? "#166534" : "#991b1b" }}>
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
        <p className="mt-6 text-[11px] text-[rgba(90,35,56,0.4)]" style={{ fontFamily: "var(--f-body)" }}>API: {API_BASE}</p>
      </main>
    </div>
  );
}
