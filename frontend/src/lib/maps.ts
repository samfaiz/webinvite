/**
 * Maps helpers. A directions target is either a free-text location (venue +
 * address) or an explicit link the couple pasted. We open the right app per
 * device: Apple Maps on iOS, Google Maps on Android & web.
 */

export type MapTarget = {
  /** human location text, e.g. "Grand Arena, Ettumanoor, Kottayam" */
  query?: string;
  /** an explicit map link the couple pasted (used as-is when not parseable) */
  url?: string;
};

export type Platform = "ios" | "android" | "web";

/** Pull a searchable query out of a maps URL, if it carries one. */
function queryFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return (
      u.searchParams.get("q") ||
      u.searchParams.get("query") ||
      u.searchParams.get("destination") ||
      u.searchParams.get("daddr") ||
      null
    );
  } catch {
    return null;
  }
}

function resolveQuery(t: MapTarget): string {
  if (t.query && t.query.trim()) return t.query.trim();
  if (t.url) return queryFromUrl(t.url) ?? "";
  return "";
}

/** True when this target can produce a usable link at all. */
export function hasMapTarget(t: MapTarget): boolean {
  return Boolean((t.query && t.query.trim()) || (t.url && t.url.trim()));
}

/**
 * Google Maps web search link — the universal default. On Android this also
 * opens the Google Maps app via App Links. An explicitly pasted link always
 * wins over the venue text: a text search can land on the wrong place, the
 * couple's own link can't.
 */
export function googleMapsUrl(t: MapTarget): string {
  const url = t.url?.trim();
  if (url) return url;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(resolveQuery(t))}`;
}

/** Apple Maps link — opens the native Maps app on iPhone/iPad. When the couple
 *  pasted a link we keep its exact query if it has one, else use it as-is. */
export function appleMapsUrl(t: MapTarget): string {
  const url = t.url?.trim();
  if (url) {
    const q = queryFromUrl(url);
    return q ? `https://maps.apple.com/?q=${encodeURIComponent(q)}` : url;
  }
  return `https://maps.apple.com/?q=${encodeURIComponent(resolveQuery(t))}`;
}

/** Detect the current device family (client only; "web" during SSR). */
export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "web";
  const ua = navigator.userAgent || "";
  const iPadOS =
    /Mac/.test(ua) && typeof document !== "undefined" && "ontouchend" in document;
  if (/iPhone|iPad|iPod/i.test(ua) || iPadOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "web";
}

/** The directions link for the current device: iOS → Apple Maps, else Google Maps. */
export function platformMapsUrl(t: MapTarget, platform: Platform = detectPlatform()): string {
  return platform === "ios" ? appleMapsUrl(t) : googleMapsUrl(t);
}

/** Build a directions target from an event's venue/address (+ optional link). */
export function targetFromEvent(e: {
  venue?: string;
  address?: string;
  mapUrl?: string;
}): MapTarget {
  return {
    query: [e.venue, e.address].filter(Boolean).join(", "),
    url: e.mapUrl,
  };
}
