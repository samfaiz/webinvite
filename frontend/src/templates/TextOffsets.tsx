"use client";

import { useEffect } from "react";
import type { MoveOffset } from "@/engine/types";
import { normalizeOffset } from "@/components/Movable";

/**
 * Applies saved free-drag offsets for individual text fields (`edit:<path>`
 * keys in content.offsets) to the rendered DOM. Block-level offsets are
 * handled by <Movable> at render time; text fields have no wrapper, so their
 * nudge is applied here to the matching [data-edit] element. Uses the CSS
 * `translate` property (not `transform`) so it composes with framer-motion
 * animations instead of fighting them.
 *
 * Rendered (as a null component) inside every template root, so it covers the
 * editor preview, the guest view, and the published /i/<slug> page alike.
 * It must stay a component rendered by the client templates — calling a
 * client-module function while building the template map breaks the Next.js
 * server build.
 */

function applyTextOffsets(offsets?: Record<string, MoveOffset>) {
  if (!offsets) return;
  for (const [key, off] of Object.entries(offsets)) {
    // `edit:<data-edit path>` = text field, `orn:<data-orn type>` = ornament
    // (divider, crest). An optional `#<n>` suffix picks the n-th document-order
    // occurrence when the same path/type renders in several places.
    const m = /^(edit|orn):(.*?)(?:#(\d+))?$/.exec(key);
    if (!m) continue;
    const attr = m[1] === "edit" ? "data-edit" : "data-orn";
    const { x, y } = normalizeOffset(off);
    const els = document.querySelectorAll<HTMLElement>(`[${attr}="${CSS.escape(m[2])}"]`);
    const el = els[m[3] ? Number(m[3]) : 0];
    if (el) el.style.translate = x || y ? `${x}px ${y}px` : "";
  }
}

export function TextOffsets({ offsets }: { offsets?: Record<string, MoveOffset> }) {
  useEffect(() => {
    applyTextOffsets(offsets);
    // sections can mount late (envelope open, carousel slides, lightboxes) —
    // re-apply whenever new nodes appear
    const mo = new MutationObserver(() => applyTextOffsets(offsets));
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [offsets]);
  return null;
}
