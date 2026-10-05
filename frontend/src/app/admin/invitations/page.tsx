"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, type DesignSnapshot } from "@/lib/api";
import { templates } from "@/templates/registry";

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

const UNDO_KEY = "admin-design-undo";

/** Admin — every couple's invitation, with full edit access via the Studio. */
export default function AdminInvitationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [changing, setChanging] = useState<Row | null>(null);
  // the last design change per invitation, for its "Undo" — kept in this
  // browser so it survives a reload or a look at the live page
  // (read on first render: the rows only render once the admin is known, so
  // never on the server, and there is no markup for this to mismatch)
  const [changed, setChanged] = useState<Record<string, { design: string; previous: DesignSnapshot }>>(() => {
    try {
      return typeof window === "undefined" ? {} : JSON.parse(localStorage.getItem(UNDO_KEY) || "{}");
    } catch {
      return {}; // storage unavailable — Undo lasts for this visit only
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(UNDO_KEY, JSON.stringify(changed));
    } catch {
      /* storage full or unavailable */
    }
  }, [changed]);

  const undo = async (r: Row) => {
    const c = changed[r.id];
    if (!c) return;
    try {
      await api.adminRestoreDesign(r.id, c.previous);
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, templateId: c.previous.templateId } : x)));
      setChanged((all) => {
        const rest = { ...all };
        delete rest[r.id];
        return rest;
      });
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

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
    return <div className="flex h-dvh items-center justify-center text-[var(--b-muted)]">Loading…</div>;
  }

  const statusPill = (status: string) =>
    status === "published"
      ? "bg-emerald-50 text-emerald-700"
      : status === "expired"
        ? "bg-amber-50 text-amber-700"
        : "bg-[var(--b-tint)] text-[var(--b-muted)]";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--b-gold)]">Couples</p>
          <h1 className="font-display text-2xl text-[var(--b-ink)]">All invitations</h1>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search couple, email or slug…"
          className="w-64 rounded-lg border border-[rgba(43,27,18,0.2)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--b-primary)]"
        />
      </div>

      {msg ? <p className="mb-3 text-sm text-rose-600">{msg}</p> : null}

      <div className="space-y-3">
        {filtered.map((r) => (
          <div key={r.id} className="rounded-xl border border-[rgba(43,27,18,0.08)] bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-lg text-[var(--b-ink)]">{r.names}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[rgba(43,27,18,0.6)]">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${statusPill(r.status)}`}>
                    {r.status}
                  </span>
                  <span>{r.views} views · {r.rsvpCount} RSVPs</span>
                  <span className="truncate">owner: {r.ownerName ? `${r.ownerName} — ` : ""}{r.ownerEmail}</span>
                </p>
                <p className="mt-1 truncate text-xs text-[rgba(43,27,18,0.45)]">
                  {r.slug ? `/i/${r.slug} · ` : ""}layout: {templates.find((t) => t.id === r.templateId)?.name ?? r.templateId}
                </p>
                {changed[r.id] ? (
                  <p className="mt-1.5 text-xs text-emerald-700">
                    Now on &ldquo;{changed[r.id].design}&rdquo; ✓ — all their details kept.{" "}
                    <button type="button" onClick={() => undo(r)} className="font-medium underline hover:text-emerald-900">
                      Undo
                    </button>
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Link
                  href={`/studio?id=${r.id}`}
                  className="rounded-full bg-[var(--b-primary)] px-3 py-1.5 font-medium text-white hover:bg-[#23315a]"
                >
                  Edit in Studio
                </Link>
                {r.slug && r.status === "published" ? (
                  <a
                    href={`/i/${r.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-[rgba(43,27,18,0.2)] px-3 py-1.5 text-[var(--b-ink)] hover:bg-[var(--b-tint)]"
                  >
                    View live ↗
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => setChanging(r)}
                  className="rounded-full border border-[rgba(43,27,18,0.2)] px-3 py-1.5 text-[var(--b-ink)] hover:bg-[var(--b-tint)]"
                >
                  Change design
                </button>
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
                  className="rounded-full border border-[rgba(43,27,18,0.2)] px-3 py-1.5 text-[var(--b-ink)] hover:bg-[var(--b-tint)]"
                >
                  Excel ↓
                </a>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[rgba(43,27,18,0.15)] p-8 text-center text-sm text-[rgba(43,27,18,0.5)]">
            {rows.length === 0 ? "No invitations yet." : "Nothing matches your search."}
          </p>
        ) : null}
      </div>

      {changing ? (
        <ChangeDesignModal
          row={changing}
          onClose={() => setChanging(null)}
          onChanged={(design, templateId, previous) => {
            setRows((prev) => prev.map((x) => (x.id === changing.id ? { ...x, templateId } : x)));
            setChanged((c) => ({ ...c, [changing.id]: { design, previous } }));
            setChanging(null);
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * Move a couple onto another saved design. Only the look changes — layout,
 * colours, fonts, background art, community motifs. Their names, events,
 * photos, RSVPs and link are left exactly as they are, and the page offers an
 * Undo afterwards.
 */
/** What the picker needs of a saved design. */
type DesignCard = { id: string; name: string; templateId: string; previewUrl?: string | null; active?: boolean };

function ChangeDesignModal({
  row,
  onClose,
  onChanged,
}: {
  row: Row;
  onClose: () => void;
  onChanged: (design: string, templateId: string, previous: DesignSnapshot) => void;
}) {
  const [designs, setDesigns] = useState<DesignCard[] | null>(null);
  const [pick, setPick] = useState<DesignCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .adminListDesigns()
      .then(setDesigns)
      .catch((e) => setErr((e as Error).message));
  }, []);

  const apply = async () => {
    if (!pick) return;
    setBusy(true);
    setErr("");
    try {
      const r = await api.adminChangeDesign(row.id, pick.id);
      onChanged(r.design, r.templateId, r.previous);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  const layoutName = (id: string) => templates.find((t) => t.id === id)?.name ?? id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(43,27,18,0.4)] p-4" onClick={onClose}>
      <div
        className="max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-[0_20px_60px_rgba(43,27,18,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg uppercase tracking-[0.1em] text-[var(--b-ink)]">
          Change design · {row.names}
        </h3>

        {pick ? (
          <>
            <div className="mt-4 flex gap-4 rounded-lg bg-[var(--b-tint)] p-4">
              {pick.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pick.previewUrl} alt="" className="h-28 w-20 shrink-0 rounded object-cover" />
              ) : null}
              <div className="text-[13px] text-[var(--b-body)]">
                <p>
                  Switch <strong className="text-[var(--b-ink)]">{row.names}</strong> to{" "}
                  <strong className="text-[var(--b-ink)]">&ldquo;{pick.name}&rdquo;</strong> ({layoutName(pick.templateId)})?
                </p>
                <p className="mt-2">
                  Their names, events, photos, RSVPs and link stay the same — only the look changes.
                  {row.status === "published" ? " The live page changes straight away." : ""}
                </p>
                <p className="mt-2 text-[12px] text-[var(--b-muted)]">You can undo it from this page afterwards.</p>
              </div>
            </div>
            {err ? <p className="mt-3 text-sm text-rose-600">{err}</p> : null}
            <div className="mt-5 flex justify-end gap-2 text-sm">
              <button
                type="button"
                onClick={() => setPick(null)}
                className="rounded-full border border-[rgba(43,27,18,0.2)] px-4 py-2 text-[var(--b-ink)] hover:bg-[var(--b-tint)]"
              >
                Back
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={apply}
                className="rounded-full bg-[var(--b-primary)] px-4 py-2 font-medium text-white hover:bg-[#23315a] disabled:opacity-60"
              >
                {busy ? "Changing…" : "Change design"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-[13px] text-[var(--b-body)]">
              Pick the new design. All of the couple&apos;s details move across as they are.
            </p>
            {err ? <p className="mt-3 text-sm text-rose-600">{err}</p> : null}
            {!designs && !err ? <p className="mt-4 text-sm text-[var(--b-muted)]">Loading designs…</p> : null}
            {designs && designs.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--b-muted)]">No saved designs yet — create one in Admin → Designs.</p>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(designs ?? []).map((d) => (
                <div key={d.id} className="overflow-hidden rounded-xl border border-[rgba(43,27,18,0.1)]">
                  <div className="aspect-[3/4] bg-[var(--b-tint)]">
                    {d.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.previewUrl} alt={d.name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="p-2.5">
                    <p className="truncate text-sm font-medium text-[var(--b-ink)]">{d.name}</p>
                    <p className="truncate text-[11px] text-[var(--b-muted)]">
                      {layoutName(d.templateId)}
                      {d.active ? "" : " · hidden"}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setPick(d)}
                        className="rounded-full bg-[var(--b-primary)] px-3 py-1 font-medium text-white hover:bg-[#23315a]"
                      >
                        Use this
                      </button>
                      <a
                        href={`/preview/${d.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--b-muted)] underline hover:text-[var(--b-ink)]"
                      >
                        Preview ↗
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
