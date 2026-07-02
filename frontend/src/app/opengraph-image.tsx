import { ImageResponse } from "next/og";
import { SITE } from "@/lib/seo";

export const alt = "Web Invite — beautiful wedding invitation websites";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Default social-share card for the whole site (Next auto-applies it to every
 * route that doesn't define its own). Drawn at request/build time so there's no
 * static asset to maintain, and no web-font fetch (avoids the Turbopack font issue).
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #fff8f0 0%, #fbe0d8 100%)",
          color: "#5a2338",
          fontFamily: "Georgia, serif",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", width: 90, height: 3, background: "#d95f48", marginBottom: 40 }} />
        <div style={{ display: "flex", fontSize: 34, letterSpacing: 12, textTransform: "uppercase", color: "#c9497c" }}>
          Wedding · Engagement · Anniversary
        </div>
        <div style={{ display: "flex", fontSize: 128, fontWeight: 700, marginTop: 10, fontStyle: "italic" }}>{SITE.name}</div>
        <div
          style={{
            display: "flex",
            fontSize: 34,
            color: "#8a5f6c",
            marginTop: 24,
            maxWidth: 900,
            textAlign: "center",
            fontStyle: "italic",
          }}
        >
          Animated invitation pages, in full colour — with live RSVPs.
        </div>
        <div style={{ display: "flex", width: 90, height: 3, background: "#d95f48", marginTop: 40 }} />
        <div style={{ display: "flex", position: "absolute", bottom: 42, fontSize: 26, letterSpacing: 6, color: "#c9497c" }}>
          webinvite.co
        </div>
      </div>
    ),
    { ...size },
  );
}
