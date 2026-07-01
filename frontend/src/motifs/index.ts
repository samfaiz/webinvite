import type { MotifPack } from "@/engine/types";

/**
 * Community / religious layers. Icons are emoji placeholders for Phase 1 — they'll
 * be swapped for proper SVG/PNG motif assets later. sectionLabels let each community
 * rename events (Holy Mass / Muhurtham / Nikah) without touching the templates.
 */

export const motifs: Record<string, MotifPack> = {
  "kerala-christian": {
    id: "kerala-christian",
    name: "Kerala Christian",
    community: "kerala-christian",
    icons: {
      church: "⛪",
      cross: "✝",
      rings: "💍",
      dove: "🕊️",
      lamp: "🪔",
      cheers: "🥂",
      heart: "♥",
    },
    decorativeBorders: ["floral-vine"],
    defaultBlessing:
      "Therefore what God has joined together, let no one separate.",
    defaultBlessingRef: "Matthew 19:6",
    sectionLabels: {
      ceremony: "Holy Mass",
      blessing: "Nuptial Blessing",
    },
    suggestedThemes: ["dusty-blue", "emerald-cream", "blush-rose"],
  },
  "hindu": {
    id: "hindu",
    name: "Hindu",
    community: "hindu",
    icons: {
      ganesha: "🕉️",
      lamp: "🪔",
      kalasham: "🏺",
      flowers: "🌸",
      rings: "💍",
      heart: "❤",
    },
    decorativeBorders: ["paisley"],
    defaultBlessing: "Om Ganeshaya Namah — may this union be blessed.",
    sectionLabels: {
      ceremony: "Muhurtham",
      mehendi: "Mehendi",
      haldi: "Haldi",
    },
    suggestedThemes: ["maroon-gold", "emerald-cream"],
  },
  "muslim": {
    id: "muslim",
    name: "Muslim",
    community: "muslim",
    icons: {
      crescent: "☪️",
      star: "✦",
      lantern: "🏮",
      rings: "💍",
      heart: "❤",
    },
    decorativeBorders: ["crescent"],
    defaultBlessing: "Bismillah ir-Rahman ir-Rahim",
    sectionLabels: {
      ceremony: "Nikah",
      reception: "Walima",
    },
    suggestedThemes: ["emerald-cream", "maroon-gold"],
  },
  "secular": {
    id: "secular",
    name: "Secular / Interfaith",
    community: "secular",
    icons: {
      rings: "💍",
      flowers: "🌷",
      cheers: "🥂",
      heart: "♥",
      star: "✦",
    },
    decorativeBorders: ["floral-vine"],
    defaultBlessing: "Two hearts, one journey.",
    sectionLabels: {},
    suggestedThemes: ["dusty-blue", "blush-rose"],
  },
};

export const motifList = Object.values(motifs);
export const getMotif = (id: string): MotifPack =>
  motifs[id] ?? motifs["kerala-christian"];
