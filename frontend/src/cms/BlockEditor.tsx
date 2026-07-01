"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { TextInput, TextArea, Select } from "@/studio/ui";
import { BlockRenderer } from "./BlockRenderer";
import { BLOCK_LABELS, BLOCK_ORDER, newBlock, type Block, type BlockType } from "./blocks";

type Props = {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
};

/** Block-based live editor: edit the block list on the left, see it render live on the right. */
export function BlockEditor({ blocks, onChange }: Props) {
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const pending = useRef<{ id: string; field: "url" | "image" } | null>(null);

  const patch = (id: string, p: Partial<Block>) =>
    onChange(blocks.map((b) => (b.id === id ? ({ ...b, ...p } as Block) : b)));
  const remove = (id: string) => onChange(blocks.filter((b) => b.id !== id));
  const move = (id: string, dir: -1 | 1) => {
    const i = blocks.findIndex((b) => b.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= blocks.length) return;
    const copy = blocks.slice();
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  };
  const add = (type: BlockType) => {
    onChange([...blocks, newBlock(type)]);
    setAdding(false);
  };

  const pickImage = (id: string, field: "url" | "image") => {
    pending.current = { id, field };
    fileInput.current?.click();
  };
  const onFile = async (file?: File) => {
    const target = pending.current;
    pending.current = null;
    if (!file || !target) return;
    setUploading(target.id);
    try {
      const { url } = await api.uploadImage(file);
      patch(target.id, { [target.field]: url } as Partial<Block>);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* -------- controls -------- */}
      <div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {blocks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
            No blocks yet. Add your first block below.
          </p>
        ) : null}

        <div className="space-y-3">
          {blocks.map((b, i) => (
            <div key={b.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {BLOCK_LABELS[b.type]}
                </span>
                <div className="flex items-center gap-1 text-slate-400">
                  <button onClick={() => move(b.id, -1)} disabled={i === 0} title="Move up" className="px-1 disabled:opacity-30 hover:text-slate-700">↑</button>
                  <button onClick={() => move(b.id, 1)} disabled={i === blocks.length - 1} title="Move down" className="px-1 disabled:opacity-30 hover:text-slate-700">↓</button>
                  <button onClick={() => remove(b.id)} title="Delete block" className="px-1 hover:text-rose-600">✕</button>
                </div>
              </div>
              <BlockFields
                block={b}
                patch={(p) => patch(b.id, p)}
                uploading={uploading === b.id}
                pickImage={(field) => pickImage(b.id, field)}
              />
            </div>
          ))}
        </div>

        <div className="relative mt-3">
          <button
            onClick={() => setAdding((v) => !v)}
            className="w-full rounded-lg border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-50"
          >
            + Add block
          </button>
          {adding ? (
            <div className="absolute z-10 mt-1 grid w-full grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
              {BLOCK_ORDER.map((t) => (
                <button
                  key={t}
                  onClick={() => add(t)}
                  className="rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                >
                  {BLOCK_LABELS[t]}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* -------- live preview -------- */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Live preview</p>
        <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-[#faf8f3] p-5">
          {blocks.length ? (
            <BlockRenderer blocks={blocks} />
          ) : (
            <p className="text-center text-sm text-slate-400">Your page preview appears here.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- per-block fields ----------------------------- */

function Row({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 last:mb-0">{children}</div>;
}
function ImageField({
  label,
  value,
  onChange,
  uploading,
  onPick,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  uploading: boolean;
  onPick: () => void;
}) {
  return (
    <Row>
      <div className="flex items-center gap-2">
        <TextInput placeholder={`${label} URL`} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
        <button
          onClick={onPick}
          disabled={uploading}
          className="shrink-0 rounded-lg bg-[#2b3a67] px-3 py-2 text-xs font-medium text-white hover:bg-[#23315a] disabled:opacity-60"
        >
          {uploading ? "…" : "Upload"}
        </button>
      </div>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="mt-2 h-20 rounded border border-slate-200 object-contain" />
      ) : null}
    </Row>
  );
}

function BlockFields({
  block,
  patch,
  uploading,
  pickImage,
}: {
  block: Block;
  patch: (p: Partial<Block>) => void;
  uploading: boolean;
  pickImage: (field: "url" | "image") => void;
}) {
  switch (block.type) {
    case "heading":
      return (
        <>
          <Row><TextInput value={block.text} onChange={(e) => patch({ text: e.target.value })} /></Row>
          <Row>
            <Select
              value={String(block.level)}
              onChange={(v) => patch({ level: Number(v) as 2 | 3 })}
              options={[{ value: "2", label: "Large (H2)" }, { value: "3", label: "Small (H3)" }]}
            />
          </Row>
        </>
      );
    case "paragraph":
      return (
        <Row>
          <TextArea value={block.text} onChange={(e) => patch({ text: e.target.value })} rows={4} />
          <p className="mt-1 text-[10px] text-slate-400">Supports **bold**, *italic* and [links](https://…).</p>
        </Row>
      );
    case "image":
      return (
        <>
          <ImageField label="Image" value={block.url} onChange={(v) => patch({ url: v })} uploading={uploading} onPick={() => pickImage("url")} />
          <Row><TextInput placeholder="Alt text (for accessibility & SEO)" value={block.alt ?? ""} onChange={(e) => patch({ alt: e.target.value })} /></Row>
          <Row><TextInput placeholder="Caption (optional)" value={block.caption ?? ""} onChange={(e) => patch({ caption: e.target.value })} /></Row>
        </>
      );
    case "quote":
      return (
        <>
          <Row><TextArea value={block.text} onChange={(e) => patch({ text: e.target.value })} rows={3} /></Row>
          <Row><TextInput placeholder="Attribution (optional)" value={block.cite ?? ""} onChange={(e) => patch({ cite: e.target.value })} /></Row>
        </>
      );
    case "button":
      return (
        <>
          <Row><TextInput placeholder="Button label" value={block.label} onChange={(e) => patch({ label: e.target.value })} /></Row>
          <Row><TextInput placeholder="Link (/create or https://…)" value={block.href} onChange={(e) => patch({ href: e.target.value })} /></Row>
          <Row>
            <Select
              value={block.variant ?? "primary"}
              onChange={(v) => patch({ variant: v as "primary" | "ghost" })}
              options={[{ value: "primary", label: "Solid" }, { value: "ghost", label: "Outline" }]}
            />
          </Row>
        </>
      );
    case "list":
      return (
        <>
          <Row>
            <TextArea
              value={block.items.join("\n")}
              onChange={(e) => patch({ items: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
              rows={4}
            />
            <p className="mt-1 text-[10px] text-slate-400">One item per line.</p>
          </Row>
          <Row>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={!!block.ordered} onChange={(e) => patch({ ordered: e.target.checked })} />
              Numbered list
            </label>
          </Row>
        </>
      );
    case "hero":
      return (
        <>
          <Row><TextInput placeholder="Headline" value={block.heading} onChange={(e) => patch({ heading: e.target.value })} /></Row>
          <Row><TextInput placeholder="Sub-headline" value={block.sub ?? ""} onChange={(e) => patch({ sub: e.target.value })} /></Row>
          <ImageField label="Background" value={block.image} onChange={(v) => patch({ image: v })} uploading={uploading} onPick={() => pickImage("image")} />
          <div className="grid grid-cols-2 gap-2">
            <TextInput placeholder="Button label" value={block.ctaLabel ?? ""} onChange={(e) => patch({ ctaLabel: e.target.value })} />
            <TextInput placeholder="Button link" value={block.ctaHref ?? ""} onChange={(e) => patch({ ctaHref: e.target.value })} />
          </div>
        </>
      );
    case "divider":
      return <p className="text-xs text-slate-400">A horizontal rule.</p>;
    default:
      return null;
  }
}
