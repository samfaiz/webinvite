import type { Theme } from "@/engine/types";

/**
 * Color/font presets. Fonts reference CSS variables declared in app/layout.tsx.
 * The Studio can edit any value at runtime — they flow into CSS custom properties
 * via <ThemeProvider>. Crossed with templates × motif packs, these multiply into
 * the curated gallery presets ("designs").
 */

const fonts = {
  display: "var(--font-cinzel)",
  script: "var(--font-greatvibes)",
  body: "var(--font-cormorant)",
} as const;

function make(
  id: string,
  name: string,
  c: Theme["colors"],
  particles: Theme["particles"]
): Theme {
  return { id, name, colors: c, fonts, particles };
}

export const themes: Record<string, Theme> = {
  "dusty-blue": make(
    "dusty-blue",
    "Dusty Blue & Gold",
    {
      bg: "#eef2f6", surface: "#fbf8f1", primary: "#2b3a67", secondary: "#3f5b8b",
      accent: "#b08d57", text: "#33414f", muted: "#7c8aa0",
      gradientFrom: "#dfe7f0", gradientTo: "#cdd9e8",
    },
    { type: "petals", color: "#ffffff" }
  ),
  "maroon-gold": make(
    "maroon-gold",
    "Maroon & Gold",
    {
      bg: "#f6efe7", surface: "#fdf8f1", primary: "#6e1023", secondary: "#8c2b3a",
      accent: "#c39b4e", text: "#3d2b27", muted: "#9a7d72",
      gradientFrom: "#f3e3d3", gradientTo: "#e9cdb4",
    },
    { type: "petals", color: "#f3d9a8" }
  ),
  "emerald-cream": make(
    "emerald-cream",
    "Emerald & Cream",
    {
      bg: "#eef3ee", surface: "#fbfaf3", primary: "#1f4d3a", secondary: "#2f6b50",
      accent: "#c0a14e", text: "#2c3a33", muted: "#7e9486",
      gradientFrom: "#e2eee5", gradientTo: "#cfe1d4",
    },
    { type: "sparkles", color: "#e7d8a6" }
  ),
  "blush-rose": make(
    "blush-rose",
    "Blush & Rose Gold",
    {
      bg: "#fbeef0", surface: "#fff8f5", primary: "#8a3b53", secondary: "#b35c74",
      accent: "#cf9b6e", text: "#5b3b41", muted: "#b58a92",
      gradientFrom: "#fbe3e6", gradientTo: "#f6d2cf",
    },
    { type: "petals", color: "#ffffff" }
  ),
  "royal-blue": make(
    "royal-blue",
    "Royal Blue & Silver",
    {
      bg: "#eef0f7", surface: "#f9fafe", primary: "#1b2a6b", secondary: "#33459c",
      accent: "#9aa6c4", text: "#2a3350", muted: "#8089a8",
      gradientFrom: "#dfe4f3", gradientTo: "#c6cfe9",
    },
    { type: "sparkles", color: "#dfe6f5" }
  ),
  "peach-coral": make(
    "peach-coral",
    "Peach & Coral",
    {
      bg: "#fdf1ea", surface: "#fff8f3", primary: "#b65340", secondary: "#d07a5e",
      accent: "#caa05f", text: "#5e3d33", muted: "#c19a8b",
      gradientFrom: "#fce0d2", gradientTo: "#f7c9b5",
    },
    { type: "petals", color: "#ffffff" }
  ),
  "lavender-mist": make(
    "lavender-mist",
    "Lavender & Silver",
    {
      bg: "#f2eef7", surface: "#fbf9fe", primary: "#5a4a86", secondary: "#7a68a8",
      accent: "#b9a7d6", text: "#43395f", muted: "#9a8fb5",
      gradientFrom: "#ece3f5", gradientTo: "#dbcdec",
    },
    { type: "sparkles", color: "#e9def7" }
  ),
  "ruby-gold": make(
    "ruby-gold",
    "Ruby & Gold",
    {
      bg: "#f8ece9", surface: "#fdf6f2", primary: "#8c0f2e", secondary: "#b22847",
      accent: "#caa24c", text: "#46221f", muted: "#a87f78",
      gradientFrom: "#f6dcd6", gradientTo: "#eec1b8",
    },
    { type: "petals", color: "#f3d9a8" }
  ),
  "teal-pearl": make(
    "teal-pearl",
    "Teal & Pearl",
    {
      bg: "#e9f2f1", surface: "#f8fbfa", primary: "#13565a", secondary: "#2c7b80",
      accent: "#c3a878", text: "#244043", muted: "#6f9495",
      gradientFrom: "#dcecea", gradientTo: "#c3ddd9",
    },
    { type: "sparkles", color: "#e3d6b4" }
  ),
  "plum-gold": make(
    "plum-gold",
    "Plum & Antique Gold",
    {
      bg: "#f3edf1", surface: "#fbf7fa", primary: "#5b2348", secondary: "#7d3a66",
      accent: "#b69356", text: "#412035", muted: "#9a7e90",
      gradientFrom: "#eaddE7", gradientTo: "#d9c2d4",
    },
    { type: "petals", color: "#ecdcc0" }
  ),
};

export const themeList = Object.values(themes);
export const getTheme = (id: string): Theme => themes[id] ?? themes["dusty-blue"];
