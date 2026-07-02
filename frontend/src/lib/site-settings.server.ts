/**
 * Server-side fetch of public site settings for use in `generateMetadata`
 * and other RSC contexts. Keeps the base URL logic in one place and returns
 * `null` on any failure so `layout.tsx` can fall back to the built-in
 * `SITE.*` constants without crashing SSR when the backend is down.
 *
 * `no-store` fetches — settings are edited from the admin panel and users
 * expect the change to appear on the next page load, not after the next
 * deploy.
 */
import { API_BASE, type PublicSiteSettings } from "./api";

export async function getPublicSiteSettingsServer(): Promise<PublicSiteSettings | null> {
  try {
    const res = await fetch(`${API_BASE}/site-settings/public`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as PublicSiteSettings;
  } catch {
    return null;
  }
}
