"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { presets } from "@/templates/registry";
import { getTheme } from "@/themes";
import { ExploreCard, type ExploreDesign } from "./ExploreCard";

/**
 * `/explore` — the TikTok-style design browser: one full-screen design per
 * viewport, swiped vertically. Mobile-first; on a wide screen the feed is
 * centred in a phone-width column so the layout never stretches.
 */

/** Filter chips. `key` maps onto the field the API filters by. */
const CHIPS: { id: string; label: string; key?: "category" | "community" | "country"; value?: string }[] = [
  { id: "all", label: "For You" },
  { id: "wedding", label: "Wedding", key: "category", value: "wedding" },
  { id: "birthday", label: "Birthday", key: "category", value: "birthday" },
  { id: "engagement", label: "Engagement", key: "category", value: "engagement" },
  { id: "hindu", label: "Hindu", key: "community", value: "hindu" },
  { id: "muslim", label: "Muslim", key: "community", value: "muslim" },
  { id: "christian", label: "Christian", key: "community", value: "kerala-christian" },
  { id: "secular", label: "Secular", key: "community", value: "secular" },
  { id: "india", label: "India", key: "country", value: "india" },
  { id: "uae", label: "UAE", key: "country", value: "uae" },
];

const LABELS: Record<string, string> = {
  wedding: "Wedding",
  birthday: "Birthday",
  engagement: "Engagement",
  hindu: "Hindu",
  muslim: "Muslim",
  "kerala-christian": "Christian",
  secular: "Secular",
  india: "India",
  uae: "UAE",
};
const titleise = (s?: string) => (s ? LABELS[s] ?? s.replace(/-/g, " ") : "");

