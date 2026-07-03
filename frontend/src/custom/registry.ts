import type { CustomSection, SectionType } from "@/engine/types";

/* Describes every composable section type: its layout variants and its editable
 * content. Drives the "add section" palette, the per-section variant picker, and
 * the generic content editor. Adding a new layout = add a variant here + a case
 * in the section component. */

export type FieldType = "text" | "textarea" | "date" | "image";

export type SectionField = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
};

export type ListConfig = {
  key: string; // content key holding the array
  label: string; // "Photos", "Events"
  itemLabel: string; // "Photo", "Event"
  imageOnly?: boolean; // gallery: array is string[] of image URLs
  fields?: SectionField[]; // per-item fields (story/schedule)
  defaultItem?: Record<string, unknown>;
  max?: number;
};

export type VariantDef = { key: string; label: string; hint?: string };

export type SectionDef = {
  type: SectionType;
  label: string;
  icon: string; // emoji for the palette
  description: string;
  variants: VariantDef[];
  fields: SectionField[]; // scalar content fields
  list?: ListConfig; // optional repeatable list
  defaultContent: Record<string, unknown>;
};

export const SECTIONS: SectionDef[] = [
  {
    type: "cover",
    label: "Cover",
    icon: "💌",
    description: "Opening hero with the couple's names & date",
    variants: [
      { key: "centered", label: "Centered", hint: "Names centered over the background" },
      { key: "split", label: "Split", hint: "Text on one side" },
      { key: "framed", label: "Framed", hint: "Ornamental border frame" },
      { key: "minimal", label: "Minimal", hint: "Clean, lots of whitespace" },
    ],
    fields: [
      { key: "eyebrow", label: "Small top line", type: "text", placeholder: "The wedding of" },
      { key: "title", label: "Names", type: "text", placeholder: "Suraj & Libina" },
      { key: "tagline", label: "Tagline", type: "text", placeholder: "We are getting married" },
      { key: "date", label: "Date line", type: "text", placeholder: "9 January 2027" },
      { key: "location", label: "Location", type: "text", placeholder: "Kottayam, Kerala" },
    ],
    defaultContent: {
      eyebrow: "The wedding of",
      title: "Your Names",
      tagline: "We are getting married",
      date: "1 January 2027",
      location: "Your City",
    },
  },
  {
    type: "names",
    label: "Names",
    icon: "🤍",
    description: "The couple's names, elegantly set",
    variants: [
      { key: "stacked", label: "Stacked" },
      { key: "inline", label: "Inline" },
      { key: "monogram", label: "With monogram" },
    ],
    fields: [
      { key: "name1", label: "Name 1", type: "text", placeholder: "Suraj" },
      { key: "connector", label: "Connector", type: "text", placeholder: "weds" },
      { key: "name2", label: "Name 2", type: "text", placeholder: "Libina" },
      { key: "sub", label: "Sub-line", type: "text", placeholder: "together forever" },
    ],
    defaultContent: { name1: "Name One", connector: "weds", name2: "Name Two", sub: "" },
  },
  {
    type: "families",
    label: "Families",
    icon: "👪",
    description: "Introduce both families",
    variants: [
      { key: "stacked", label: "Stacked", hint: "One above the other" },
      { key: "columns", label: "Two columns", hint: "Side by side" },
    ],
    fields: [
      { key: "eyebrow", label: "Small top line", type: "text", placeholder: "Two families, one promise" },
      { key: "heading", label: "Heading", type: "text", placeholder: "Introducing the Families" },
      { key: "name1", label: "Name 1", type: "text", placeholder: "Sahil" },
      { key: "relation1", label: "Relation 1", type: "text", placeholder: "Son of" },
      { key: "parents1", label: "Parents 1", type: "text", placeholder: "Mr. Anis Sajan & Mrs. Ruby Sajan" },
      { key: "monogram", label: "Monogram initials", type: "text", placeholder: "S H" },
      { key: "name2", label: "Name 2", type: "text", placeholder: "Hana" },
      { key: "relation2", label: "Relation 2", type: "text", placeholder: "Daughter of" },
      { key: "parents2", label: "Parents 2", type: "text", placeholder: "Mr. Zakir Khan & Mrs. Sabina Khan" },
      { key: "closingLine", label: "Closing line", type: "text", placeholder: "Raised with love, united by destiny" },
    ],
    defaultContent: {
      eyebrow: "Two families, one promise",
      heading: "Introducing the Families",
      name1: "Name One",
      relation1: "Son of",
      parents1: "Mr. & Mrs. Family One",
      monogram: "A B",
      name2: "Name Two",
      relation2: "Daughter of",
      parents2: "Mr. & Mrs. Family Two",
      closingLine: "Raised with love, united by destiny — together forever",
    },
  },
  {
    type: "quote",
    label: "Quote / Verse",
    icon: "❝",
    description: "A blessing, verse or favourite line",
    variants: [
      { key: "centered", label: "Centered" },
      { key: "framed", label: "Framed" },
      { key: "side", label: "Accent bar" },
    ],
    fields: [
      { key: "text", label: "Quote", type: "textarea", placeholder: "Two souls, one heart." },
      { key: "cite", label: "Attribution", type: "text", placeholder: "— Ruth 1:16" },
    ],
    defaultContent: { text: "Two souls with but a single thought, two hearts that beat as one.", cite: "" },
  },
  {
    type: "countdown",
    label: "Countdown",
    icon: "⏳",
    description: "Live timer to the big day",
    variants: [
      { key: "boxes", label: "Boxes" },
      { key: "inline", label: "Inline" },
    ],
    fields: [
      { key: "headline", label: "Headline", type: "text", placeholder: "The countdown begins" },
      { key: "targetDate", label: "Target date/time (ISO)", type: "text", placeholder: "2027-01-09T15:00" },
      { key: "subtext", label: "Sub-text", type: "text", placeholder: "until our forever begins" },
    ],
    defaultContent: { headline: "The countdown begins", targetDate: "2027-01-01T16:00", subtext: "until our forever begins" },
  },
  {
    type: "story",
    label: "Our Story",
    icon: "📖",
    description: "Photos with captions",
    variants: [
      { key: "carousel", label: "Carousel" },
      { key: "grid", label: "Grid" },
      { key: "timeline", label: "Timeline" },
    ],
    fields: [
      { key: "heading", label: "Heading", type: "text", placeholder: "Our Story" },
      { key: "subtext", label: "Sub-text", type: "text", placeholder: "How we met" },
    ],
    list: {
      key: "items",
      label: "Photos",
      itemLabel: "Moment",
      fields: [
        { key: "photo", label: "Photo", type: "image" },
        { key: "caption", label: "Caption", type: "text", placeholder: "The day we met" },
      ],
      defaultItem: { photo: "", caption: "A moment" },
      max: 12,
    },
    defaultContent: { heading: "Our Story", subtext: "", items: [{ photo: "", caption: "The day we met" }] },
  },
  {
    type: "gallery",
    label: "Gallery",
    icon: "🖼️",
    description: "A grid or strip of photos",
    variants: [
      { key: "grid", label: "Grid" },
      { key: "masonry", label: "Masonry" },
      { key: "strip", label: "Strip" },
    ],
    fields: [{ key: "heading", label: "Heading", type: "text", placeholder: "Moments" }],
    list: { key: "images", label: "Images", itemLabel: "Image", imageOnly: true, max: 18 },
    defaultContent: { heading: "Moments", images: [] },
  },
  {
    type: "schedule",
    label: "Schedule",
    icon: "🗓️",
    description: "Events with time & venue",
    variants: [
      { key: "cards", label: "Cards" },
      { key: "timeline", label: "Timeline" },
      { key: "list", label: "List" },
    ],
    fields: [
      { key: "heading", label: "Heading", type: "text", placeholder: "Schedule of Events" },
      { key: "subtext", label: "Sub-text", type: "text", placeholder: "Join us to celebrate" },
    ],
    list: {
      key: "events",
      label: "Events",
      itemLabel: "Event",
      fields: [
        { key: "name", label: "Name", type: "text", placeholder: "Wedding Ceremony" },
        { key: "date", label: "Date", type: "text", placeholder: "9 January 2027" },
        { key: "time", label: "Time", type: "text", placeholder: "3:00 PM" },
        { key: "venue", label: "Venue", type: "text", placeholder: "St. Mary's Church" },
        { key: "address", label: "Address", type: "text", placeholder: "Kottayam, Kerala" },
      ],
      defaultItem: { name: "Wedding", date: "9 January 2027", time: "3:00 PM", venue: "Venue", address: "" },
      max: 8,
    },
    defaultContent: {
      heading: "Schedule of Events",
      subtext: "",
      events: [{ name: "Wedding Ceremony", date: "9 January 2027", time: "3:00 PM", venue: "St. Mary's Church", address: "Kottayam" }],
    },
  },
  {
    type: "rsvp",
    label: "RSVP",
    icon: "✉️",
    description: "Let guests respond",
    variants: [
      { key: "standard", label: "Standard" },
    ],
    fields: [
      { key: "heading", label: "Heading", type: "text", placeholder: "RSVP" },
      { key: "prompt", label: "Prompt", type: "text", placeholder: "Will you be attending?" },
      { key: "acceptLabel", label: "Accept label", type: "text", placeholder: "Joyfully accept" },
      { key: "declineLabel", label: "Decline label", type: "text", placeholder: "Regretfully decline" },
      { key: "submitLabel", label: "Submit label", type: "text", placeholder: "Send RSVP" },
      { key: "footer", label: "Footer note", type: "text", placeholder: "Kindly respond by 1 Dec" },
    ],
    defaultContent: {
      heading: "RSVP",
      prompt: "Will you be attending?",
      acceptLabel: "Joyfully accept",
      declineLabel: "Regretfully decline",
      submitLabel: "Send RSVP",
      footer: "",
    },
  },
  {
    type: "text",
    label: "Text block",
    icon: "🅣",
    description: "A heading and paragraph",
    variants: [
      { key: "centered", label: "Centered" },
      { key: "left", label: "Left" },
      { key: "banner", label: "Banner" },
    ],
    fields: [
      { key: "heading", label: "Heading", type: "text", placeholder: "With love & blessings" },
      { key: "body", label: "Body", type: "textarea", placeholder: "Write anything here…" },
    ],
    defaultContent: { heading: "A note", body: "Write your message here." },
  },
];

export const SECTION_MAP: Record<SectionType, SectionDef> = Object.fromEntries(
  SECTIONS.map((s) => [s.type, s]),
) as Record<SectionType, SectionDef>;

export function getSectionDef(type: SectionType): SectionDef {
  return SECTION_MAP[type] ?? SECTIONS[0];
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `s_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** A fresh section instance with the first variant and default content. */
export function newSection(type: SectionType): CustomSection {
  const def = getSectionDef(type);
  return {
    id: uid(),
    type,
    variant: def.variants[0]?.key ?? "default",
    // rsvp & families read best inside a card by default; any section can opt in.
    style: type === "rsvp" || type === "families" ? { card: true } : undefined,
    content: structuredClone(def.defaultContent),
  };
}

/** A sensible starter layout for a brand-new "from scratch" invitation. */
export function starterSections(): CustomSection[] {
  return [newSection("cover"), newSection("story"), newSection("schedule"), newSection("rsvp")];
}
