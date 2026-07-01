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
      if (!tpl.supportedCommunities.includes(community)) continue;
      for (const theme of themeList) {
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
