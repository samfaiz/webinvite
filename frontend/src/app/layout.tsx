import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVars } from "@/fonts";
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
  themeColor: "#7a2e2a", // brand maroon — tints the mobile browser chrome
};

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