/** Code presets as a fallback so the feed still works before any design is saved. */
function presetFeed(): ExploreDesign[] {
  const seen = new Set<string>();
  return presets
    .filter((p) => {
      const k = `${p.themeId}-${p.community}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 24)
    .map((p) => {
      const t = getTheme(p.themeId);
      return {
        id: p.id,
        name: p.name,
        community: p.community,
        category: "wedding",
        country: "india",
        likes: 0,
        saves: 0,
        colors: t.colors,
        fonts: t.fonts,
        backgrounds: t.backgrounds as Record<string, string | undefined> | undefined,
      };
    });
}

export default function ExplorePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [chip, setChip] = useState("all");
  const [feed, setFeed] = useState<ExploreDesign[] | null>(null);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);
  const [toast, setToast] = useState("");
  const [needsAuth, setNeedsAuth] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const filter = useMemo(() => {
    const c = CHIPS.find((x) => x.id === chip);
    return c?.key && c.value ? { [c.key]: c.value } : {};
  }, [chip]);

  // Load the feed for the active chip. Falls back to code presets when the
  // API is unreachable or the catalogue is empty, so /explore is never blank.
  useEffect(() => {
    let live = true;
    api
      .exploreDesigns(filter)
      .then((rows) => {
        if (!live) return;
        setFeed(rows.length ? (rows as ExploreDesign[]) : presetFeed());
      })
      .catch(() => live && setFeed(presetFeed()));
    return () => {
      live = false;
    };
  }, [filter]);

  /** Switching filter clears the feed and returns to the top of the new set. */
  const pickChip = useCallback((id: string) => {
    setChip(id);
    setFeed(null);
    setIndex(0);
    scrollerRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (!user) return;
    api
      .myDesignReactions()
      .then((r) => {
        setLiked(new Set(r.likes));
        setSaved(new Set(r.saves));
      })
      .catch(() => {});
  }, [user]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1800);
  }, []);

  const react = useCallback(
    async (design: ExploreDesign, kind: "like" | "save") => {
      if (!user) {
        setNeedsAuth(true);
        return;
      }
      const set = kind === "like" ? liked : saved;
      const apply = kind === "like" ? setLiked : setSaved;
      const on = !set.has(design.id);
      // optimistic — the server is the source of truth, so reconcile on reply
      apply((prev) => {
        const next = new Set(prev);
        if (on) next.add(design.id);
        else next.delete(design.id);
        return next;
      });
      setFeed((prev) =>
        prev?.map((d) =>
          d.id === design.id
            ? { ...d, [kind === "like" ? "likes" : "saves"]: Math.max(0, (d[kind === "like" ? "likes" : "saves"] ?? 0) + (on ? 1 : -1)) }
            : d,
        ) ?? prev,
      );
      try {
        const r = await api.reactToDesign(design.id, kind);
        setFeed((prev) =>
          prev?.map((d) => (d.id === design.id ? { ...d, likes: r.likes, saves: r.saves } : d)) ?? prev,
        );
      } catch {
        apply((prev) => {
          const next = new Set(prev);
          if (on) next.delete(design.id);
          else next.add(design.id);
          return next;
        });
        flash("Couldn't save that — try again");
      }
    },
    [user, liked, saved, flash],
  );

  const share = useCallback(
    async (design: ExploreDesign) => {
      const url = `${window.location.origin}/preview/${design.id}`;
      try {
        if (navigator.share) await navigator.share({ title: design.name, url });
        else {
          await navigator.clipboard.writeText(url);
          flash("Link copied");
        }
      } catch {
        /* the guest dismissed the share sheet */
      }
    },
    [flash],
  );

  // Track which design is in view so the bottom bar describes the right one.
  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setIndex(Math.round(el.scrollTop / el.clientHeight));
  }, []);

  const current = feed?.[Math.min(index, (feed?.length ?? 1) - 1)];

  return (
    <div className="flex min-h-svh justify-center" style={{ background: "var(--b-primary-deep)" }}>
      <div
        className="relative flex h-svh w-full max-w-[430px] flex-col overflow-hidden"
        style={{ background: "var(--b-primary)", fontFamily: "var(--f-brand)" }}
      >
        {/* filter chips */}
        <div
          className="flex shrink-0 gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <Link
            href="/"
            aria-label="Back to home"
            className="flex h-[34px] shrink-0 items-center rounded-full bg-white/[0.14] px-3 text-[13px] font-semibold text-[var(--b-tint)]"
          >
            ‹
          </Link>
          {CHIPS.map((c) => {
            const on = c.id === chip;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => pickChip(c.id)}
                aria-pressed={on}
                className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[13px] transition-colors ${
                  on
                    ? "bg-[var(--b-sand)] font-bold text-[var(--b-ink)]"
                    : "bg-white/[0.14] font-semibold text-[var(--b-tint)]"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* the feed — one design per viewport, vertical snap */}
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {feed === null ? (
            <div className="flex h-full items-center justify-center text-[13px] text-[var(--b-tint)]">
              Loading designs…
            </div>
          ) : feed.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
              <p className="text-[15px] text-[var(--b-tint)]">Nothing here yet</p>
              <p className="text-[13px] text-[var(--b-muted)]">Try another filter.</p>
            </div>
          ) : (
            feed.map((d) => (
              <section key={d.id} className="flex h-full snap-start flex-col">
                <ExploreCard
                  design={d}
                  liked={liked.has(d.id)}
                  saved={saved.has(d.id)}
                  onReact={(kind) => react(d, kind)}
                  onShare={() => share(d)}
                />
              </section>
            ))
          )}
        </div>

        {/* bottom bar — describes whichever design is in view */}
        {current ? (
          <div
            className="shrink-0 px-5 pt-4" data-bar
            style={{ background: "var(--b-primary-deep)", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span
                className="truncate text-[15px] font-bold text-white"
                style={{ fontFamily: "var(--f-display)" }}
              >
                {current.name}
              </span>
              <span className="shrink-0 text-[12px]" style={{ color: "color-mix(in srgb, var(--b-sand) 70%, transparent)" }}>
                {[titleise(current.category), titleise(current.community), titleise(current.country)]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>

            <div className="mt-3 flex gap-[10px]">
              <button
                type="button"
                onClick={() => router.push(`/create?design=${current.id}`)}
                className="flex-1 rounded-full bg-[var(--b-sand)] py-4 text-center text-[16px] font-bold text-[var(--b-ink)] shadow-[0_8px_22px_rgba(0,0,0,.35)] transition-transform active:scale-[0.98]"
              >
                Use template
              </button>
              <Link
                href={`/preview/${current.id}`}
                className="rounded-full border-[1.5px] border-white/40 px-5 py-[15px] text-center text-[15px] font-semibold text-white"
              >
                See end result
              </Link>
            </div>

            <div className="mt-3 flex justify-center">
              <span className="text-[11px] font-semibold tracking-[0.12em]" style={{ color: "color-mix(in srgb, var(--b-sand) 62%, transparent)" }}>
                SWIPE UP FOR NEXT ⌃
              </span>
            </div>
          </div>
        ) : null}

        {toast ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-32 flex justify-center">
            <span className="rounded-full bg-black/70 px-4 py-2 text-[13px] text-white">{toast}</span>
          </div>
        ) : null}

        {/* sign-in prompt — liking and saving need an account */}
        {needsAuth ? (
          <div
            className="absolute inset-0 z-50 flex items-end bg-black/50"
            onClick={() => setNeedsAuth(false)}
          >
            <div
              className="w-full rounded-t-2xl bg-white px-6 pt-6"
              style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
              onClick={(e) => e.stopPropagation()}
            >
              <p
                className="text-[20px] font-semibold text-[var(--b-ink)]"
                style={{ fontFamily: "var(--f-display)" }}
              >
                Save your favourites
              </p>
              <p className="mt-1 text-[14px] text-[var(--b-body)]">
                Sign in to like and save designs — they&apos;ll be waiting when you start your invite.
              </p>
              <Link
                href="/login"
                className="mt-5 block rounded-full bg-[var(--b-primary)] py-4 text-center text-[15px] font-semibold text-white"
              >
                Sign in
              </Link>
              <button
                type="button"
                onClick={() => setNeedsAuth(false)}
                className="mt-2 w-full py-3 text-center text-[14px] font-medium text-[var(--b-muted)]"
              >
                Not now
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
