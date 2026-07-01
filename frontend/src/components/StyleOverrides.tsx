import type { InvitationContent, TextStyle } from "@/engine/types";

/** Build a CSS rule for one element's style override, targeted by its data-edit path. */
function ruleFor(path: string, s: TextStyle): string {
  const d: string[] = [];
  if (s.fontFamily) d.push(`font-family:${s.fontFamily} !important`);
  if (s.fontSize) d.push(`font-size:${s.fontSize}px !important`);
  if (s.color) d.push(`color:${s.color} !important`);
  if (s.bold != null) d.push(`font-weight:${s.bold ? 700 : 400} !important`);
  if (s.italic != null) d.push(`font-style:${s.italic ? "italic" : "normal"} !important`);
  if (s.align) d.push(`text-align:${s.align} !important`);
  if (!d.length) return "";
  const sel = `[data-edit="${path.replace(/["\\]/g, "")}"]`;
  return `${sel}{${d.join(";")}}`;
}

/**
 * Emits a <style> with per-element formatting overrides (font, size, colour,
 * bold/italic, alignment) keyed by each element's data-edit path. Rendered inside
 * the template so it applies both in the editor and on the published page.
 */
export function StyleOverrides({ content }: { content: InvitationContent }) {
  const styles = content.styles;
  if (!styles) return null;
  const css = Object.entries(styles)
    .map(([p, s]) => ruleFor(p, s))
    .filter(Boolean)
    .join("\n");
  if (!css) return null;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
