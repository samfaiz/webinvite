"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Dependency-free image editor modal: crop (free or fixed aspect), rotate,
 * flip, and colour adjustments (brightness / contrast / saturation / warmth /
 * black & white). Preview uses CSS filters; Apply re-renders the same
 * adjustments with pixel math on a canvas so the exported image matches the
 * preview in every browser. Used after logo/photo uploads in the Studio and
 * the admin Site Settings.
 */

export type ImageEditorProps = {
  /** Image to edit — a data URL (use urlToDataUrl() for remote images). */
  src: string;
  title?: string;
  /** Output format. PNG (default) keeps transparency — right for logos. */
  mime?: "image/png" | "image/jpeg";
  /** Longest edge of the exported image. */
  maxDim?: number;
  onApply: (dataUrl: string) => void;
  onClose: () => void;
};

type Crop = { x: number; y: number; w: number; h: number }; // normalized 0..1
type DragMode = "move" | "nw" | "ne" | "sw" | "se";

const FULL: Crop = { x: 0, y: 0, w: 1, h: 1 };
const MIN = 0.05; // smallest crop edge (normalized)

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Fetch any image URL and return it as a data URL (so canvas export never taints). */
export async function urlToDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load the image for editing");
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("Could not read the image"));
    r.onload = () => resolve(String(r.result));
    r.readAsDataURL(blob);
  });
}

/** Convert a data URL to a File for multipart upload. */
export async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
  return new File([blob], `${name}.${ext}`, { type: blob.type || "image/png" });
}

/* ---- pixel-math versions of the CSS filter functions (Filter Effects spec)
 * applied in the same order as the preview string, so export === preview ---- */
function applyAdjustments(
  px: Uint8ClampedArray,
  brightness: number, // 1 = unchanged
  contrast: number,
  saturate: number,
  sepia: number, // 0..1
  gray: number, // 0..1
) {
  for (let i = 0; i < px.length; i += 4) {
    let r = px[i], g = px[i + 1], b = px[i + 2];
    if (brightness !== 1) { r *= brightness; g *= brightness; b *= brightness; }
    if (contrast !== 1) {
      r = (r - 127.5) * contrast + 127.5;
      g = (g - 127.5) * contrast + 127.5;
      b = (b - 127.5) * contrast + 127.5;
    }
    if (saturate !== 1) {
      const s = saturate;
      const nr = (0.213 + 0.787 * s) * r + (0.715 - 0.715 * s) * g + (0.072 - 0.072 * s) * b;
      const ng = (0.213 - 0.213 * s) * r + (0.715 + 0.285 * s) * g + (0.072 - 0.072 * s) * b;
      const nb = (0.213 - 0.213 * s) * r + (0.715 - 0.715 * s) * g + (0.072 + 0.928 * s) * b;
      r = nr; g = ng; b = nb;
    }
    if (sepia > 0) {
      const t = sepia, k = 1 - t;
      const nr = (0.393 * t + k) * r + 0.769 * t * g + 0.189 * t * b;
      const ng = 0.349 * t * r + (0.686 * t + k) * g + 0.168 * t * b;
      const nb = 0.272 * t * r + 0.534 * t * g + (0.131 * t + k) * b;
      r = nr; g = ng; b = nb;
    }
    if (gray > 0) {
      const t = gray, k = 1 - t;
      const nr = (0.2126 * t + k) * r + 0.7152 * t * g + 0.0722 * t * b;
      const ng = 0.2126 * t * r + (0.7152 * t + k) * g + 0.0722 * t * b;
      const nb = 0.2126 * t * r + 0.7152 * t * g + (0.0722 * t + k) * b;
      r = nr; g = ng; b = nb;
    }
    px[i] = r; px[i + 1] = g; px[i + 2] = b;
  }
}

const ASPECTS: { label: string; value: number | null }[] = [
  { label: "Free", value: null },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:4", value: 3 / 4 },
  { label: "16:9", value: 16 / 9 },
];

