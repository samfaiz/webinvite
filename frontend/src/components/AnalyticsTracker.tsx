"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

// Only public marketing/content pages are tracked — never the app/admin.
const SKIP = ["/admin", "/studio", "/create", "/dashboard", "/login", "/preview"];

/** Fires a first-party pageview beacon on each public route change. */
export function AnalyticsTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    if (SKIP.some((s) => pathname === s || pathname.startsWith(`${s}/`))) return;
    try {
      fetch(`${API}/analytics/collect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname, referrer: document.referrer || undefined }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* never let tracking break the page */
    }
  }, [pathname]);
  return null;
}
