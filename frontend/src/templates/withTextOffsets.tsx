"use client";

import { useEffect, type ComponentType } from "react";
import type { MoveOffset } from "@/engine/types";
import { normalizeOffset } from "@/components/Movable";

/**
 * Applies saved free-drag offsets for individual text fields (`edit:<path>`
 * keys in content.offsets) to the rendered DOM. Block-level offsets are
 * handled by <Movable> at render time; text fields have no wrapper, so their
 * nudge is applied here to every matching [data-edit] element. Uses the CSS
 * `translate` property (not `transform`) so it composes with framer-motion
 * animations instead of fighting them.
 *
 * Wrapped around every template in templates/components.ts, so it covers the
 * editor preview, the guest view, and the published /i/<slug> page alike.
 */

function applyTextOffsets(offsets?: Record<string, MoveOffset>) {
  if (!offsets) return;
  for (const [key, off] of Object.entries(offsets)) {
    if (!key.startsWith("edit:")) continue;
    // key is `edit:<path>` or `edit:<path>#<n>` when the same path renders in
    // several places — <n> is the element's document-order occurrence index
    const m = /^edit:(.*?)(?:#(\d+))?$/.exec(key);
    if (!m) continue;
    const { x, y } = normalizeOffset(off);
    const els = document.querySelectorAll<HTMLElement>(`[data-edit="${CSS.escape(m[1])}"]`);
    const el = els[m[2] ? Number(m[2]) : 0];
    if (el) el.style.translate = x || y ? `${x}px ${y}px` : "";
  }
}

export function withTextOffsets<P extends { content: { offsets?: Record<string, MoveOffset> } }>(
  Template: ComponentType<P>,
): ComponentType<P> {
  function WithTextOffsets(props: P) {
    const offsets = props.content?.offsets;
    useEffect(() => {
      applyTextOffsets(offsets);
      // sections can mount late (envelope open, carousel slides, lightboxes) —
      // re-apply whenever new nodes appear
      const mo = new MutationObserver(() => applyTextOffsets(offsets));
      mo.observe(document.body, { childList: true, subtree: true });
      return () => mo.disconnect();
    }, [offsets]);
    return <Template {...props} />;
  }
  return WithTextOffsets;
}
