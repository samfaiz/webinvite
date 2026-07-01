/**
 * The engine's three data contracts.
 *
 *   A rendered design = InvitationContent  ×  Theme  ×  MotifPack
 *
 * Every template reads the SAME InvitationContent, so a couple's data renders in
 * any design. Theme controls the look (colors/fonts/particles). MotifPack adds the
 * community/religious layer. These same objects power the gallery preview, the
 * Studio editor, and the published page — keep them serializable (plain JSON).
 */

/* ----------------------------- Content ----------------------------- */

export interface Person {
  name: string;
  father?: string;
  mother?: string;
  siblings?: string[];
}

export interface Couple {
  partner1: Person;
  partner2: Person;
  /** word shown between the two names, e.g. "weds" */
  connector?: string;
  /** short monogram, e.g. "S | L" */
  monogram?: string;
}

export interface StoryItem {
  photo: string;
  caption: string;
}

export interface EventItem {
  id: string;
  /** display name, e.g. "Wedding", "Reception", "Nikah", "Muhurtham" */
  name: string;
  date: string; // human display, e.g. "9 January 2027"
  time: string; // e.g. "3:00 PM"
  venue: string;
  address?: string;
  mapUrl?: string;
  /** optional scripture / blessing shown on the card */
  verse?: string;
  verseRef?: string;
  /** motif icon key resolved by the active MotifPack (e.g. "church", "lamp", "rings") */
  icon?: string;
}

export interface MapPoint {
  label: string;
  address?: string;
  mapUrl?: string;
}

export interface InvitationContent {
  meta: {
    slug: string;
    community: string; // motif community key, e.g. "kerala-christian"
    language?: string;
  };
  couple: Couple;
  /** the sealed-envelope intro */
  envelope: {
    tagline?: string; // e.g. "Our Forever Begins together"
    seal?: string; // monogram shown on the wax seal
    /** optional custom MP4 intro that plays instead of the default envelope */
    videoUrl?: string;
  };
  hero: {
    marriageText: string; // e.g. "We Are Getting Married"
    tagline?: string;
    closingLine?: string; // bottom line of section 1, e.g. "Thank you for being a part of our special day."
  };
  /** the scratch-to-reveal card */
  dateReveal: {
    eventDate: string; // display date revealed under the scratch layer
    location: string;
    teaser?: string; // text shown ON the unscratched card
    revealLabel?: string; // small label, e.g. "your special day"
  };
  countdown: {
    targetDate: string; // ISO datetime used for the live timer
    headline: string;
    subtext?: string;
  };
  families: {
    heading: string;
    subheading?: string;
    footer?: string;
  };
  story: {
    heading: string;
    subtext?: string;
    items: StoryItem[];
  };
  schedule: {
    heading: string;
    subtext?: string;
    events: EventItem[];
  };
  rsvp: {
    heading: string;
    prompt: string; // "Will you be attending?"
    acceptLabel: string;
    declineLabel: string;
    submitLabel: string;
    footer?: string;
  };
  map: {
    points: MapPoint[];
    directionsUrl?: string;
    directionsLabel?: string;
  };
  music: {
    trackUrl?: string;
    autoplay?: boolean;
  };
  /** auto-set in the builder to eventDate + 1 day; gates the public page */
  expiry: {
    expiresAt: string; // ISO date
  };
}

/* ------------------------------ Theme ------------------------------ */

export interface Theme {
  id: string;
  name: string;
  colors: {
    bg: string;
    surface: string;
    primary: string; // headings / strong text
    secondary: string; // script accents
    accent: string; // gold / ornaments
    text: string;
    muted: string;
    gradientFrom: string;
    gradientTo: string;
  };
  fonts: {
    display: string; // serif caps  -> CSS value, e.g. "var(--font-cinzel)"
    script: string; // flowing script
    body: string;
  };
  particles: {
    type: "petals" | "sparkles" | "none";
    color: string;
  };
  /** Optional admin-uploaded background art per section (falls back to `all`). */
  backgrounds?: {
    hero?: string;
    families?: string;
    story?: string;
    schedule?: string;
    rsvp?: string;
    all?: string;
    /** painted botanical-corner art for the envelope intro (optional; SVG default) */
    envelopeCorner?: string;
  };
}

export type FrameKey = "hero" | "families" | "story" | "schedule" | "rsvp";

/** Resolve the background image for a section (per-section, else `all`). */
export function backgroundFor(theme: Theme, key: FrameKey): string | undefined {
  return theme.backgrounds?.[key] || theme.backgrounds?.all;
}

/* ---------------------------- MotifPack ---------------------------- */

export interface MotifPack {
  id: string;
  name: string;
  community: string; // key matched by InvitationContent.meta.community
  /** small icon set keyed by EventItem.icon and section accents */
  icons: Record<string, string>; // key -> emoji or asset path (placeholder: emoji)
  decorativeBorders?: string[];
  defaultBlessing?: string;
  defaultBlessingRef?: string;
  /** override section/event labels per community (e.g. "Holy Mass", "Nikah") */
  sectionLabels?: Record<string, string>;
  suggestedThemes?: string[];
}

/* -------------------------- Template meta -------------------------- */

export interface TemplateMeta {
  id: string;
  name: string;
  description?: string;
  supportedCommunities: string[];
  defaultThemeId: string;
  defaultMotifId: string;
  preview?: string;
}

/** A gallery "design" the user picks = a saved combination. */
export interface DesignPreset {
  id: string;
  name: string;
  community: string;
  templateId: string;
  themeId: string;
  motifId: string;
  preview?: string;
}

/** Everything a template component needs to render. */
export interface RenderProps {
  content: InvitationContent;
  theme: Theme;
  motif: MotifPack;
}
