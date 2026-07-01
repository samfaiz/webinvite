import type { CSSProperties, ReactNode } from "react";
import type { Theme } from "@/engine/types";

/**
 * Maps a Theme object onto CSS custom properties so every block can read
 * var(--c-primary) etc. Because it's pure CSS variables, the Studio can change
 * the theme live just by passing a new object — no re-mount, instant re-skin.
 */
export function ThemeProvider({
  theme,
  children,
  className = "",
}: {
  theme: Theme;
  children: ReactNode;
  className?: string;
}) {
  const style = {
    "--c-bg": theme.colors.bg,
    "--c-surface": theme.colors.surface,
    "--c-primary": theme.colors.primary,
    "--c-secondary": theme.colors.secondary,
    "--c-accent": theme.colors.accent,
    "--c-text": theme.colors.text,
    "--c-muted": theme.colors.muted,
    "--c-grad-from": theme.colors.gradientFrom,
    "--c-grad-to": theme.colors.gradientTo,
    "--f-display": theme.fonts.display,
    "--f-script": theme.fonts.script,
    "--f-body": theme.fonts.body,
    background: theme.colors.bg,
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
  } as CSSProperties;

  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
}
