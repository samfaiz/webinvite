/**
 * Block model for the CMS. Marketing pages and blog posts are a list of these
 * structured blocks — no raw HTML, so there's no XSS surface. The same list is
 * edited by BlockEditor and rendered by BlockRenderer.
 */
export type Block =
  | { id: string; type: "heading"; text: string; level: 2 | 3 }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "image"; url: string; alt?: string; caption?: string }
  | { id: string; type: "quote"; text: string; cite?: string }
  | { id: string; type: "button"; label: string; href: string; variant?: "primary" | "ghost" }
  | { id: string; type: "list"; ordered?: boolean; items: string[] }
  | { id: string; type: "divider" }
  | {
      id: string;
      type: "hero";
      heading: string;
      sub?: string;
      image?: string;
      ctaLabel?: string;
      ctaHref?: string;
    };

export type BlockType = Block["type"];

export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: "Hero banner",
  heading: "Heading",
  paragraph: "Paragraph",
  image: "Image",
  quote: "Quote",
  button: "Button",
  list: "List",
  divider: "Divider",
};

/** Order shown in the "add block" menu. */
export const BLOCK_ORDER: BlockType[] = [
  "heading",
  "paragraph",
  "image",
  "quote",
  "list",
  "button",
  "hero",
  "divider",
];

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `b_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** A fresh block of the given type with sensible placeholder content. */
export function newBlock(type: BlockType): Block {
  const id = uid();
  switch (type) {
    case "heading":
      return { id, type, text: "New heading", level: 2 };
    case "paragraph":
      return { id, type, text: "Write your paragraph here. You can use **bold**, *italic* and [links](https://example.com)." };
    case "image":
      return { id, type, url: "", alt: "", caption: "" };
    case "quote":
      return { id, type, text: "A memorable quote.", cite: "" };
    case "button":
      return { id, type, label: "Learn more", href: "/", variant: "primary" };
    case "list":
      return { id, type, ordered: false, items: ["First item", "Second item"] };
    case "divider":
      return { id, type };
    case "hero":
      return { id, type, heading: "Big bold headline", sub: "A short supporting sentence.", image: "", ctaLabel: "Get started", ctaHref: "/create" };
  }
}

/** Coerce unknown JSON (from the API) into a Block[], dropping anything invalid. */
export function normalizeBlocks(input: unknown): Block[] {
  if (!Array.isArray(input)) return [];
  const valid: BlockType[] = BLOCK_ORDER;
  return input.filter(
    (b): b is Block =>
      !!b && typeof b === "object" && typeof (b as Block).id === "string" && valid.includes((b as Block).type),
  );
}
