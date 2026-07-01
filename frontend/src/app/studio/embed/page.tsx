"use client";

import { useEffect, useState } from "react";
import { getTemplateComponent } from "@/templates/components";
import { getMotif } from "@/motifs";
import { loadDraft } from "@/studio/draft";

type RenderPayload = {
  templateId: string;
  theme: any;
  motifId: string;
  content: any;
};

/** "rgb(43, 58, 103)" → "#2b3a67" (for seeding the colour picker). */
function rgbToHex(rgb: string): string {
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) return "#000000";
  return "#" + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("");
}

/**
 * Render target loaded inside the editor's <iframe>. Because it's a real iframe
 * viewport, svh + scroll-snap behave like a phone (one screen at a time). With
 * ?edit=1 it becomes WYSIWYG: every [data-edit] element is made contentEditable
 * and edits are posted to the parent ({type:"edit", path, value}). The parent
 * drives content via postMessage ({type:"render"} / {type:"scrollTo"}).
 */
export default function StudioEmbed() {
  const [payload, setPayload] = useState<RenderPayload | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const edit = new URLSearchParams(window.location.search).get("edit") === "1";
    setEditing(edit);

    try {
      const d = loadDraft();
      setPayload({ templateId: d.templateId, theme: d.theme, motifId: d.motifId, content: d.content });
    } catch {
      /* ignore */
    }

    function onMsg(e: MessageEvent) {
      const m = e.data;
      if (m?.type === "render" && m.payload) setPayload(m.payload);
      if (m?.type === "scrollTo" && m.frame) {
        document.getElementById(m.frame)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    function onInput(e: Event) {
      const el = (e.target as HTMLElement)?.closest?.("[data-edit]") as HTMLElement | null;
      if (el && el.getAttribute("contenteditable") === "true") {
        window.parent?.postMessage(
          { type: "edit", path: el.dataset.edit, value: el.innerText.replace(/\s+/g, " ").trim() },
          "*",
        );
      }
    }
    function onKeydown(e: KeyboardEvent) {
      const el = (e.target as HTMLElement)?.closest?.("[data-edit]") as HTMLElement | null;
      if (el && e.key === "Enter" && el.dataset.multiline !== "1") {
        e.preventDefault();
        el.blur();
      }
    }
    // when a text element is focused, tell the parent so it can show the format panel
    function onFocusIn(e: FocusEvent) {
      if (!edit) return;
      const el = (e.target as HTMLElement)?.closest?.("[data-edit]") as HTMLElement | null;
      if (!el) return;
      const cs = getComputedStyle(el);
      window.parent?.postMessage(
        {
          type: "select",
          path: el.dataset.edit,
          current: {
            fontSize: Math.round(parseFloat(cs.fontSize) || 16),
            color: rgbToHex(cs.color),
            bold: (parseInt(cs.fontWeight, 10) || 400) >= 600,
            italic: cs.fontStyle === "italic",
            align: (cs.textAlign === "start" ? "left" : cs.textAlign) || "left",
          },
        },
        "*",
      );
    }

    // drag-to-reposition: nudge a [data-move] block up/down within its section.
    // A small movement is treated as a click (so inner text stays editable);
    // dragging past a threshold repositions and posts the offset to the parent.
    let drag: { el: HTMLElement; key: string; startY: number; startOffset: number; moved: boolean } | null = null;
    const clampY = (n: number) => Math.max(-220, Math.min(520, n));
    function onPointerDown(e: PointerEvent) {
      if (!edit) return;
      const el = (e.target as HTMLElement)?.closest?.("[data-move]") as HTMLElement | null;
      if (!el) return;
      drag = { el, key: el.dataset.move || "", startY: e.clientY, startOffset: parseFloat(el.dataset.offset || "0") || 0, moved: false };
    }
    function onPointerMove(e: PointerEvent) {
      if (!drag) return;
      const dy = e.clientY - drag.startY;
      if (!drag.moved && Math.abs(dy) < 6) return;
      drag.moved = true;
      e.preventDefault();
      window.getSelection?.()?.removeAllRanges?.();
      const y = clampY(drag.startOffset + dy);
      drag.el.style.transform = `translateY(${y}px)`;
      drag.el.dataset.offset = String(y);
    }
    function onPointerUp() {
      if (drag && drag.moved) {
        const y = Math.round(parseFloat(drag.el.dataset.offset || "0") || 0);
        window.parent?.postMessage({ type: "move", key: drag.key, value: y }, "*");
      }
      drag = null;
    }

    window.addEventListener("message", onMsg);
    document.addEventListener("input", onInput);
    document.addEventListener("keydown", onKeydown);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);
    try {
      window.parent?.postMessage({ type: "embed-ready" }, "*");
    } catch {
      /* ignore */
    }
    return () => {
      window.removeEventListener("message", onMsg);
      document.removeEventListener("input", onInput);
      document.removeEventListener("keydown", onKeydown);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  // (re)apply editing affordances to tagged elements after each render
  useEffect(() => {
    if (!editing) return;
    document.querySelectorAll<HTMLElement>("[data-edit]").forEach((el) => {
      el.setAttribute("contenteditable", "true");
      el.spellcheck = false;
      el.classList.add("wysiwyg-editable");
    });
    document.querySelectorAll<HTMLElement>("[data-move]").forEach((el) => {
      el.style.touchAction = "none";
      el.classList.add("wysiwyg-movable");
    });
  });

  if (!payload) return null;
  const Template = getTemplateComponent(payload.templateId);
  return (
    <Template
      content={payload.content}
      theme={payload.theme}
      motif={getMotif(payload.motifId)}
      intro={false}
      snap
      editing={editing}
    />
  );
}
