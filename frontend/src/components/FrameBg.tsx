"use client";

import type { ReactNode } from "react";
import { usePreview } from "./PreviewContext";

/**
 * Full-screen (9:16 phone) slide with an optional cover background image + soft
 * scrim. `fullScreen` makes it one phone screen tall with content centered. In the
 * editor's compact preview, the forced 100svh height is dropped so sections size
 * to their content (and remain readable in a small pane).
 *
 * Layering uses NO negative z-index: image + scrim are absolute, content is in a
 * trailing relative wrapper (content above image; image above the base colour).
 */
export function FrameBg({
  id,
  src,
  children,
  scrim = 0.26,
  fullScreen = false,
}: {
  id?: string;
  src?: string;
  children: ReactNode;
  scrim?: number;
  fullScreen?: boolean;
}) {
  const { compact } = usePreview();
  const tall = fullScreen && !compact;
  const centered = tall ? "flex min-h-svh flex-col justify-center" : "";

  if (!src) {
    return (
      <div id={id} className={`snap-start ${centered}`.trim()}>
        {children}
      </div>
    );
  }

  return (
    <div id={id} className={`relative snap-start ${tall ? "min-h-svh" : ""}`}>
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${src})` }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 80% at 50% 45%, rgba(255,255,255,${scrim * 0.35}), rgba(255,255,255,${scrim}) 72%)`,
        }}
      />
      <div className={`relative ${centered}`}>{children}</div>
    </div>
  );
}
