"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Nav config                                                         */
/* ------------------------------------------------------------------ */

type NavItem = {
  href: string;
  label: string;
  icon: (className?: string) => ReactNode;
  crumb?: string; // shown in top-bar breadcrumb; defaults to `label`
};

type NavGroup = { title?: string; items: NavItem[] };

const stroke = "currentColor";

const icon = {
  home: (c = "h-4 w-4") => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" />
    </svg>
  ),
  chart: (c = "h-4 w-4") => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  ),
  file: (c = "h-4 w-4") => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 13h8M8 17h5" />
    </svg>
  ),
  grid: (c = "h-4 w-4") => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  music: (c = "h-4 w-4") => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
    </svg>
  ),
  sparkle: (c = "h-4 w-4") => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" /><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z" />
    </svg>
  ),
  plug: (c = "h-4 w-4") => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0z" /><path d="M12 14v8" />
    </svg>
  ),
  gear: (c = "h-4 w-4") => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9c.5.3.9.7 1.1 1.2.1.3.2.6.2.8H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  ),
  mail: (c = "h-4 w-4") => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" />
    </svg>
  ),
  heart: (c = "h-4 w-4") => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 8.6a5.5 5.5 0 0 0-9.3-3 5.5 5.5 0 0 0-9.3 3c0 6 9.3 12 9.3 12s9.3-6 9.3-12z" />
    </svg>
  ),
  building: (c = "h-4 w-4") => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3" />
    </svg>
  ),
  search: (c = "h-4 w-4") => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
    </svg>
  ),
  users: (c = "h-4 w-4") => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
    </svg>
  ),
  chevron: (c = "h-3 w-3") => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  back: (c = "h-4 w-4") => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  ),
} as const;

const NAV: NavGroup[] = [
  {
    items: [
      { href: "/admin", label: "Dashboard", icon: (c) => icon.home(c) },
      { href: "/admin/pages", label: "Pages", icon: (c) => icon.file(c) },
    ],
  },
  {
    title: "Inbox",
    items: [
      { href: "/admin/contact-messages", label: "Contact Messages", icon: (c) => icon.mail(c), crumb: "Contact Messages" },
    ],
  },
  {
    title: "Couples",
    items: [
      { href: "/admin/invitations", label: "Invitations", icon: (c) => icon.heart(c) },
      { href: "/admin/users", label: "Users", icon: (c) => icon.users(c) },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/content", label: "Blog posts", icon: (c) => icon.file(c), crumb: "Blog posts" },
      { href: "/admin/designs", label: "Designs", icon: (c) => icon.grid(c) },
      { href: "/admin/music", label: "Music", icon: (c) => icon.music(c) },
    ],
  },
  {
    title: "Growth",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: (c) => icon.chart(c) },
      { href: "/admin/seo", label: "AI SEO", icon: (c) => icon.sparkle(c), crumb: "AI SEO" },
    ],
  },
  {
    title: "Settings",
    items: [
      { href: "/admin/integrations", label: "Integrations", icon: (c) => icon.plug(c) },
      { href: "/admin/settings", label: "Email settings", icon: (c) => icon.mail(c), crumb: "Email settings" },
    ],
  },
  {
    title: "Company",
    items: [
      { href: "/admin/site-settings", label: "Site Settings", icon: (c) => icon.building(c), crumb: "Site Settings" },
    ],
  },
];

const OUTBOUND: NavItem[] = [
  { href: "/dashboard", label: "My invitations", icon: (c) => icon.heart(c) },
];

