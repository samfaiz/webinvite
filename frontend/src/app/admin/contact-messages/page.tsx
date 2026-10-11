"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
        className="flex h-[70vh] items-center justify-center text-[rgba(43,27,18,0.5)]"
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
          <nav className="flex items-center gap-1.5 text-[12px] text-[rgba(43,27,18,0.55)]">
            <Link href="/admin" className="hover:text-[var(--b-ink)]">Admin</Link>
            <span className="text-[rgba(43,27,18,0.3)]">›</span>
            <span className="text-[rgba(43,27,18,0.55)]">Inbox</span>
            <span className="text-[rgba(43,27,18,0.3)]">›</span>
            <span className="text-[rgba(43,27,18,0.75)]">Contact Messages</span>
          </nav>
          <h1
            className="mt-1 text-4xl font-medium italic text-[var(--b-ink)] sm:text-[42px]"
            style={{ fontFamily: "var(--f-serif)" }}
          >
            Contact Messages
          </h1>
        </div>
      </div>

      {err ? <div className="mt-4 rounded-lg border border-[rgba(43,27,18,0.4)] bg-[var(--b-tint)] px-4 py-2 text-sm text-[#7a2418]">{err}</div> : null}

      {/* Filter tabs */}
      <div className="mt-6 flex flex-wrap gap-1 rounded-full border border-[rgba(43,27,18,0.15)] bg-white p-1">
        {(["all", "new", "read", "replied"] as Filter[]).map((f) => {
          const on = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                "rounded-full px-4 py-1.5 text-[12.5px] font-medium capitalize transition-colors " +
                (on ? "bg-[var(--b-primary)] text-white shadow-[0_6px_14px_rgba(43,27,18,0.25)]" : "text-[rgba(43,27,18,0.7)] hover:bg-[var(--b-tint)]")
              }
            >
              {f} <span className="ml-1 opacity-60">{counts[f]}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(280px,360px)_1fr]">
        {/* List */}
        <div className="overflow-hidden rounded-2xl border border-[rgba(43,27,18,0.15)] bg-white shadow-[0_10px_30px_rgba(43,27,18,0.05)]">
          {visible.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-[rgba(43,27,18,0.5)]">
              {items.length === 0
                ? "No messages yet."
                : `No ${filter === "all" ? "" : filter + " "}messages.`}
            </p>
          ) : (
            <ul className="divide-y divide-[rgba(43,27,18,0.06)]">
              {visible.map((m) => {
                const on = m.id === selectedId;
                return (
                  <li key={m.id}>
                    <button
                      onClick={() => setSelectedId(m.id)}
                      className={
                        "flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors " +
                        (on ? "bg-[var(--b-tint)]/50" : "hover:bg-[var(--b-tint)]/60")
                      }
                    >
                      <span className="flex w-full items-center justify-between gap-2">
                        <span className="flex items-center gap-2 truncate">
                          {m.status === "new" ? (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--b-gold)]" aria-label="Unread" />
                          ) : null}
                          <span className="truncate text-[13.5px] font-medium text-[var(--b-ink)]">{m.name}</span>
                        </span>
                        <span className="shrink-0 text-[11px] text-[rgba(43,27,18,0.5)]">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </span>
                      </span>
                      {m.subject ? (
                        <span className="line-clamp-1 text-[12.5px] text-[rgba(43,27,18,0.65)]">{m.subject}</span>
                      ) : null}
                      <span className="line-clamp-2 text-[12px] text-[rgba(43,27,18,0.5)]">{m.message}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Detail */}
        <div className="min-h-[300px] rounded-2xl border border-[rgba(43,27,18,0.15)] bg-white shadow-[0_10px_30px_rgba(43,27,18,0.05)]">
          {selected ? (
            <MessageDetail
              // a fresh message gets a fresh draft
              key={selected.id}
              m={selected}
              onReplied={(u) => patchLocal(u.id, { status: u.status, repliedAt: u.repliedAt, readAt: u.readAt, replyText: u.replyText })}
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
            <div className="flex h-full items-center justify-center px-6 py-12 text-center text-[13.5px] text-[rgba(43,27,18,0.5)]">
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
  const firstName = m.name.split(" ")[0];
  const [subject, setSubject] = useState(m.subject ? `Re: ${m.subject}` : "Re: your message");
  const [reply, setReply] = useState(`Hi ${firstName},\n\nThanks for reaching out.\n\n`);
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);
  const replyBox = useRef<HTMLTextAreaElement | null>(null);

  const quoted = `\n\n— \nQuoting your message:\n> ${m.message.replace(/\n/g, "\n> ")}`;
  const mailto = () =>
    `mailto:${m.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(reply + quoted)}`;
  // for when no mail app is set up on this computer: Gmail in the browser
  const gmail = () =>
    `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(m.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(reply + quoted)}`;

  const send = async () => {
    if (!reply.trim()) {
      setSendErr("Please write a reply first.");
      return;
    }
    setSending(true);
    setSendErr(null);
    try {
      const u = await api.adminReplyContact(m.id, { subject: subject.trim(), message: reply.trim() });
      onReplied(u);
      setJustSent(true);
      // what was sent shows above; the box is ready for a fresh one
      setReply(`Hi ${firstName},\n\n`);
    } catch (e) {
      setSendErr((e as Error).message);
    } finally {
      setSending(false);
    }
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
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgba(43,27,18,0.08)] px-6 py-5">
        <div className="min-w-0">
          <h2
            className="text-2xl font-medium italic text-[var(--b-ink)]"
            style={{ fontFamily: "var(--f-serif)" }}
          >
            {m.name}
          </h2>
          <p className="mt-0.5 text-[13px] text-[rgba(43,27,18,0.7)]">
            <a href={`mailto:${m.email}`} className="hover:text-[var(--b-ink)] hover:underline">{m.email}</a>
            {m.phone ? ` · ${m.phone}` : ""}
          </p>
          {m.subject ? (
            <p className="mt-1 text-[13px] font-medium text-[var(--b-ink)]">{m.subject}</p>
          ) : null}
          <p className="mt-2 text-[11.5px] text-[rgba(43,27,18,0.5)]">
            {created.toLocaleString()} · via {m.source}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={m.status} />
          <button
            onClick={() => replyBox.current?.focus()}
            className="rounded-full bg-[var(--b-primary)] px-4 py-2 text-[12.5px] font-medium text-white shadow-[0_8px_20px_rgba(43,27,18,0.25)] transition-colors hover:bg-[var(--b-primary-deep)]"
          >
            Reply
          </button>
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
            className="rounded-full border border-[rgba(217,47,47,0.4)] px-3 py-1.5 text-[12px] font-medium text-[#b3423a] hover:bg-[#f9e8e6]"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="whitespace-pre-wrap px-6 py-6 text-[14px] leading-[1.65] text-[rgba(43,27,18,0.85)]">
        {m.message}
      </div>

      {m.replyText ? (
        <div className="mx-6 mb-5 rounded-xl border border-[rgba(92,138,94,0.3)] bg-[#f3faf3] px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#2f6b50]">
            {justSent ? "Reply sent ✓" : "Your reply"}
            {m.repliedAt ? ` · ${new Date(m.repliedAt).toLocaleString()}` : ""}
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] leading-[1.6] text-[rgba(43,27,18,0.85)]">{m.replyText}</p>
        </div>
      ) : null}

      {/* reply right here: it goes out through the site's own email, so no
          mail app is needed on this computer */}
      <div className="mt-auto border-t border-[rgba(43,27,18,0.08)] px-6 py-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[rgba(43,27,18,0.55)]">
          {m.replyText ? "Send another reply" : "Reply"} to {m.email}
        </p>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="mt-2 w-full rounded-lg border border-[rgba(43,27,18,0.15)] px-3 py-2 text-[13.5px] text-[var(--b-ink)] outline-none focus:border-[rgba(43,27,18,0.4)]"
        />
        <textarea
          ref={replyBox}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={6}
          className="mt-2 w-full resize-y rounded-lg border border-[rgba(43,27,18,0.15)] px-3 py-2 text-[13.5px] leading-[1.6] text-[var(--b-ink)] outline-none focus:border-[rgba(43,27,18,0.4)]"
        />
        <p className="mt-1 text-[11.5px] text-[rgba(43,27,18,0.5)]">Their message is quoted under your reply.</p>
        {sendErr ? <p className="mt-2 text-[12.5px] text-[#b3423a]">{sendErr}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={send}
            disabled={sending}
            className="rounded-full bg-[var(--b-primary)] px-5 py-2 text-[13px] font-medium text-white shadow-[0_8px_20px_rgba(43,27,18,0.25)] transition-colors hover:bg-[var(--b-primary-deep)] disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send reply"}
          </button>
          <span className="text-[12px] text-[rgba(43,27,18,0.55)]">
            or open in{" "}
            <a href={gmail()} target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--b-ink)]">Gmail</a>
            {" · "}
            <a href={mailto()} className="underline hover:text-[var(--b-ink)]">your mail app</a>
          </span>
        </div>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: ContactMessage["status"] }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    new: { bg: "#e8edf5", fg: "#b08d57", label: "NEW" },
    read: { bg: "var(--b-tint)", fg: "#8a5f6c", label: "READ" },
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