export function ImageEditorModal({
  src,
  title = "Edit image",
  mime = "image/png",
  maxDim = 1280,
  onApply,
  onClose,
}: ImageEditorProps) {
  const imgRef = useRef<HTMLImageElement | null>(null); // original bitmap
  const baseRef = useRef<HTMLCanvasElement | null>(null); // rotated/flipped bitmap
  const boxRef = useRef<HTMLDivElement | null>(null); // preview box (crop coords)
  const dragRef = useRef<{ mode: DragMode; x: number; y: number; start: Crop } | null>(null);

  const [baseUrl, setBaseUrl] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [rot, setRot] = useState(0); // × 90° clockwise
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [crop, setCrop] = useState<Crop>(FULL);
  const [aspect, setAspect] = useState<number | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [warmth, setWarmth] = useState(0);
  const [bw, setBw] = useState(0);

  const filterCss = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) sepia(${warmth}%) grayscale(${bw}%)`;
  const dirtyFilters =
    brightness !== 100 || contrast !== 100 || saturation !== 100 || warmth !== 0 || bw !== 0;

  /* load original once */
  useEffect(() => {
    const img = new Image();
    img.onerror = () => setErr("That image could not be loaded");
    img.onload = () => { imgRef.current = img; rebuildBase(img, 0, false, false); };
    img.src = src;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  /* redraw the rotated/flipped base whenever orientation changes */
  const rebuildBase = (img: HTMLImageElement, r: number, fh: boolean, fv: boolean) => {
    const w = img.naturalWidth, h = img.naturalHeight;
    const odd = r % 2 === 1;
    const canvas = document.createElement("canvas");
    canvas.width = odd ? h : w;
    canvas.height = odd ? w : h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return setErr("Canvas is not available in this browser");
    ctx.translate(canvas.width / 2, canvas.height / 2);
    // scale before rotate so flips act on what's on screen, not the raw file
    ctx.scale(fh ? -1 : 1, fv ? -1 : 1);
    ctx.rotate((r * Math.PI) / 2);
    ctx.drawImage(img, -w / 2, -h / 2);
    baseRef.current = canvas;
    setBaseUrl(canvas.toDataURL("image/png"));
    setCrop(FULL);
    setAspect(null);
  };

  const orient = (r: number, fh: boolean, fv: boolean) => {
    if (!imgRef.current) return;
    setRot(r); setFlipH(fh); setFlipV(fv);
    rebuildBase(imgRef.current, r, fh, fv);
  };

  /* ESC to close + lock body scroll while open */
  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    // take focus so ESC works even when the trigger lived in an iframe
    // (e.g. clicking a photo inside the WYSIWYG preview)
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* centered, largest crop of the given pixel aspect */
  const applyAspect = (a: number | null) => {
    setAspect(a);
    const bc = baseRef.current;
    if (!a || !bc) { if (!a) setCrop(FULL); return; }
    let w = 1, h = (bc.width / a) / bc.height;
    if (h > 1) { w /= h; h = 1; }
    setCrop({ x: (1 - w) / 2, y: (1 - h) / 2, w, h });
  };

  /* ---- crop drag / resize (normalized coords over the preview box) ---- */
  const startDrag = (mode: DragMode) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    boxRef.current?.setPointerCapture?.(e.pointerId);
    dragRef.current = { mode, x: e.clientX, y: e.clientY, start: crop };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current, box = boxRef.current, bc = baseRef.current;
    if (!drag || !box || !bc) return;
    const rect = box.getBoundingClientRect();
    const dx = (e.clientX - drag.x) / rect.width;
    const dy = (e.clientY - drag.y) / rect.height;
    const s = drag.start;

    if (drag.mode === "move") {
      setCrop({
        ...s,
        x: clamp(s.x + dx, 0, 1 - s.w),
        y: clamp(s.y + dy, 0, 1 - s.h),
      });
      return;
    }

    // corner resize: the corner opposite to the handle stays anchored
    let x = s.x, y = s.y, w = s.w, h = s.h;
    if (drag.mode === "ne" || drag.mode === "se") w = clamp(s.w + dx, MIN, 1 - s.x);
    if (drag.mode === "nw" || drag.mode === "sw") { w = clamp(s.w - dx, MIN, s.x + s.w); x = s.x + s.w - w; }
    if (drag.mode === "sw" || drag.mode === "se") h = clamp(s.h + dy, MIN, 1 - s.y);
    if (drag.mode === "nw" || drag.mode === "ne") { h = clamp(s.h - dy, MIN, s.y + s.h); y = s.y + s.h - h; }

    if (aspect) {
      // lock the pixel aspect: derive h from w, shrinking w if h won't fit
      h = (w * bc.width) / (aspect * bc.height);
      const maxH = drag.mode === "nw" || drag.mode === "ne" ? s.y + s.h : 1 - s.y;
      if (h > maxH) { h = maxH; w = (h * aspect * bc.height) / bc.width; }
      if (drag.mode === "nw" || drag.mode === "sw") x = s.x + s.w - w;
      if (drag.mode === "nw" || drag.mode === "ne") y = s.y + s.h - h;
    }
    setCrop({ x, y, w, h });
  };

  const endDrag = () => { dragRef.current = null; };

  /* ---- export ---- */
  const apply = () => {
    const bc = baseRef.current;
    if (!bc) return;
    setBusy(true);
    try {
      const sx = Math.round(crop.x * bc.width);
      const sy = Math.round(crop.y * bc.height);
      const sw = Math.max(1, Math.round(crop.w * bc.width));
      const sh = Math.max(1, Math.round(crop.h * bc.height));
      const scale = Math.min(1, maxDim / Math.max(sw, sh));
      const out = document.createElement("canvas");
      out.width = Math.max(1, Math.round(sw * scale));
      out.height = Math.max(1, Math.round(sh * scale));
      const ctx = out.getContext("2d");
      if (!ctx) throw new Error("Canvas is not available in this browser");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bc, sx, sy, sw, sh, 0, 0, out.width, out.height);
      if (dirtyFilters) {
        const id = ctx.getImageData(0, 0, out.width, out.height);
        applyAdjustments(id.data, brightness / 100, contrast / 100, saturation / 100, warmth / 100, bw / 100);
        ctx.putImageData(id, 0, 0);
      }
      onApply(out.toDataURL(mime, 0.92));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setBrightness(100); setContrast(100); setSaturation(100); setWarmth(0); setBw(0);
    orient(0, false, false);
  };

  const handleCls =
    "absolute h-3.5 w-3.5 rounded-full border-2 border-white bg-slate-800 shadow";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-3 sm:p-6" role="dialog" aria-modal="true">
      <div ref={panelRef} tabIndex={-1} className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl outline-none">
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 sm:grid-cols-[1fr_220px]">
          {/* preview + crop */}
          <div className="flex min-h-[240px] items-center justify-center rounded-lg bg-[repeating-conic-gradient(#eef2f7_0_25%,#fff_0_50%)] bg-[length:16px_16px] p-2">
            {err ? (
              <p className="px-4 text-center text-xs text-rose-600">{err}</p>
            ) : !baseUrl ? (
              <p className="text-xs text-slate-400">Loading…</p>
            ) : (
              <div
                ref={boxRef}
                className="relative inline-block touch-none select-none overflow-hidden"
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={baseUrl} alt="Preview" draggable={false} className="block max-h-[46vh] max-w-full" style={{ filter: filterCss }} />
                {/* crop window — everything outside is dimmed by the huge shadow */}
                <div
                  className="absolute cursor-move border-2 border-white/95 shadow-[0_0_0_9999px_rgba(15,23,42,0.5)]"
                  style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.w * 100}%`, height: `${crop.h * 100}%` }}
                  onPointerDown={startDrag("move")}
                >
                  <div className={`${handleCls} -left-2 -top-2 cursor-nwse-resize`} onPointerDown={startDrag("nw")} />
                  <div className={`${handleCls} -right-2 -top-2 cursor-nesw-resize`} onPointerDown={startDrag("ne")} />
                  <div className={`${handleCls} -bottom-2 -left-2 cursor-nesw-resize`} onPointerDown={startDrag("sw")} />
                  <div className={`${handleCls} -bottom-2 -right-2 cursor-nwse-resize`} onPointerDown={startDrag("se")} />
                </div>
              </div>
            )}
          </div>

          {/* controls */}
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Crop</p>
              <div className="flex flex-wrap gap-1">
                {ASPECTS.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => applyAspect(a.value)}
                    className={`rounded-md border px-2 py-1 text-[11px] font-medium ${aspect === a.value ? "border-slate-800 bg-slate-800 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Rotate &amp; flip</p>
              <div className="flex flex-wrap gap-1">
                <IconBtn label="Rotate left" onClick={() => orient((rot + 3) % 4, flipH, flipV)}>
                  <path d="M2.5 2v6h6" /><path d="M2.5 8a9 9 0 1 0 2.1-5.4" />
                </IconBtn>
                <IconBtn label="Rotate right" onClick={() => orient((rot + 1) % 4, flipH, flipV)}>
                  <path d="M21.5 2v6h-6" /><path d="M21.5 8a9 9 0 1 1-2.1-5.4" />
                </IconBtn>
                <IconBtn label="Flip horizontal" onClick={() => orient(rot, !flipH, flipV)}>
                  <path d="M12 3v18" /><path d="M8 7l-5 5 5 5V7z" /><path d="M16 7l5 5-5 5V7z" />
                </IconBtn>
                <IconBtn label="Flip vertical" onClick={() => orient(rot, flipH, !flipV)}>
                  <path d="M3 12h18" /><path d="M7 8l5-5 5 5H7z" /><path d="M7 16l5 5 5-5H7z" />
                </IconBtn>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Adjust</p>
              <Slider label="Brightness" value={brightness} onChange={setBrightness} min={40} max={180} />
              <Slider label="Contrast" value={contrast} onChange={setContrast} min={40} max={180} />
              <Slider label="Saturation" value={saturation} onChange={setSaturation} min={0} max={200} />
              <Slider label="Warmth" value={warmth} onChange={setWarmth} min={0} max={80} />
              <Slider label="Black & white" value={bw} onChange={setBw} min={0} max={100} />
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <button type="button" onClick={reset} className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700">
            Reset all
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={busy || !baseUrl || !!err}
              className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {busy ? "Applying…" : "Apply"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="mb-2 block">
      <span className="mb-0.5 flex items-center justify-between text-[11px] text-slate-500">
        <span>{label}</span>
        <span className="tabular-nums text-slate-400">{value}%</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-slate-800"
      />
    </label>
  );
}
