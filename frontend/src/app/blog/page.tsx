import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/cms/PublicShell";
import { pageMetadata } from "@/lib/seo";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export const metadata: Metadata = pageMetadata({
  title: "Blog",
  description: "Wedding-planning tips, invitation ideas and inspiration from Web Invite.",
  path: "/blog",
});

export const dynamic = "force-dynamic";

type PostCard = {
  slug: string;
  title: string;
  excerpt?: string | null;
  coverImage?: string | null;
  authorName?: string | null;
  publishedAt?: string | null;
};

async function getPosts(): Promise<PostCard[]> {
  try {
    const r = await fetch(`${API}/blog`, { cache: "no-store" });
    return r.ok ? await r.json() : [];
  } catch {
    return [];
  }
}

export default async function BlogIndex() {
  const posts = await getPosts();
  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl px-6 py-14">
        <span className="text-[11px] font-medium tracking-[0.28em] text-[#5c7bb0]" style={{ fontFamily: "var(--f-body)" }}>
          THE JOURNAL
        </span>
        <h1 className="mt-3 text-5xl font-medium italic text-[#2b3a67]" style={{ fontFamily: "var(--f-serif)" }}>
          The Web Invite Blog
        </h1>
        <p className="mt-3 max-w-2xl text-[rgba(43,58,103,0.7)]" style={{ fontFamily: "var(--f-body)" }}>
          Ideas, etiquette and inspiration for your wedding invitations.
        </p>

        {posts.length === 0 ? (
          <p
            className="mt-12 rounded-xl border border-dashed border-[rgba(111,138,184,0.35)] p-10 text-center text-[rgba(43,58,103,0.55)]"
            style={{ fontFamily: "var(--f-body)" }}
          >
            No posts yet — check back soon.
          </p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="group overflow-hidden rounded-2xl border border-[rgba(111,138,184,0.15)] bg-white shadow-[0_10px_30px_rgba(43,58,103,0.06)] transition-shadow hover:shadow-[0_20px_50px_rgba(43,58,103,0.14)]"
              >
                <div className="aspect-[16/10] w-full overflow-hidden bg-[#e8edf5]">
                  {p.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.coverImage} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[rgba(43,58,103,0.35)]" style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 22 }}>
                      Web Invite
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="text-xl font-medium italic text-[#2b3a67]" style={{ fontFamily: "var(--f-serif)" }}>{p.title}</h2>
                  {p.excerpt ? (
                    <p className="mt-2 line-clamp-3 text-sm text-[rgba(43,58,103,0.7)]" style={{ fontFamily: "var(--f-body)" }}>
                      {p.excerpt}
                    </p>
                  ) : null}
                  <p className="mt-3 text-[11px] uppercase tracking-wide text-[rgba(43,58,103,0.5)]" style={{ fontFamily: "var(--f-body)" }}>
                    {[p.authorName, p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
