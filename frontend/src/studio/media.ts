import type { Draft } from "./draft";
import { api } from "@/lib/api";

/* ---- media flush: keep base64 out of the saved invitation JSON ----
 *
 * Photos, the intro video and a custom crest/logo are held inline as base64
 * data URLs while the couple edits (so the live preview works without a round
 * trip). On save/publish we upload each one and swap in its URL, so the stored
 * invitation stays small and published pages load fast. Shared by the /create
 * wizard and the /studio editor. */

type Content = Draft["content"];

const isDataUrl = (v: unknown): v is string => typeof v === "string" && v.startsWith("data:");

/** Every base64 image inside the composable "custom" sections (backgrounds,
 *  story photos, gallery images). */
function customSectionDataUrls(content: Content): boolean {
  for (const s of content.customSections ?? []) {
    if (isDataUrl(s.background?.image)) return true;
    const c = s.content as Record<string, unknown>;
    if (Array.isArray(c.items) && (c.items as { photo?: unknown }[]).some((it) => isDataUrl(it?.photo))) return true;
    if (Array.isArray(c.images) && (c.images as unknown[]).some(isDataUrl)) return true;
  }
  return false;
}

/** True if the content still has any inline base64 media that should be uploaded. */
export function hasEmbeddedMedia(content: Content): boolean {
  const photos = content.story?.items ?? [];
  if (photos.some((it) => isDataUrl(it.photo))) return true;
  if (isDataUrl(content.envelope?.videoUrl)) return true;
  if (isDataUrl(content.couple?.logo)) return true;
  if (isDataUrl(content.guestEmails?.photo)) return true;
  return customSectionDataUrls(content);
}

/** Convert a base64 data URL to a File for multipart upload. */
export async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
  return new File([blob], `${name}.${ext}`, { type: blob.type || "image/jpeg" });
}

/** Upload any inline base64 media to /uploads/media and swap in the URLs.
 *  Mutates `content`. Requires the user to be signed in (the upload is JWT-guarded). */
export async function flushEmbeddedMedia(content: Content): Promise<void> {
  const items = content.story?.items ?? [];
  for (let i = 0; i < items.length; i++) {
    const p = items[i].photo;
    if (isDataUrl(p)) {
      const { url } = await api.uploadMedia(await dataUrlToFile(p, `story-${i + 1}`));
      items[i].photo = url;
    }
  }
  const v = content.envelope?.videoUrl;
  if (isDataUrl(v)) {
    const { url } = await api.uploadMedia(await dataUrlToFile(v, "intro"));
    content.envelope.videoUrl = url;
  }
  const logo = content.couple?.logo;
  if (isDataUrl(logo)) {
    const { url } = await api.uploadMedia(await dataUrlToFile(logo, "crest"));
    content.couple.logo = url;
  }
  const gePhoto = content.guestEmails?.photo;
  if (isDataUrl(gePhoto)) {
    const { url } = await api.uploadMedia(await dataUrlToFile(gePhoto, "guest-email"));
    content.guestEmails!.photo = url;
  }

  // composable "custom" sections: backgrounds, story photos, gallery images
  const sections = content.customSections ?? [];
  for (let si = 0; si < sections.length; si++) {
    const s = sections[si];
    if (isDataUrl(s.background?.image)) {
      const { url } = await api.uploadMedia(await dataUrlToFile(s.background!.image!, `sec-${si + 1}-bg`));
      s.background!.image = url;
    }
    const c = s.content as Record<string, unknown>;
    if (Array.isArray(c.items)) {
      const items = c.items as { photo?: unknown }[];
      for (let i = 0; i < items.length; i++) {
        if (isDataUrl(items[i]?.photo)) {
          const { url } = await api.uploadMedia(await dataUrlToFile(items[i].photo as string, `sec-${si + 1}-photo-${i + 1}`));
          items[i].photo = url;
        }
      }
    }
    if (Array.isArray(c.images)) {
      const imgs = c.images as unknown[];
      for (let i = 0; i < imgs.length; i++) {
        if (isDataUrl(imgs[i])) {
          const { url } = await api.uploadMedia(await dataUrlToFile(imgs[i] as string, `sec-${si + 1}-img-${i + 1}`));
          imgs[i] = url;
        }
      }
    }
  }
}
