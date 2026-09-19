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
      <div className="mx-auto max-w-[1100px] px-6 py-14">
        <span
          className="text-[11px] font-semibold uppercase"
          style={{ letterSpacing: "0.22em", color: "var(--b-gold)" }}
        >
          The Journal
        </span>
        <h1
          className="mt-3 text-[40px] font-semibold leading-[1.1] sm:text-[52px]"
          style={{ fontFamily: "var(--f-display)", color: "var(--b-ink)" }}
        >
          Ideas for a better invitation
        </h1>
        <p className="mt-3 max-w-2xl text-[17px] leading-[1.6]" style={{ color: "var(--b-muted)" }}>
          Etiquette, wording and design inspiration — written for couples planning
          their own celebration.
        </p>

        {posts.length === 0 ? (
          <p
            className="mt-12 rounded-2xl border border-dashed p-12 text-center text-[15px]"
            style={{ borderColor: "var(--b-border)", color: "var(--b-muted)" }}
          >
            No posts yet — publish one from Admin → Blog posts and it appears here.
          </p>
        ) : (
          <>
            {/* The newest post leads; the rest follow in a grid. */}
            <PostCard post={posts[0]} lead />
            {posts.length > 1 ? (
              <div className="mt-8 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                {posts.slice(1).map((p) => (
                  <PostCard key={p.slug} post={p} />
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </PublicShell>
  );
}

/** Shared card. `lead` renders the newest post wide, with the image beside it. */
function PostCard({ post: p, lead = false }: { post: PostCard; lead?: boolean }) {
  const meta = [p.authorName, p.publishedAt ? new Date(p.publishedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/blog/${p.slug}`}
      className={`group flex overflow-hidden rounded-2xl bg-white transition-shadow hover:shadow-[0_18px_44px_rgba(43,27,18,0.12)] ${
        lead ? "mt-10 flex-col md:flex-row" : "flex-col"
      }`}
      style={{ border: "1px solid var(--b-border)" }}
    >
      <div
        className={`overflow-hidden ${lead ? "md:w-[52%]" : ""}`}
        style={{ background: "var(--b-tint)" }}
      >
        <div className={lead ? "aspect-[16/10] h-full w-full" : "aspect-[16/10] w-full"}>
          {p.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.coverImage}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            <div
              className="flex h-full items-center justify-center text-[22px]"
              style={{ fontFamily: "var(--f-display)", color: "var(--b-border-soft)" }}
            >
              webinvite.
            </div>
          )}
        </div>
      </div>

      <div className={`flex flex-col p-6 ${lead ? "justify-center md:w-[48%] md:p-9" : ""}`}>
        {lead ? (
          <span
            className="mb-2 text-[11px] font-semibold uppercase"
            style={{ letterSpacing: "0.18em", color: "var(--b-gold)" }}
          >
            Latest
          </span>
        ) : null}
        <h2
          className={`font-semibold leading-[1.2] ${lead ? "text-[26px] sm:text-[32px]" : "text-[20px]"}`}
          style={{ fontFamily: "var(--f-display)", color: "var(--b-ink)", textWrap: "pretty" }}
        >
          {p.title}
        </h2>
        {p.excerpt ? (
          <p
            className={`mt-3 leading-[1.6] ${lead ? "text-[15px]" : "line-clamp-3 text-[14px]"}`}
            style={{ color: "var(--b-muted)" }}
          >
            {p.excerpt}
          </p>
        ) : null}
        {meta ? (
          <p className="mt-4 text-[12px]" style={{ color: "var(--b-muted)" }}>
            {meta}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
