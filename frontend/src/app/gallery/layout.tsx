import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Wedding Invitation Templates & Designs",
  description:
    "Browse elegant, animated wedding-invitation website templates for Christian, Hindu, Muslim and secular weddings. Preview a design and make it yours in minutes.",
  path: "/gallery",
  keywords: ["wedding invitation templates", "wedding website designs", "invitation templates"],
});

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
