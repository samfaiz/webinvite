/**
 * Curated theme catalog — the set of options the admin can pick from in
 * Site Settings → Theme. Extending the catalog just means:
 *   1) load the font in `app/layout.tsx` with next/font (assigning a variable)
 *   2) add an entry here with the same variable name
 * Everything else — the admin picker, CSS-var injection, live re-skinning —
 * picks it up automatically.
 */

export type FontRole = "headings" | "body" | "mono";

export type FontOption = {
  /** Stable key stored in the DB (e.g. "space-grotesk"). Empty string = default. */
  key: string;
  /** Human label shown in the admin picker. */
  label: string;
  /** CSS var name from next/font (e.g. "--font-space-grotesk"). Falls back to system. */
  variable: string;
  /** Fallback stack when the font var isn't loaded. */
  fallback: string;
};

const inter: FontOption = { key: "inter", label: "Inter", variable: "--font-inter", fallback: "system-ui, sans-serif" };
const jost: FontOption = { key: "jost", label: "Jost", variable: "--font-jost", fallback: "system-ui, sans-serif" };
const spaceGrotesk: FontOption = { key: "space-grotesk", label: "Space Grotesk", variable: "--font-space-grotesk", fallback: "system-ui, sans-serif" };
const spaceMono: FontOption = { key: "space-mono", label: "Space Mono", variable: "--font-space-mono", fallback: "ui-monospace, monospace" };
const cormorant: FontOption = { key: "cormorant", label: "Cormorant Garamond", variable: "--font-cormorant", fallback: "Georgia, serif" };
const playfair: FontOption = { key: "playfair", label: "Playfair Display", variable: "--font-playfair", fallback: "Georgia, serif" };
const ebGaramond: FontOption = { key: "eb-garamond", label: "EB Garamond", variable: "--font-ebgaramond", fallback: "Georgia, serif" };
const marcellus: FontOption = { key: "marcellus", label: "Marcellus", variable: "--font-marcellus", fallback: "Georgia, serif" };

/** Which options each role offers. Order = order shown to the admin. */
export const FONT_CATALOG: Record<FontRole, FontOption[]> = {
  headings: [spaceGrotesk, cormorant, playfair, ebGaramond, marcellus, jost, inter],
  body: [inter, jost, cormorant, ebGaramond],
  mono: [spaceMono, jost],
};

/** Default key per role (used when the admin leaves the field blank). */
export const FONT_DEFAULT: Record<FontRole, FontOption> = {
  headings: spaceGrotesk,
  body: inter,
  mono: spaceMono,
};

/** Turn a stored key into a `font-family` value ready for `--f-*` vars. */
export function resolveFontFamily(role: FontRole, key: string): string {
  const list = FONT_CATALOG[role];
  const found = list.find((f) => f.key === key) || FONT_DEFAULT[role];
  return `var(${found.variable}), ${found.fallback}`;
}

/** Label lookup used by admin badges. */
export function fontLabelFor(role: FontRole, key: string): string {
  const list = FONT_CATALOG[role];
  const found = list.find((f) => f.key === key);
  if (found) return found.label;
  return FONT_DEFAULT[role].label + " (default)";
}
