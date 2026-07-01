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
import { SITE, organizationLd, websiteLd, softwareApplicationLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";

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

const DEFAULT_TITLE = "Web Invite — Beautiful Wedding Invitation Websites";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: DEFAULT_TITLE,
    template: "%s · Web Invite",
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [...SITE.keywords],
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  alternates: { canonical: SITE.url },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    url: SITE.url,
    title: DEFAULT_TITLE,
    description: SITE.description,
    locale: SITE.locale,
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "technology",
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
        <JsonLd data={[organizationLd(), websiteLd(), softwareApplicationLd()]} />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
