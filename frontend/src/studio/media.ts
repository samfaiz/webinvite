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

/** True if the content still has any inline base64 media that should be uploaded. */
export function hasEmbeddedMedia(content: Content): boolean {
  const photos = content.story?.items ?? [];
  if (photos.some((it) => isDataUrl(it.photo))) return true;
  if (isDataUrl(content.envelope?.videoUrl)) return true;
  return isDataUrl(content.couple?.logo);
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
}
