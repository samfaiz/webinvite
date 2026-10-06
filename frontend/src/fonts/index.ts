import localFont from "next/font/local";

/**
 * The site's typefaces, kept in the app (./files) instead of fetched from
 * Google Fonts while building, so a build never fails on a download. The
 * same families and weights as before, with the same characters (Google's
 * Latin and Latin Extended sets); pages only ever use them through these
 * CSS variables, so nothing else changes. To add one, put its woff2 files in
 * ./files and declare it below the same way.
 */

const cinzel = localFont({
  variable: "--font-cinzel",
  src: [
    { path: "./files/cinzel-400.woff2", weight: "400", style: "normal" },
    { path: "./files/cinzel-600.woff2", weight: "600", style: "normal" },
  ],
  adjustFontFallback: "Times New Roman",
});

const cormorant = localFont({
  variable: "--font-cormorant",
  src: [
    { path: "./files/cormorant-400.woff2", weight: "400", style: "normal" },
    { path: "./files/cormorant-600.woff2", weight: "600", style: "normal" },
  ],
  adjustFontFallback: "Times New Roman",
});

const greatvibes = localFont({
  variable: "--font-greatvibes",
  src: [
    { path: "./files/greatvibes-400.woff2", weight: "400", style: "normal" },
  ],
});

const jost = localFont({
  variable: "--font-jost",
  src: [
    { path: "./files/jost-300.woff2", weight: "300", style: "normal" },
    { path: "./files/jost-400.woff2", weight: "400", style: "normal" },
    { path: "./files/jost-500.woff2", weight: "500", style: "normal" },
  ],
});

// Additional display/body fonts offered in the Studio text Format panel + the
// site-wide Theme tab (Site Settings → Theme).
const playfair = localFont({
  variable: "--font-playfair",
  src: [
    { path: "./files/playfair-400.woff2", weight: "400", style: "normal" },
    { path: "./files/playfair-700.woff2", weight: "700", style: "normal" },
  ],
  adjustFontFallback: "Times New Roman",
});

const marcellus = localFont({
  variable: "--font-marcellus",
  src: [
    { path: "./files/marcellus-400.woff2", weight: "400", style: "normal" },
  ],
  adjustFontFallback: "Times New Roman",
});

const ebgaramond = localFont({
  variable: "--font-ebgaramond",
  src: [
    { path: "./files/ebgaramond-400.woff2", weight: "400", style: "normal" },
    { path: "./files/ebgaramond-600.woff2", weight: "600", style: "normal" },
  ],
  adjustFontFallback: "Times New Roman",
});

const dancing = localFont({
  variable: "--font-dancing",
  src: [
    { path: "./files/dancing-400.woff2", weight: "400", style: "normal" },
    { path: "./files/dancing-700.woff2", weight: "700", style: "normal" },
  ],
});

const parisienne = localFont({
  variable: "--font-parisienne",
  src: [
    { path: "./files/parisienne-400.woff2", weight: "400", style: "normal" },
  ],
});

const inter = localFont({
  variable: "--font-inter",
  src: [
    { path: "./files/inter-300.woff2", weight: "300", style: "normal" },
    { path: "./files/inter-400.woff2", weight: "400", style: "normal" },
    { path: "./files/inter-500.woff2", weight: "500", style: "normal" },
    { path: "./files/inter-600.woff2", weight: "600", style: "normal" },
    { path: "./files/inter-700.woff2", weight: "700", style: "normal" },
  ],
});

// Karla — body face for the maroon/cream brand direction
const karla = localFont({
  variable: "--font-karla",
  src: [
    { path: "./files/karla-400.woff2", weight: "400", style: "normal" },
    { path: "./files/karla-500.woff2", weight: "500", style: "normal" },
    { path: "./files/karla-600.woff2", weight: "600", style: "normal" },
    { path: "./files/karla-700.woff2", weight: "700", style: "normal" },
  ],
});

const spaceGrotesk = localFont({
  variable: "--font-space-grotesk",
  src: [
    { path: "./files/space-grotesk-300.woff2", weight: "300", style: "normal" },
    { path: "./files/space-grotesk-400.woff2", weight: "400", style: "normal" },
    { path: "./files/space-grotesk-500.woff2", weight: "500", style: "normal" },
    { path: "./files/space-grotesk-600.woff2", weight: "600", style: "normal" },
    { path: "./files/space-grotesk-700.woff2", weight: "700", style: "normal" },
  ],
});

const spaceMono = localFont({
  variable: "--font-space-mono",
  src: [
    { path: "./files/space-mono-400.woff2", weight: "400", style: "normal" },
    { path: "./files/space-mono-700.woff2", weight: "700", style: "normal" },
  ],
});

// Bodoni Moda — the high-contrast display face of the Emerald Rose design.
// Not preloaded: only that design's pages use it, so others don't pay for it.
const bodoni = localFont({
  variable: "--font-bodoni",
  src: [
    { path: "./files/bodoni-400.woff2", weight: "400", style: "normal" },
    { path: "./files/bodoni-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./files/bodoni-500.woff2", weight: "500", style: "normal" },
    { path: "./files/bodoni-500-italic.woff2", weight: "500", style: "italic" },
    { path: "./files/bodoni-600.woff2", weight: "600", style: "normal" },
    { path: "./files/bodoni-600-italic.woff2", weight: "600", style: "italic" },
  ],
  adjustFontFallback: "Times New Roman",
  preload: false,
});

/** Every font's CSS variable, for the <html> element. */
export const fontVars = [
  cinzel, cormorant, greatvibes, jost, playfair, marcellus, ebgaramond, dancing, parisienne, inter, karla, spaceGrotesk, spaceMono, bodoni,
]
  .map((f) => f.variable)
  .join(" ");
