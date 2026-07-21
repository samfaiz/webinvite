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
  Inter,
  Space_Grotesk,
  Space_Mono,
} from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import {
  organizationLd,
  websiteLd,
  softwareApplicationLd,
  rootMetadataFromSettings,
} from "@/lib/seo";
import { getPublicSiteSettingsServer } from "@/lib/site-settings.server";
import { JsonLd } from "@/components/JsonLd";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { MetaPixel } from "@/components/MetaPixel";
import { ThemeInjector } from "@/components/ThemeInjector";

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

// Additional display/body fonts offered in the Studio text Format panel + the
// site-wide Theme tab (Site Settings → Theme).
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["400", "700"] });
const marcellus = Marcellus({ variable: "--font-marcellus", subsets: ["latin"], weight: ["400"] });
const ebGaramond = EB_Garamond({ variable: "--font-ebgaramond", subsets: ["latin"], weight: ["400", "600"] });
const dancing = Dancing_Script({ variable: "--font-dancing", subsets: ["latin"], weight: ["400", "700"] });
const parisienne = Parisienne({ variable: "--font-parisienne", subsets: ["latin"], weight: ["400"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });
const spaceMono = Space_Mono({ variable: "--font-space-mono", subsets: ["latin"], weight: ["400", "700"] });

const fontVars = [
  cinzel, cormorant, greatVibes, jost, playfair, marcellus, ebGaramond, dancing, parisienne,
  inter, spaceGrotesk, spaceMono,
]
  .map((f) => f.variable)
  .join(" ");

/**
 * Root metadata is composed from Site Settings so admins can edit the default
 * <title>, description, keywords, OG image and favicon from
 * /admin/site-settings without redeploying. Child routes can still override
 * any field via their own `generateMetadata`.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettingsServer();
  return rootMetadataFromSettings(settings);
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getPublicSiteSettingsServer();
  return (
    <html
      lang="en"
      className={`${fontVars} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* suppressHydrationWarning: some browser extensions (e.g. Bitdefender,
          password managers) inject attributes like `bis_register` /
          `__processed_*` into <html>/<body> before React hydrates. That's
          harmless but triggers a hydration-mismatch warning; this silences it. */}
      <body className="min-h-full" suppressHydrationWarning>
        <JsonLd data={[organizationLd(settings), websiteLd(settings), softwareApplicationLd(settings)]} />
        <ThemeInjector />
        <GoogleAnalytics />
        <MetaPixel />
        <AnalyticsTracker />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
