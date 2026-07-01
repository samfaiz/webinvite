import type { Block } from "./blocks";

/* ---- safe inline formatting: escape everything, then allow a tiny markdown
   subset (**bold**, *italic*, [text](url)). URLs are restricted to http(s)/
   mailto/relative so no javascript: URIs can slip through. ---- */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMd(raw: string): string {
  let s = escapeHtml(raw);
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+|\/[^\s)]*)\)/g,
    (_m, text: string, url: string) =>
      `<a href="${url}" class="text-[#2b3a67] underline underline-offset-2 hover:opacity-70"${
        url.startsWith("http") ? ' target="_blank" rel="noopener noreferrer"' : ""
      }>${text}</a>`,
  );
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/\n/g, "<br/>");
  return s;
}

const Html = ({ text, className }: { text: string; className?: string }) => (
  <span className={className} dangerouslySetInnerHTML={{ __html: inlineMd(text) }} />
);

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "hero":
      return (
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center sm:px-12 sm:py-20">
          {block.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
          ) : null}
          <div className="relative">
            <h1 className="font-display text-3xl text-[#2b3a67] sm:text-5xl">{block.heading}</h1>
            {block.sub ? <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">{block.sub}</p> : null}
            {block.ctaLabel && block.ctaHref ? (
              <a
                href={block.ctaHref}
                className="mt-8 inline-block rounded-lg bg-[#2b3a67] px-6 py-3 text-sm font-medium text-white hover:bg-[#23315a]"
              >
                {block.ctaLabel}
              </a>
            ) : null}
          </div>
        </section>
      );
    case "heading": {
      if (block.level === 3)
        return <h3 className="font-display text-xl text-[#2b3a67]">{block.text}</h3>;
      return <h2 className="font-display text-2xl text-[#2b3a67] sm:text-3xl">{block.text}</h2>;
    }
    case "paragraph":
      return <p className="leading-relaxed text-slate-700"><Html text={block.text} /></p>;
    case "image":
      return block.url ? (
        <figure className="my-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.url} alt={block.alt || ""} className="w-full rounded-xl border border-slate-200" />
          {block.caption ? (
            <figcaption className="mt-2 text-center text-sm text-slate-400">{block.caption}</figcaption>
          ) : null}
        </figure>
      ) : null;
    case "quote":
      return (
        <blockquote className="border-l-4 border-[#b08d57] pl-5 text-lg italic text-slate-700">
          <Html text={block.text} />
          {block.cite ? <cite className="mt-2 block text-sm not-italic text-slate-400">— {block.cite}</cite> : null}
        </blockquote>
      );
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className={`space-y-1 pl-6 text-slate-700 ${block.ordered ? "list-decimal" : "list-disc"}`}>
          {block.items.map((it, i) => (
            <li key={i}><Html text={it} /></li>
          ))}
        </Tag>
      );
    }
    case "button":
      return (
        <div>
          <a
            href={block.href}
            className={
              block.variant === "ghost"
                ? "inline-block rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                : "inline-block rounded-lg bg-[#2b3a67] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#23315a]"
            }
          >
            {block.label}
          </a>
        </div>
      );
    case "divider":
      return <hr className="border-slate-200" />;
    default:
      return null;
  }
}

/** Render a CMS document body. */
export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  if (!blocks.length) return null;
  return (
    <div className="space-y-6">
      {blocks.map((b) => (
        <BlockView key={b.id} block={b} />
      ))}
    </div>
  );
}
