import type { Metadata } from "next";

// Covers /studio and its children (/studio/embed, /studio/preview) via inheritance.
export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false },
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
