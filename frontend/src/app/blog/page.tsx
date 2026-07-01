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
        <h1 className="font-display text-4xl text-[#2b3a67]">The Web Invite Blog</h1>
        <p className="mt-2 max-w-2xl text-slate-600">Ideas, etiquette and inspiration for your wedding invitations.</p>

        {posts.length === 0 ? (
          <p className="mt-12 rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-400">
            No posts yet — check back soon.
          </p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-lg"
              >
                <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100">
                  {p.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.coverImage} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-300">Web Invite</div>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="font-display text-lg text-[#2b3a67]">{p.title}</h2>
                  {p.excerpt ? <p className="mt-2 line-clamp-3 text-sm text-slate-600">{p.excerpt}</p> : null}
                  <p className="mt-3 text-[11px] uppercase tracking-wide text-slate-400">
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
