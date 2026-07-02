"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, type ContactMessage } from "@/lib/api";

type Filter = "all" | "new" | "read" | "replied";

/**
 * `/admin/contact-messages` — inbox for public /contact submissions.
 * Left column: filter tabs + list of messages. Right column: the selected
 * message with reply / mark-read / delete actions.
 */
export default function AdminContactMessagesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<ContactMessage[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setItems(null);
    setErr(null);
    try {
      const list = await api.adminListContactMessages();
      setItems(list);
      if (list.length && !selectedId) setSelectedId(list[0].id);
    } catch (e) {
      setErr((e as Error).message);
      setItems([]);
    }
  }, [selectedId]);

  useEffect(() => {
    if (loading) return;
    if (!user) return void router.push("/login");
    if (user.role !== "admin") return void router.push("/dashboard");
    load();
  }, [loading, user, router, load]);

  const visible = useMemo(() => {
    if (!items) return [];
    return filter === "all" ? items : items.filter((m) => m.status === filter);
  }, [items, filter]);

  const selected = useMemo(
    () => (items && selectedId ? items.find((m) => m.id === selectedId) || null : null),
    [items, selectedId],
  );

  const patchLocal = (id: string, changes: Partial<ContactMessage>) => {
    setItems((prev) => (prev ? prev.map((m) => (m.id === id ? { ...m, ...changes } : m)) : prev));
  };

  // When selecting a "new" message, auto mark-read (matches every inbox anywhere).
  useEffect(() => {
    if (!selected || selected.status !== "new") return;
    api
      .adminMarkContactRead(selected.id)
      .then((m) => patchLocal(m.id, { status: m.status, readAt: m.readAt }))
      .catch(() => {});
  }, [selected]);

  if (loading || items === null) {
    return (
      <div
        className="flex h-[70vh] items-center justify-center text-[rgba(90,35,56,0.5)]"
        style={{ fontFamily: "var(--f-body)" }}
      >
        Loading messages…
      </div>
    );
  }

  const counts = {
    all: items.length,
    new: items.filter((m) => m.status === "new").length,
    read: items.filter((m) => m.status === "read").length,
    replied: items.filter((m) => m.status === "replied").length,
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 sm:px-10 sm:py-10" style={{ fontFamily: "var(--f-body)" }}>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-[12px] text-[rgba(90,35,56,0.55)]">
            <Link href="/admin" className="hover:text-[#d95f48]">Admin</Link>
            <span className="text-[rgba(90,35,56,0.3)]">›</span>
            <span className="text-[rgba(90,35,56,0.55)]">Inbox</span>
            <span className="text-[rgba(90,35,56,0.3)]">›</span>
            <span className="text-[rgba(90,35,56,0.75)]">Contact Messages</span>
          </nav>
          <h1
            className="mt-1 text-4xl font-medium italic text-[#5a2338] sm:text-[42px]"
            style={{ fontFamily: "var(--f-serif)" }}
          >
            Contact Messages
          </h1>
        </div>
      </div>

      {err ? <div className="mt-4 rounded-lg border border-[rgba(217,95,72,0.4)] bg-[#fbe0d8] px-4 py-2 text-sm text-[#7a2418]">{err}</div> : null}

      {/* Filter tabs */}
      <div className="mt-6 flex flex-wrap gap-1 rounded-full border border-[rgba(201,73,124,0.15)] bg-white p-1">
        {(["all", "new", "read", "replied"] as Filter[]).map((f) => {
          const on = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                "rounded-full px-4 py-1.5 text-[12.5px] font-medium capitalize transition-colors " +
                (on ? "bg-[#d95f48] text-white shadow-[0_6px_14px_rgba(217,95,72,0.25)]" : "text-[rgba(90,35,56,0.7)] hover:bg-[#fdf4ec]")
              }
            >
              {f} <span className="ml-1 opacity-60">{counts[f]}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(280px,360px)_1fr]">
        {/* List */}
        <div className="overflow-hidden rounded-2xl border border-[rgba(201,73,124,0.15)] bg-white shadow-[0_10px_30px_rgba(122,44,44,0.05)]">
          {visible.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-[rgba(90,35,56,0.5)]">
              {items.length === 0
                ? "No messages yet."
                : `No ${filter === "all" ? "" : filter + " "}messages.`}
            </p>
          ) : (
            <ul className="divide-y divide-[rgba(90,35,56,0.06)]">
              {visible.map((m) => {
                const on = m.id === selectedId;
                return (
                  <li key={m.id}>
                    <button
                      onClick={() => setSelectedId(m.id)}
                      className={
                        "flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors " +
                        (on ? "bg-[#fbe0d8]/50" : "hover:bg-[#fdf4ec]/60")
                      }
                    >
                      <span className="flex w-full items-center justify-between gap-2">
                        <span className="flex items-center gap-2 truncate">
                          {m.status === "new" ? (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-[#e3a23c]" aria-label="Unread" />
                          ) : null}
                          <span className="truncate text-[13.5px] font-medium text-[#5a2338]">{m.name}</span>
                        </span>
                        <span className="shrink-0 text-[11px] text-[rgba(90,35,56,0.5)]">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </span>
                      </span>
                      {m.subject ? (
                        <span className="line-clamp-1 text-[12.5px] text-[rgba(90,35,56,0.65)]">{m.subject}</span>
                      ) : null}
                      <span className="line-clamp-2 text-[12px] text-[rgba(90,35,56,0.5)]">{m.message}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Detail */}
        <div className="min-h-[300px] rounded-2xl border border-[rgba(201,73,124,0.15)] bg-white shadow-[0_10px_30px_rgba(122,44,44,0.05)]">
          {selected ? (
            <MessageDetail
              m={selected}
              onReplied={(u) => patchLocal(u.id, { status: u.status, repliedAt: u.repliedAt, readAt: u.readAt })}
              onDelete={async () => {
                if (!confirm(`Delete message from ${selected.name}?`)) return;
                try {
                  await api.adminDeleteContactMessage(selected.id);
                  setItems((prev) => (prev ? prev.filter((x) => x.id !== selected.id) : prev));
                  setSelectedId(null);
                } catch (e) {
                  setErr((e as Error).message);
                }
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 py-12 text-center text-[13.5px] text-[rgba(90,35,56,0.5)]">
              Select a message on the left to read it.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageDetail({
  m,
  onReplied,
  onDelete,
}: {
  m: ContactMessage;
  onReplied: (m: ContactMessage) => void;
  onDelete: () => void;
}) {
  const created = new Date(m.createdAt);
  const mailto = () => {
    const subj = m.subject ? `Re: ${m.subject}` : "Re: your message";
    const body =
      `Hi ${m.name.split(" ")[0]},\n\nThanks for reaching out.\n\n— \nQuoting your message:\n> ${m.message.replace(/\n/g, "\n> ")}`;
    return `mailto:${m.email}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
  };

  const markReplied = async () => {
    try {
      const u = await api.adminMarkContactReplied(m.id);
      onReplied(u);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgba(90,35,56,0.08)] px-6 py-5">
        <div className="min-w-0">
          <h2
            className="text-2xl font-medium italic text-[#5a2338]"
            style={{ fontFamily: "var(--f-serif)" }}
          >
            {m.name}
          </h2>
          <p className="mt-0.5 text-[13px] text-[rgba(90,35,56,0.7)]">
            <a href={`mailto:${m.email}`} className="hover:text-[#d95f48] hover:underline">{m.email}</a>
            {m.phone ? ` · ${m.phone}` : ""}
          </p>
          {m.subject ? (
            <p className="mt-1 text-[13px] font-medium text-[#5a2338]">{m.subject}</p>
          ) : null}
          <p className="mt-2 text-[11.5px] text-[rgba(90,35,56,0.5)]">
            {created.toLocaleString()} · via {m.source}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={m.status} />
          <a
            href={mailto()}
            className="rounded-full bg-[#d95f48] px-4 py-2 text-[12.5px] font-medium text-white shadow-[0_8px_20px_rgba(217,95,72,0.25)] transition-colors hover:bg-[#c14e38]"
          >
            Reply by email
          </a>
          {m.status !== "replied" ? (
            <button
              onClick={markReplied}
              className="rounded-full border border-[rgba(92,138,94,0.4)] px-3 py-1.5 text-[12px] font-medium text-[#2f6b50] hover:bg-[#eaf6ea]"
            >
              Mark replied
            </button>
          ) : null}
          <button
            onClick={onDelete}
            className="rounded-full border border-[rgba(217,47,47,0.4)] px-3 py-1.5 text-[12px] font-medium text-[#c14e38] hover:bg-[#fbe0d8]"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="flex-1 whitespace-pre-wrap px-6 py-6 text-[14px] leading-[1.65] text-[rgba(90,35,56,0.85)]">
        {m.message}
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: ContactMessage["status"] }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    new: { bg: "#fdf1e2", fg: "#c98f2e", label: "NEW" },
    read: { bg: "#fdf4ec", fg: "#8a5f6c", label: "READ" },
    replied: { bg: "#eaf6ea", fg: "#2f6b50", label: "REPLIED" },
  };
  const c = map[status] || map.new;
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.14em]"
      style={{ background: c.bg, color: c.fg }}
    >
      {c.label}
    </span>
  );
}
