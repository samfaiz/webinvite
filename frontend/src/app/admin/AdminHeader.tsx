"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/seo", label: "AI SEO" },
  { href: "/admin/designs", label: "Designs" },
  { href: "/admin/music", label: "Music" },
  { href: "/admin/integrations", label: "Integrations" },
  { href: "/admin/settings", label: "Email settings" },
  { href: "/dashboard", label: "My invitations" },
];

/** Shared admin top bar. `active` is the href of the current section. */
export function AdminHeader({ active }: { active?: string }) {
  const { logout } = useAuth();
  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-6 py-3">
      <div className="flex flex-wrap items-center gap-4">
        <span className="font-display text-lg uppercase tracking-[0.12em] text-[#2b3a67]">Web Invite · Admin</span>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`text-sm hover:text-slate-800 ${active === l.href ? "font-medium text-[#2b3a67]" : "text-slate-500"}`}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <button onClick={logout} className="text-sm text-rose-600 hover:underline">
        Log out
      </button>
    </header>
  );
}
