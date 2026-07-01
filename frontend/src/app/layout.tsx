import type { Metadata, Viewport } from "next";
import {
  Cinzel,
  Cormorant_Garamond,
  Great_Vibes,
  Jost,
  Playfair_Display,
  Marcellus,
  EB_Garamond,
  Dancing_Script,
  Parisienne,
} from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2b3a67",
};

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const greatVibes = Great_Vibes({
  variable: "--font-greatvibes",
  subsets: ["latin"],
  weight: ["400"],
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

// Additional display/body fonts offered in the Studio text Format panel.
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["400", "700"] });
const marcellus = Marcellus({ variable: "--font-marcellus", subsets: ["latin"], weight: ["400"] });
const ebGaramond = EB_Garamond({ variable: "--font-ebgaramond", subsets: ["latin"], weight: ["400", "600"] });
const dancing = Dancing_Script({ variable: "--font-dancing", subsets: ["latin"], weight: ["400", "700"] });
const parisienne = Parisienne({ variable: "--font-parisienne", subsets: ["latin"], weight: ["400"] });

const fontVars = [cinzel, cormorant, greatVibes, jost, playfair, marcellus, ebGaramond, dancing, parisienne]
  .map((f) => f.variable)
  .join(" ");

export const metadata: Metadata = {
  title: "Eternal — Wedding Invitations",
  description:
    "Create a beautiful, animated wedding invitation website in minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontVars} h-full antialiased`}
    >
      <body className="min-h-full">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
