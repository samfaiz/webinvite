"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";
import { resolveFontFamily } from "@/lib/theme-catalog";

/**
 * Runtime site-wide theme.
 *
 * Fetches the public Site Settings on mount and pushes the theme values into
 * CSS custom properties on <html>. Anything reading `var(--c-primary)`,
 * `var(--c-primary-soft)`, `var(--f-headings)` etc. re-skins immediately.
 *
 * Empty values in Site Settings mean "keep the default" — we skip those so
 * globals.css controls the fallback.
 */
export function ThemeInjector() {
  useEffect(() => {
    let alive = true;
    api
      .publicSiteSettings()
      .then((s) => {
        if (!alive) return;
        const root = document.documentElement;

        const set = (name: string, value?: string) => {
          if (!value || !value.trim()) return;
          root.style.setProperty(name, value);
        };

        // Light-mode accents
        set("--c-primary", s.theme.accent);
        set("--c-primary-soft", s.theme.accentSoft);
        set("--c-on-primary", s.theme.textOnAccent);

        // Dark-mode overrides (activated when <html data-theme="dark">)
        set("--c-primary-dark", s.theme.accentDark);
        set("--c-primary-soft-dark", s.theme.accentSoftDark);
        set("--c-on-primary-dark", s.theme.textOnAccentDark);

        // Fonts — resolve to real font-family strings (with fallbacks) so the
        // curated keys turn into working CSS on every page.
        if (s.theme.fontHeadings) {
          root.style.setProperty("--f-headings", resolveFontFamily("headings", s.theme.fontHeadings));
        }
        if (s.theme.fontBody) {
          root.style.setProperty("--f-body", resolveFontFamily("body", s.theme.fontBody));
        }
        if (s.theme.fontMono) {
          root.style.setProperty("--f-mono", resolveFontFamily("mono", s.theme.fontMono));
        }
      })
      .catch(() => {
        // Silent: default theme in globals.css already applies.
      });
    return () => {
      alive = false;
    };
  }, []);

  return null;
}
