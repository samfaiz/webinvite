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
      `<a href="${url}" class="text-[#5c7bb0] underline underline-offset-2 hover:text-[#2b3a67]"${
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
    case "hero": {
      const crop = block.imageCrop || "center";
      return (
        <section className="relative overflow-hidden rounded-2xl border border-[rgba(111,138,184,0.2)] bg-[#e8edf5] px-6 py-14 text-center sm:px-12 sm:py-20">
          {block.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={block.image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-25"
              style={{ objectPosition: crop }}
            />
          ) : null}
          <div className="relative">
            {block.sub ? (
              <p
                className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#5c7bb0]"
                style={{ fontFamily: "var(--f-body)" }}
              >
                {block.sub}
              </p>
            ) : null}
            <h1
              className="mt-3 text-3xl font-medium italic text-[#2b3a67] sm:text-5xl"
              style={{ fontFamily: "var(--f-serif)" }}
            >
              {block.heading}
            </h1>
            {block.subHeading ? (
              <p
                className="mx-auto mt-4 max-w-2xl text-pretty text-[16px] font-light leading-[1.65] text-[rgba(43,58,103,0.72)] sm:text-[18px]"
                style={{ fontFamily: "var(--f-body)" }}
              >
                {block.subHeading}
              </p>
            ) : null}
            {(block.ctaLabel && block.ctaHref) || (block.secondaryCtaLabel && block.secondaryCtaHref) ? (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {block.ctaLabel && block.ctaHref ? (
                  <a
                    href={block.ctaHref}
                    className="inline-block rounded-full bg-[#2b3a67] px-7 py-3 text-sm font-medium text-white shadow-[0_10px_24px_rgba(43,58,103,0.3)] hover:bg-[#22305a]"
                    style={{ fontFamily: "var(--f-body)" }}
                  >
                    {block.ctaLabel}
                  </a>
                ) : null}
                {block.secondaryCtaLabel && block.secondaryCtaHref ? (
                  <a
                    href={block.secondaryCtaHref}
                    className="inline-block rounded-full border border-[rgba(43,58,103,0.35)] px-6 py-3 text-sm font-medium text-[#2b3a67] hover:border-[#2b3a67] hover:text-[#2b3a67]"
                    style={{ fontFamily: "var(--f-body)" }}
                  >
                    {block.secondaryCtaLabel}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      );
    }
    case "heading": {
      if (block.level === 3)
        return (
          <h3 className="text-xl font-medium italic text-[#2b3a67]" style={{ fontFamily: "var(--f-serif)" }}>
            {block.text}
          </h3>
        );
      return (
        <h2 className="text-2xl font-medium italic text-[#2b3a67] sm:text-3xl" style={{ fontFamily: "var(--f-serif)" }}>
          {block.text}
        </h2>
      );
    }
    case "paragraph":
      return (
        <p className="leading-relaxed text-[rgba(43,58,103,0.8)]" style={{ fontFamily: "var(--f-body)" }}>
          <Html text={block.text} />
        </p>
      );
    case "image":
      return block.url ? (
        <figure className="my-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.url} alt={block.alt || ""} className="w-full rounded-xl border border-[rgba(43,58,103,0.1)]" />
          {block.caption ? (
            <figcaption className="mt-2 text-center text-sm text-[rgba(43,58,103,0.5)]" style={{ fontFamily: "var(--f-body)" }}>
              {block.caption}
            </figcaption>
          ) : null}
        </figure>
      ) : null;
    case "quote":
      return (
        <blockquote
          className="border-l-4 border-[#b08d57] pl-5 text-lg italic text-[rgba(43,58,103,0.85)]"
          style={{ fontFamily: "var(--f-serif)" }}
        >
          <Html text={block.text} />
          {block.cite ? (
            <cite className="mt-2 block text-sm not-italic text-[rgba(43,58,103,0.55)]" style={{ fontFamily: "var(--f-body)" }}>
              — {block.cite}
            </cite>
          ) : null}
        </blockquote>
      );
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag
          className={`space-y-1 pl-6 text-[rgba(43,58,103,0.8)] ${block.ordered ? "list-decimal" : "list-disc"}`}
          style={{ fontFamily: "var(--f-body)" }}
        >
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
                ? "inline-block rounded-full border border-[rgba(43,58,103,0.25)] px-5 py-2.5 text-sm font-medium text-[#2b3a67] hover:border-[#2b3a67] hover:text-[#2b3a67]"
                : "inline-block rounded-full bg-[#2b3a67] px-5 py-2.5 text-sm font-medium text-white shadow-[0_8px_20px_rgba(43,58,103,0.3)] hover:bg-[#22305a]"
            }
            style={{ fontFamily: "var(--f-body)" }}
          >
            {block.label}
          </a>
        </div>
      );
    case "divider":
      return <hr className="border-[rgba(43,58,103,0.15)]" />;
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
