"use client";

import { useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

/**
 * Loads the GA4 tag using the Measurement ID configured in Admin → Integrations
 * (served by /public/config). Injects nothing if none is set. The id is
 * format-validated before use so it can't inject script.
 */
export function GoogleAnalytics() {
  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/public/config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg: { ga4Id?: string | null } | null) => {
        const id = cfg?.ga4Id;
        if (cancelled || !id || !/^[A-Za-z0-9-]{4,20}$/.test(id) || document.getElementById("ga4-src")) return;
        const src = document.createElement("script");
        src.id = "ga4-src";
        src.async = true;
        src.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
        document.head.appendChild(src);
        const init = document.createElement("script");
        init.id = "ga4-init";
        init.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${id}');`;
        document.head.appendChild(init);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
