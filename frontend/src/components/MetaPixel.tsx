"use client";

import { useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

/**
 * Meta (Facebook) Pixel loader. Fetches the pixel id configured in
 * Site Settings → SEO & analytics and injects the standard tracking snippet.
 * Injects nothing if none is set. The id is format-validated (numeric only)
 * before use so it can't smuggle script.
 */
export function MetaPixel() {
  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/public/config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg: { metaPixelId?: string | null } | null) => {
        const id = cfg?.metaPixelId;
        if (cancelled || !id || !/^\d{6,20}$/.test(id) || document.getElementById("meta-pixel-init")) return;
        const init = document.createElement("script");
        init.id = "meta-pixel-init";
        init.innerHTML =
          `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?` +
          `n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;` +
          `n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;` +
          `t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}` +
          `(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');` +
          `fbq('init','${id}');fbq('track','PageView');`;
        document.head.appendChild(init);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
