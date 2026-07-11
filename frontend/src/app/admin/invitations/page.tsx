"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

type Row = {
  id: string;
  slug: string | null;
  status: string;
  templateId: string;
  names: string;
  ownerEmail: string;
  ownerName: string;
  views: number;
  rsvpCount: number;
  updatedAt: string;
};

/** Admin — every couple's invitation, with full edit access via the Studio. */
export default function AdminInvitationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) return void router.push("/login");
    if (user.role !== "admin") return void router.push("/dashboard");
    api.adminInvitations().then(setRows).catch((e) => setMsg((e as Error).message));
  }, [loading, user, router]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.names, r.ownerEmail, r.ownerName, r.slug ?? ""].some((v) => v.toLowerCase().includes(needle)),
    );
  }, [rows, q]);

  if (loading || !user || user.role !== "admin") {
    return <div className="flex h-dvh items-center justify-center text-slate-400">Loading…</div>;
  }

  const statusPill = (status: string) =>
    status === "published"
      ? "bg-emerald-50 text-emerald-700"
      : status === "expired"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-500";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#c9497c]">Couples</p>
          <h1 className="font-display text-2xl text-[#5a2338]">All invitations</h1>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search couple, email or slug…"
          className="w-64 rounded-lg border border-[rgba(90,35,56,0.2)] bg-white px-3 py-2 text-sm outline-none focus:border-[#d95f48]"
        />
      </div>

      {msg ? <p className="mb-3 text-sm text-rose-600">{msg}</p> : null}

      <div className="space-y-3">
        {filtered.map((r) => (
          <div key={r.id} className="rounded-xl border border-[rgba(90,35,56,0.08)] bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-lg text-[#5a2338]">{r.names}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[rgba(90,35,56,0.6)]">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${statusPill(r.status)}`}>
                    {r.status}
                  </span>
                  <span>{r.views} views · {r.rsvpCount} RSVPs</span>
                  <span className="truncate">owner: {r.ownerName ? `${r.ownerName} — ` : ""}{r.ownerEmail}</span>
                </p>
                {r.slug ? (
                  <p className="mt-1 truncate text-xs text-[rgba(90,35,56,0.45)]">/i/{r.slug}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Link
                  href={`/studio?id=${r.id}`}
                  className="rounded-full bg-[#2b3a67] px-3 py-1.5 font-medium text-white hover:bg-[#23315a]"
                >
                  Edit in Studio
                </Link>
                {r.slug && r.status === "published" ? (
                  <a
                    href={`/i/${r.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-[rgba(90,35,56,0.2)] px-3 py-1.5 text-[#5a2338] hover:bg-[#fdf4ec]"
                  >
                    View live ↗
                  </a>
                ) : null}
                <a
                  href="#"
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      const blob = await api.downloadRsvpsXlsx(r.id);
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${r.slug || r.id}-rsvps.xlsx`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch (err) {
                      setMsg((err as Error).message);
                    }
                  }}
                  className="rounded-full border border-[rgba(90,35,56,0.2)] px-3 py-1.5 text-[#5a2338] hover:bg-[#fdf4ec]"
                >
                  Excel ↓
                </a>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[rgba(90,35,56,0.15)] p-8 text-center text-sm text-[rgba(90,35,56,0.5)]">
            {rows.length === 0 ? "No invitations yet." : "Nothing matches your search."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
