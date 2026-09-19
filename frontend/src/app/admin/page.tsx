"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

/** How many invitations the dashboard previews before deferring to the full list. */
const DASHBOARD_ROWS = 6;

type Dash = {
  users: number;
  invitations: number;
  published: number;
  drafts: number;
  rsvps: number;
  totalViews: number;
  staleDrafts: number;
  unreadEnquiries: number;
  deltas: { users: number; invitations: number; rsvps: number };
  rsvpSplit: { accepted: number; declined: number };
  topTemplates: { templateId: string; count: number }[];
  weeks: { label: string; views: number; rsvps: number }[];
};

const nf = new Intl.NumberFormat();

function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [dash, setDash] = useState<Dash | null>(null);
  const [invites, setInvites] = useState<Record<string, unknown>[]>([]);
  const [enquiries, setEnquiries] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) return void router.push("/login");
    if (user.role !== "admin") return void router.push("/dashboard");
    Promise.all([api.adminDashboard(), api.adminInvitations()])
      .then(([d, i]) => {
        setDash(d as Dash);
        setInvites(i as Record<string, unknown>[]);
      })
      .catch((e) => setError((e as Error).message));
    // The inbox panel is best-effort: the dashboard should still render if the
    // contact-messages endpoint is unavailable.
    api
      .adminListContactMessages()
      .then((r) => setEnquiries(r as unknown as Record<string, unknown>[]))
      .catch(() => {});
  }, [loading, user, router]);

  const maxWeek = useMemo(
    () => Math.max(1, ...(dash?.weeks ?? []).flatMap((w) => [w.views, w.rsvps])),
    [dash],
  );

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="flex h-[80vh] items-center justify-center" style={{ color: "var(--b-muted)" }}>
        Loading…
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const since = dash
    ? [
        dash.deltas.rsvps ? `${dash.deltas.rsvps} new RSVP${dash.deltas.rsvps === 1 ? "" : "s"}` : null,
        dash.unreadEnquiries ? `${dash.unreadEnquiries} unread ${dash.unreadEnquiries === 1 ? "enquiry" : "enquiries"}` : null,
      ].filter(Boolean).join(" and ")
    : "";

  return (
    <div className="flex flex-col gap-6 px-6 pb-9 pt-7 sm:px-8">
      {/* ------------------------------------------------------- Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span
            className="text-[11px] font-semibold uppercase"
            style={{ letterSpacing: "0.16em", color: "var(--b-gold)" }}
          >
            Overview · {today}
          </span>
          <h1
            className="m-0 text-[30px] font-semibold sm:text-[36px]"
            style={{ fontFamily: "var(--f-display)", color: "var(--b-ink)" }}
          >
            {greeting()}, {user.name?.split(" ")[0] || user.email.split("@")[0]}
          </h1>
          <span className="text-[14px]" style={{ color: "var(--b-muted)" }}>
            {since ? `${since} in the last seven days.` : "Nothing new in the last seven days."}
          </span>
        </div>

        <Link
          href="/create"
          className="rounded-full px-[22px] py-3 text-[13px] font-semibold"
          style={{
            background: "var(--b-primary)",
            color: "var(--b-bg)",
            boxShadow: "0 6px 16px rgba(122,46,42,.22)",
          }}
        >
          + New invitation
        </Link>
      </div>

      {error ? <p className="text-sm" style={{ color: "#b3423a" }}>{error}</p> : null}

      {/* -------------------------------------------------------- Stats */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="Users" value={dash?.users} note={delta(dash?.deltas.users)} good />
        <Stat label="Invitations" value={dash?.invitations} note={delta(dash?.deltas.invitations)} good />
        <Stat
          label="Published"
          value={dash?.published}
          note={dash && dash.invitations ? `${Math.round((dash.published / dash.invitations) * 100)}% of all` : undefined}
        />
        <Stat
          label="Drafts"
          value={dash?.drafts}
          note={dash?.staleDrafts ? `${dash.staleDrafts} stale > 30 d` : undefined}
        />
        <Stat label="RSVPs" value={dash?.rsvps} note={delta(dash?.deltas.rsvps)} highlight />
        <Stat label="Total views" value={dash?.totalViews} />
      </div>

      {/* ------------------------------------------- Chart + right rail */}
      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Panel title="Views & RSVPs" subtitle="Last 12 weeks">
          <div className="flex items-center gap-3.5 text-[12px]" style={{ color: "#5c4a3c" }}>
            <Legend colour="var(--b-gold)" label="Views" />
            <Legend colour="var(--b-primary)" label="RSVPs" />
          </div>

          {dash ? (
            <>
              <div
                className="flex h-[190px] items-end gap-3.5 px-1"
                style={{ borderBottom: "1px solid rgba(43,27,18,.1)" }}
              >
                {dash.weeks.map((w) => (
                  <div key={w.label} className="flex h-full flex-1 items-end gap-1" title={`${w.label}: ${w.views} views, ${w.rsvps} RSVPs`}>
                    <span
                      className="flex-1 rounded-t"
                      style={{ height: `${(w.views / maxWeek) * 100}%`, background: "#e8d5ae", minHeight: w.views ? 2 : 0 }}
                    />
                    <span
                      className="flex-1 rounded-t"
                      style={{ height: `${(w.rsvps / maxWeek) * 100}%`, background: "var(--b-primary)", minHeight: w.rsvps ? 2 : 0 }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3.5 px-1">
                {dash.weeks.map((w) => (
                  <span
                    key={w.label}
                    className="flex-1 text-center text-[10.5px]"
                    style={{ color: "#a08a75" }}
                  >
                    {w.label}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <Skeleton height={214} />
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="RSVP responses">
            {dash ? (
              dash.rsvps === 0 ? (
                <Empty>No RSVPs yet.</Empty>
              ) : (
                <div className="flex items-center gap-[18px]">
                  <Donut accepted={dash.rsvpSplit.accepted} declined={dash.rsvpSplit.declined} />
                  <div className="flex flex-col gap-2 text-[13px]" style={{ color: "var(--b-ink)" }}>
                    <Legend colour="var(--b-green)" label={`Attending · ${nf.format(dash.rsvpSplit.accepted)}`} />
                    <Legend colour="#b8453e" label={`Declined · ${nf.format(dash.rsvpSplit.declined)}`} />
                  </div>
                </div>
              )
            ) : (
              <Skeleton height={110} />
            )}
          </Panel>

          <Panel title="Top templates">
            {dash ? (
              dash.topTemplates.length === 0 ? (
                <Empty>No invitations yet.</Empty>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {dash.topTemplates.map((t, i) => {
                    const top = dash.topTemplates[0].count || 1;
                    return (
                      <div key={t.templateId} className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-[12.5px] font-medium" style={{ color: "var(--b-ink)" }}>
                          <span className="truncate">{t.templateId}</span>
                          <span style={{ color: "var(--b-muted)" }}>{t.count}</span>
                        </div>
                        <div className="h-[7px] rounded-full" style={{ background: "#f3e8d8" }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(4, (t.count / top) * 100)}%`,
                              background: i === 0 ? "var(--b-primary)" : "var(--b-gold)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <Skeleton height={100} />
            )}
          </Panel>
        </div>
      </div>

      {/* ------------------------------------------- Inbox + invitations */}
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.7fr]">
        <div
          className="flex flex-col overflow-hidden rounded-2xl bg-white"
          style={{ border: "1px solid rgba(43,27,18,.08)" }}
        >
          <div className="flex items-center justify-between px-[22px] pb-3 pt-5">
            <span className="text-[19px] font-semibold" style={{ fontFamily: "var(--f-display)", color: "var(--b-ink)" }}>
              Email enquiries
            </span>
            {dash?.unreadEnquiries ? (
              <span
                className="rounded-full px-2.5 py-[3px] text-[11px] font-bold"
                style={{ background: "var(--b-primary)", color: "var(--b-bg)" }}
              >
                {dash.unreadEnquiries} new
              </span>
            ) : null}
          </div>

          {enquiries.length === 0 ? (
            <div className="px-[22px] pb-6"><Empty>No enquiries yet.</Empty></div>
          ) : (
            enquiries.slice(0, 4).map((e) => {
              const name = String(e.name ?? "—");
              return (
                <div
                  key={String(e.id)}
                  className="flex gap-3 px-[22px] py-[13px]"
                  style={{ borderTop: "1px solid rgba(43,27,18,.07)" }}
                >
                  <span
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[13px] font-bold"
                    style={{ background: "#f3e8d8", color: "var(--b-primary)" }}
                  >
                    {name.trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13px] font-semibold" style={{ color: "var(--b-ink)" }}>{name}</span>
                      {e.status === "new" ? (
                        <span className="h-[7px] w-[7px] rounded-full" style={{ background: "var(--b-gold)" }} />
                      ) : null}
                    </div>
                    <span className="truncate text-[12.5px] font-semibold" style={{ color: "#5c4a3c" }}>
                      {String(e.subject ?? "(no subject)")}
                    </span>
                    <span className="truncate text-[12px] leading-[1.45]" style={{ color: "var(--b-muted)" }}>
                      {String(e.message ?? "")}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          <Link
            href="/admin/contact-messages"
            className="py-3.5 text-center text-[13px] font-semibold"
            style={{ borderTop: "1px solid rgba(43,27,18,.07)", color: "var(--b-primary)" }}
          >
            Open inbox →
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white" style={{ border: "1px solid rgba(43,27,18,.08)" }}>
          <div className="flex items-center justify-between px-6 pb-3.5 pt-5">
            <span className="text-[19px] font-semibold" style={{ fontFamily: "var(--f-display)", color: "var(--b-ink)" }}>
              Recent invitations
            </span>
            <Link href="/admin/invitations" className="text-[13px] font-semibold" style={{ color: "var(--b-primary)" }}>
              View all {invites.length} →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-[13px]">
              <thead
                className="text-[10.5px] font-semibold uppercase"
                style={{ background: "var(--b-bg)", letterSpacing: "0.1em", color: "var(--b-muted)" }}
              >
                <tr>
                  <th className="px-6 py-2.5">Owner</th>
                  <th className="px-6 py-2.5">Status</th>
                  <th className="px-6 py-2.5">Template</th>
                  <th className="px-6 py-2.5">Views</th>
                  <th className="px-6 py-2.5">RSVPs</th>
                  <th className="px-6 py-2.5">Slug</th>
                </tr>
              </thead>
              <tbody>
                {invites.slice(0, DASHBOARD_ROWS).map((i) => (
                  <tr key={String(i.id)} style={{ borderTop: "1px solid rgba(43,27,18,.07)" }}>
                    <td className="max-w-[220px] truncate px-6 py-3 font-semibold" style={{ color: "var(--b-ink)" }}>
                      {String(i.owner)}
                    </td>
                    <td className="px-6 py-3"><StatusPill status={String(i.status)} /></td>
                    <td className="max-w-[160px] truncate px-6 py-3" style={{ color: "var(--b-muted)" }}>
                      {String(i.templateId)}
                    </td>
                    <td className="px-6 py-3" style={{ color: "var(--b-ink)" }}>{nf.format(Number(i.views ?? 0))}</td>
                    <td className="px-6 py-3" style={{ color: "var(--b-ink)" }}>{String(i.rsvpCount ?? 0)}</td>
                    <td className="max-w-[160px] truncate px-6 py-3" style={{ color: "#a08a75" }}>
                      {String(i.slug ?? "—")}
                    </td>
                  </tr>
                ))}
                {invites.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center" style={{ color: "var(--b-muted)" }}>
                      No invitations yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- small pieces ---------- */

const delta = (n?: number) => (n === undefined ? undefined : n > 0 ? `▲ +${n} this week` : "No change this week");

function Stat({
  label,
  value,
  note,
  good = false,
  highlight = false,
}: {
  label: string;
  value?: number;
  note?: string;
  /** render the note in the positive colour when the number moved */
  good?: boolean;
  /** the one card called out in colour */
  highlight?: boolean;
}) {
  const up = good && !!note?.startsWith("▲");
  return (
    <div
      className="flex flex-col gap-1.5 rounded-[14px] px-5 py-[18px]"
      style={
        highlight
          ? { background: "var(--b-primary)" }
          : { background: "#fff", border: "1px solid rgba(43,27,18,.08)" }
      }
    >
      <span
        className="text-[10.5px] font-semibold uppercase"
        style={{ letterSpacing: "0.12em", color: highlight ? "var(--b-gold-soft)" : "var(--b-muted)" }}
      >
        {label}
      </span>
      <span
        className="text-[32px] font-semibold leading-none"
        style={{ fontFamily: "var(--f-display)", color: highlight ? "var(--b-surface)" : "var(--b-ink)" }}
      >
        {value === undefined ? "—" : nf.format(value)}
      </span>
      {note ? (
        <span
          className="text-[11.5px] font-semibold"
          style={{ color: highlight ? "var(--b-sand)" : up ? "var(--b-green)" : "var(--b-muted)" }}
        >
          {note}
        </span>
      ) : null}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-3.5 rounded-2xl bg-white px-6 py-[22px]"
      style={{ border: "1px solid rgba(43,27,18,.08)" }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[19px] font-semibold" style={{ fontFamily: "var(--f-display)", color: "var(--b-ink)" }}>
          {title}
        </span>
        {subtitle ? <span className="text-[12px]" style={{ color: "var(--b-muted)" }}>{subtitle}</span> : null}
      </div>
      {children}
    </div>
  );
}

const Legend = ({ colour, label }: { colour: string; label: string }) => (
  <span className="flex items-center gap-1.5 font-medium">
    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: colour }} />
    {label}
  </span>
);

/**
 * Two-slice donut. The schema stores "accept" | "decline" only, so there is no
 * "maybe" bucket — this shows the split that actually exists.
 */
function Donut({ accepted, declined }: { accepted: number; declined: number }) {
  const total = accepted + declined || 1;
  const pct = (accepted / total) * 100;
  return (
    <div
      className="flex h-[110px] w-[110px] items-center justify-center rounded-full"
      style={{ background: `conic-gradient(var(--b-green) 0 ${pct}%, #b8453e ${pct}% 100%)` }}
    >
      <div className="flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full bg-white">
        <span className="text-[20px] font-semibold" style={{ fontFamily: "var(--f-display)", color: "var(--b-ink)" }}>
          {nf.format(accepted + declined)}
        </span>
        <span className="text-[10px]" style={{ color: "var(--b-muted)" }}>total</span>
      </div>
    </div>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="py-4 text-[13px]" style={{ color: "var(--b-muted)" }}>{children}</p>
);

const Skeleton = ({ height }: { height: number }) => (
  <div className="w-full animate-pulse rounded-xl" style={{ height, background: "var(--b-tint)" }} />
);

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    published: { bg: "#e4f0e8", fg: "var(--b-green)" },
    draft: { bg: "#f3e8d8", fg: "#8a6f52" },
    expired: { bg: "#f6e3e1", fg: "#b04a36" },
  };
  const c = map[status] || { bg: "var(--b-tint)", fg: "var(--b-muted)" };
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase"
      style={{ background: c.bg, color: c.fg, letterSpacing: "0.08em" }}
    >
      {status}
    </span>
  );
}
