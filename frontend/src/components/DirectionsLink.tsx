"use client";

import { useCallback } from "react";
import { googleMapsUrl, platformMapsUrl, type MapTarget } from "@/lib/maps";

/**
 * A "Get Directions" link that opens the right maps app for the visitor's
 * device: Apple Maps on iOS, Google Maps on Android & desktop. The href is the
 * Google Maps web URL (SSR-stable, works without JS / on right-click); on click
 * we upgrade to the platform-correct link.
 */
export function DirectionsLink({
  target,
  className,
  style,
  children,
}: {
  target: MapTarget;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const fallback = googleMapsUrl(target);

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      const url = platformMapsUrl(target);
      if (url && url !== fallback) {
        e.preventDefault();
        window.open(url, "_blank", "noopener,noreferrer");
      }
    },
    [target, fallback],
  );

  return (
    <a
      href={fallback}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={className}
      style={style}
    >
      {children}
    </a>
  );
}
