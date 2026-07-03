/**
 * Read an image File and return a downscaled data URL. Keeps big phone photos
 * out of localStorage / the saved JSON; the publish step later uploads any
 * remaining data: URLs and swaps in real URLs. Pass mime "image/png" to keep a
 * transparent background (e.g. a logo); default is JPEG for photos.
 */
export function fileToScaledDataUrl(
  file: File,
  maxDim = 1280,
  quality = 0.82,
  mime: "image/jpeg" | "image/png" = "image/jpeg",
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't a valid image"));
      img.onload = () => {
        let { width, height } = img;
        if (!width || !height) return reject(new Error("That image has no size — try a PNG or JPG"));
        if (Math.max(width, height) > maxDim) {
          const s = maxDim / Math.max(width, height);
          width = Math.round(width * s);
          height = Math.round(height * s);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(String(reader.result));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(mime, quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
