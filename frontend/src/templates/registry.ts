import type { TemplateMeta, DesignPreset } from "@/engine/types";
import { themeList } from "@/themes";

/**
 * Template METADATA only — pure data, no React component imports. Safe to import
 * from light pages (e.g. the gallery) without pulling in framer-motion / template
 * code. The actual component map lives in ./components.ts.
 */

export const ALL_COMMUNITIES = ["kerala-christian", "hindu", "muslim", "secular"];

export const templates: TemplateMeta[] = [
  {
    id: "flagship-lakecomo",
    name: "Lake Como Romance",
    description:
      "Sealed-envelope intro, scratch-to-reveal date, Polaroid story carousel, watercolor backdrops.",
    supportedCommunities: ALL_COMMUNITIES,
    defaultThemeId: "dusty-blue",
    defaultMotifId: "kerala-christian",
    preview: "/assets/previews/flagship.jpg",
  },
  {
    id: "royal-ornate",
    name: "Royal Ornate",
    description:
      "Framed ornate hero with shimmer date, photo-grid story + lightbox, vertical timeline. Traditional & regal.",
    supportedCommunities: ALL_COMMUNITIES,
    defaultThemeId: "maroon-gold",
    defaultMotifId: "hindu",
    preview: "/assets/previews/royal.jpg",
  },
  {
    id: "minimal-modern",
    name: "Minimal Modern",
    description:
      "Clean sans-serif type, generous whitespace, quiet animations. Contemporary & understated.",
    supportedCommunities: ALL_COMMUNITIES,
    defaultThemeId: "royal-blue",
    defaultMotifId: "secular",
    preview: "/assets/previews/minimal.jpg",
  },
  {
    id: "voyage-kerala",
    name: "Kerala Voyage",
    description:
      "A destination boarding pass: navy plates, cream ticket stock and a gold flight path threading the scroll past a letter, the venue arch and the day's timeline.",
    supportedCommunities: ALL_COMMUNITIES,
    defaultThemeId: "navy-ivory",
    defaultMotifId: "kerala-christian",
    preview: "/assets/templates/voyage/01-ticket.jpg",
    // the plates are printed navy-on-cream — a blush or emerald palette would
    // fight the artwork, so this design ships with the one theme
    themeIds: ["navy-ivory"],
    // still on stand-in plates — see public/assets/templates/voyage
    draft: true,
  },
  {
    id: "toile-botanical",
    name: "Toile",
    description:
      "Engraved blue botanicals on paper white: a drawn garland border, a ribboned letter, time-pill programme, a painted palette and a printed RSVP questionnaire.",
    supportedCommunities: ALL_COMMUNITIES,
    defaultThemeId: "toile-blue",
    defaultMotifId: "secular",
    preview: "/assets/previews/flagship.jpg",
    // the ornaments are drawn in the theme's own line colour, so the palette
    // has to stay in the blue family the engraving was designed around
    themeIds: ["toile-blue"],
  },
  {
    id: "garden-olive",
    name: "Secret Garden",
    description:
      "An old-master garden at dusk and engraved magnolias on olive: a lace heart in an envelope, an oval portrait, an engraved venue, an illustrated timeline and an RSVP that opens as a sheet.",
    supportedCommunities: ALL_COMMUNITIES,
    defaultThemeId: "garden-olive",
    defaultMotifId: "secular",
    preview: "/assets/templates/garden/01-cover.jpg",
    // painted and engraved plates — the colours are in the art, not the theme
    themeIds: ["garden-olive"],
  },
  {
    id: "hydrangea-blush",
    name: "Blue Hydrangea",
    description:
      "Dusty blue and blush with rows of blue flowers: a monogram and framed photo on a blush oval, the wedding week in a blue circle, a programme on lace and the reply on the page.",
    supportedCommunities: ALL_COMMUNITIES,
    defaultThemeId: "hydrangea-blue",
    defaultMotifId: "secular",
    preview: "/assets/templates/hydrangea/preview.jpg",
    themeIds: ["hydrangea-blue"],
  },
  {
    id: "emerald-rose",
    name: "Emerald Rose",
    description:
      "Near-black emerald and warm stone with white and emerald roses: their names over a bouquet (no photos of the couple), torn and brushed edges, a timing with roses down its sides, a dress code over a candlelit hall, and the reply on the page.",
    supportedCommunities: ALL_COMMUNITIES,
    defaultThemeId: "emerald-stone",
    defaultMotifId: "secular",
    preview: "/assets/templates/emerald/preview.jpg",
    themeIds: ["emerald-stone"],
  },
  {
    id: "garden-kerala",
    name: "Kerala Garden",
    description:
      "Secret Garden with a Kerala venue: the same garden, lace heart and engraved magnolias, with a Kerala engraving on the venue page — a church, a tharavad or the backwaters, chosen by the couple's community.",
    supportedCommunities: ALL_COMMUNITIES,
    defaultThemeId: "garden-olive",
    defaultMotifId: "secular",
    preview: "/assets/templates/garden/01-cover.jpg",
    themeIds: ["garden-olive"],
  },
];

export function getTemplateMeta(id: string): TemplateMeta {
  return templates.find((t) => t.id === id) ?? templates[0];
}

/**
 * Curated gallery presets = saved {template × theme × motif} combos. Every
 * supported (template, theme) pair becomes a preset per community.
 *   3 templates × 10 themes = 30 designs per community (scales as we add more).
 */
function generatePresets(): DesignPreset[] {
  const out: DesignPreset[] = [];
  for (const community of ALL_COMMUNITIES) {
    for (const tpl of templates) {
      // a draft template has no presets, which is what keeps it out of the
      // gallery, the explore feed and the landing page — the Studio lists
      // `templates` directly, so it stays available to work on
      if (tpl.draft) continue;
      if (!tpl.supportedCommunities.includes(community)) continue;
      const allowed = tpl.themeIds
        ? themeList.filter((t) => tpl.themeIds!.includes(t.id))
        : themeList;
      for (const theme of allowed) {
        out.push({
          id: `${community}__${tpl.id}__${theme.id}`,
          name: theme.name,
          community,
          templateId: tpl.id,
          themeId: theme.id,
          motifId: community,
        });
      }
    }
  }
  return out;
}

export const presets: DesignPreset[] = generatePresets();

export function getPreset(id: string): DesignPreset | undefined {
  return presets.find((p) => p.id === id);
}

export function presetCount(community: string): number {
  return presets.filter((p) => p.community === community).length;
}