/* ------------------------------------------------------------------ */
/*  Shell                                                              */
/* ------------------------------------------------------------------ */

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/admin";
  const { user, logout } = useAuth();

  // Which item is currently active — pick the longest matching href.
  const active = useMemo(() => {
    const all = [...NAV.flatMap((g) => g.items), ...OUTBOUND];
    return all
      .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
      .sort((a, b) => b.href.length - a.href.length)[0] || NAV[0].items[0];
  }, [pathname]);

  // Collapsible groups (closed state persisted to localStorage).
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem("wi-admin-closed");
      if (raw) setClosed(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("wi-admin-closed", JSON.stringify(closed)); } catch {}
  }, [closed]);

  // Unread contact-message count — shown as a badge on the Inbox item.
  const [unreadContact, setUnreadContact] = useState(0);
  useEffect(() => {
    if (!user || user.role !== "admin") return;
    let alive = true;
    const load = () =>
      api.adminContactUnread().then((r) => alive && setUnreadContact(r.count)).catch(() => {});
    load();
    const t = setInterval(load, 60_000); // refresh once a minute
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [user, pathname]);
  const badges: Record<string, number> = {
    "/admin/contact-messages": unreadContact,
  };

  const initials = (user?.name || user?.email || "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="brand-page flex min-h-svh">
      {/* ─────────────────────── Sidebar ─────────────────────── */}
      <aside
        className="hidden w-[236px] shrink-0 flex-col lg:flex"
        style={{ background: "var(--b-ink)" }}
      >
        <div className="flex items-center gap-2 px-[22px] pb-5 pt-[22px]">
          <Link
            href="/dashboard"
            aria-label="Back to my invitations"
            className="flex h-7 w-7 items-center justify-center rounded-full text-[#8a6f52] transition-colors hover:text-[var(--b-sand)]"
          >
            {icon.back()}
          </Link>
          <Link href="/admin" className="flex items-baseline gap-1.5">
            <span
              className="text-[20px] font-bold"
              style={{ fontFamily: "var(--f-display)", color: "var(--b-tint)" }}
            >
              Web Invite
            </span>
            <span className="text-[20px] font-bold" style={{ fontFamily: "var(--f-display)", color: "var(--b-gold)" }}>
              .
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {NAV.map((group, gi) => {
            const key = group.title || `g${gi}`;
            const isClosed = !!closed[key];
            return (
              <div key={key} className={gi === 0 ? "" : "mt-5"}>
                {group.title ? (
                  <button
                    type="button"
                    onClick={() => setClosed((c) => ({ ...c, [key]: !isClosed }))}
                    className="mb-1 flex w-full items-center justify-between px-[14px] pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a6f52] transition-colors hover:text-[var(--b-gold)]"
                  >
                    <span>{group.title}</span>
                    <span className={"transition-transform " + (isClosed ? "-rotate-90" : "")}>
                      {icon.chevron()}
                    </span>
                  </button>
                ) : null}
                {!isClosed
                  ? group.items.map((item) => {
                      const on = active.href === item.href;
                      const badge = badges[item.href] || 0;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={
                            "group mt-0.5 flex items-center gap-[10px] rounded-[9px] px-[14px] py-[11px] text-[13.5px] transition " +
                            (on
                              ? "font-semibold"
                              : "font-medium text-[#d8c6ac] hover:bg-white/[0.06] hover:text-[var(--b-tint)]")
                          }
                          style={on ? { background: "var(--b-sand)", color: "var(--b-ink)" } : undefined}
                        >
                          <span
                            className={on ? "" : "text-[#8a6f52] group-hover:text-[var(--b-gold)]"}
                            style={on ? { color: "var(--b-ink)" } : undefined}
                          >
                            {item.icon("h-4 w-4")}
                          </span>
                          <span className="flex-1">{item.label}</span>
                          {badge > 0 ? (
                            <span
                              className="min-w-[20px] rounded-full px-2 py-0.5 text-center text-[11px] font-bold"
                              style={
                                on
                                  ? { background: "var(--b-ink)", color: "var(--b-sand)" }
                                  : { background: "var(--b-gold)", color: "var(--b-ink)" }
                              }
                            >
                              {badge > 99 ? "99+" : badge}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })
                  : null}
              </div>
            );
          })}

          <div className="mt-6 border-t border-[rgba(240,220,187,0.15)] pt-4">
            {OUTBOUND.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-[10px] rounded-[9px] px-[14px] py-[11px] text-[13.5px] font-medium text-[#d8c6ac] transition-colors hover:bg-white/[0.06] hover:text-[var(--b-tint)]"
              >
                <span className="text-[#8a6f52]">{item.icon("h-4 w-4")}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* Who is signed in — moved out of the top bar, per the design */}
        <div
          className="mx-3 mt-auto flex items-center gap-[10px] border-t px-[14px] pb-[18px] pt-3.5"
          style={{ borderColor: "rgba(240,220,187,0.15)" }}
        >
          <span
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[14px] font-bold"
            style={{ background: "var(--b-gold)", color: "var(--b-ink)" }}
          >
            {initials || "?"}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-semibold" style={{ color: "var(--b-tint)" }}>
              {user?.name || user?.email?.split("@")[0]}
            </span>
            <span className="text-[11px]" style={{ color: "#8a6f52" }}>
              {user?.role === "admin" ? "Super admin" : "Admin"}
            </span>
          </div>
        </div>
      </aside>

      {/* ─────────────────────── Main column ─────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header
          className="flex items-center gap-3 bg-white px-4 py-4 sm:px-8"
          style={{ borderBottom: "1px solid rgba(43,27,18,.08)" }}
        >
          {/* Breadcrumb (mobile only shows current) */}
          <nav className="flex items-center gap-1.5 text-[13px]" style={{ color: "var(--b-muted)" }}>
            <Link href="/admin" className="hidden hover:opacity-70 sm:inline">Admin</Link>
            <span className="hidden sm:inline" style={{ color: "var(--b-gold)" }}>›</span>
            <span className="font-semibold" style={{ color: "var(--b-ink)" }}>
              {active.crumb || active.label}
            </span>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <label
              className="hidden items-center gap-2 rounded-full px-4 py-[9px] md:flex"
              style={{ background: "var(--b-bg)", border: "1px solid rgba(43,27,18,.1)" }}
            >
              <span style={{ color: "#a08a75" }}>{icon.search("h-3.5 w-3.5")}</span>
              <input
                className="w-40 border-none bg-transparent text-[13px] outline-none"
                style={{ color: "var(--b-ink)" }}
                placeholder="Search anything…"
              />
            </label>

            {/* The identity chip now lives in the sidebar footer, as designed. */}
            <button
              onClick={logout}
              className="rounded-full px-[18px] py-2 text-[13px] font-semibold transition-colors hover:bg-[var(--b-tint)]"
              style={{ color: "var(--b-primary)", border: "1.5px solid rgba(122,46,42,.3)" }}
            >
              Log out
            </button>
          </div>
        </header>

        {/* Content region — each page renders whatever it needs. */}
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
