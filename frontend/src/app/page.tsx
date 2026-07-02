"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { presets } from "@/templates/registry";
import { getTheme } from "@/themes";
import { getMotif } from "@/motifs";
import { api, type PublicSiteSettings } from "@/lib/api";
import { socialIcon, socialLabel } from "@/lib/social-icons";

const CATEGORIES = [
  { id: "general", label: "General" },
  { id: "kerala-christian", label: "Christian" },
  { id: "hindu", label: "Hindu" },
  { id: "muslim", label: "Muslim" },
  { id: "secular", label: "Secular" },
];

type Item = {
  key: string;
  name: string;
  community: string;
  primary: string;
  accent: string;
  gradFrom: string;
  gradTo: string;
  previewUrl?: string;
  icons: string[];
  href: string;
  previewHref: string;
};

type ChatMsg = { role: "user" | "assistant"; content: string };

/* ------------------------------------------------------------------ */
/*  Fanning invitation cards used in the hero                          */
/* ------------------------------------------------------------------ */

const SAMPLE_CARDS = [
  {
    tag: "TOGETHER WITH THEIR FAMILIES",
    names: "Amara & Dev",
    date: "12 · 09 · 2026",
    venue: "The Orchard House · Goa",
    bg: "#fbecc9",
    border: "rgba(198,141,44,.5)",
    ink: "#6b3410",
    accent: "#c98f2e",
    subtext: "#8a6a35",
    label: "#a5761f",
    button: "#d99a2b",
  },
  {
    tag: "WE'RE GETTING ENGAGED",
    names: "Noor & Zayd",
    date: "18 · 10 · 2026",
    venue: "The Glasshouse · Dubai",
    bg: "#f9dce9",
    border: "rgba(201,73,124,.4)",
    ink: "#5a1e3c",
    accent: "#c9497c",
    subtext: "#95496b",
    label: "#a53a66",
    button: "#c9497c",
  },
  {
    tag: "AN EVENING OF CELEBRATION",
    names: "Sofia & Luca",
    date: "02 · 05 · 2027",
    venue: "Villa Cimbrone · Ravello",
    bg: "#fbe0d8",
    border: "rgba(217,95,72,.45)",
    ink: "#6b2418",
    accent: "#d95f48",
    subtext: "#a05244",
    label: "#b04a36",
    button: "#d95f48",
  },
];

function FanningCards() {
  return (
    <div className="relative mx-auto h-[440px] w-[250px]">
      {SAMPLE_CARDS.map((c, i) => (
        <div
          key={c.names}
          className="absolute left-0 top-0"
          style={{
            animation: "wi-fan 12s ease-in-out infinite",
            animationDelay: `${-i * 4}s`,
            transformOrigin: "50% 120%",
          }}
        >
          <div
            className="box-border flex h-[350px] w-[250px] flex-col items-center gap-[11px] rounded-md border p-[30px_22px] shadow-[0_26px_60px_rgba(122,44,44,0.3)]"
            style={{ background: c.bg, borderColor: c.border }}
          >
            <span
              className="h-1.5 w-1.5 rotate-45"
              style={{ background: c.accent }}
            />
            <span
              className="text-[8px] font-medium tracking-[0.24em]"
              style={{ color: c.label, fontFamily: "var(--f-body)" }}
            >
              {c.tag}
            </span>
            <span
              className="text-center text-[27px] font-semibold italic leading-[1.15]"
              style={{ color: c.ink, fontFamily: "var(--f-serif)" }}
            >
              {c.names}
            </span>
            <span className="h-px w-[34px]" style={{ background: c.accent }} />
            <span
              className="text-[11px] font-normal tracking-[0.2em]"
              style={{ color: c.subtext, fontFamily: "var(--f-body)" }}
            >
              {c.date}
            </span>
            <span
              className="text-[13px] font-medium italic"
              style={{ color: c.subtext, fontFamily: "var(--f-serif)" }}
            >
              {c.venue}
            </span>
            <span className="flex-1" />
            <span
              className="rounded-full px-[18px] py-2 text-[9px] font-medium tracking-[0.22em] text-white"
              style={{ background: c.button, fontFamily: "var(--f-body)" }}
            >
              RSVP
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Floating AI assistant                                              */
/* ------------------------------------------------------------------ */

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [msgs, busy]);

  async function send(text?: string) {
    const q = (text ?? draft).trim();
    if (!q || busy) return;
    const nextMsgs: ChatMsg[] = [...msgs, { role: "user", content: q }];
    setMsgs(nextMsgs);
    setDraft("");
    setBusy(true);
    setError(null);
    try {
      const { reply } = await api.chat(nextMsgs);
      setMsgs((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      const err = e as Error & { status?: number };
      setError(
        err.status === 503
          ? "The assistant isn't switched on yet — please try again later."
          : "Sorry, I had trouble replying just now. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const suggestions = [
    "How do RSVPs work?",
    "How much does it cost?",
    "Can I add photos and music?",
  ];

  return (
    <div className="fixed bottom-7 right-7 z-50 flex flex-col items-end gap-3.5">
      {open ? (
        <div className="flex h-[min(480px,calc(100vh-130px))] w-[360px] max-w-[calc(100vw-3.5rem)] flex-col overflow-hidden rounded-2xl border border-[rgba(201,73,124,0.25)] bg-white shadow-[0_30px_80px_rgba(74,28,46,0.35)]">
          {/* header */}
          <div
            className="flex items-center gap-3 px-[18px] py-4"
            style={{ background: "linear-gradient(135deg,#d95f48,#c9497c)" }}
          >
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white/20">
              <span className="h-2 w-2 rotate-45 bg-white" />
            </span>
            <div className="flex flex-col">
              <span
                className="text-[17px] font-semibold italic text-white"
                style={{ fontFamily: "var(--f-serif)" }}
              >
                Web Invite Assistant
              </span>
              <span
                className="text-[11px] font-light tracking-[0.06em] text-white/85"
                style={{ fontFamily: "var(--f-body)" }}
              >
                Ask anything about your invitation
              </span>
            </div>
          </div>

          {/* log */}
          <div
            ref={logRef}
            className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-[#fdf4ec] p-4"
          >
            {msgs.length === 0 ? (
              <>
                <div
                  className="max-w-[85%] self-start rounded-[12px_12px_12px_4px] border border-[rgba(201,73,124,0.2)] bg-white px-3.5 py-3 text-[13.5px] font-light leading-[1.55] text-[#5a2338]"
                  style={{ fontFamily: "var(--f-body)" }}
                >
                  Hi! I can help with designs, RSVPs, pricing — anything about your invitation. What would you like to know?
                </div>
                <div className="mt-1 flex flex-col gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="self-start rounded-full border border-[rgba(201,73,124,0.4)] bg-white px-3.5 py-2 text-[12.5px] font-normal text-[#c9497c] transition-colors hover:bg-[#f9dce9]"
                      style={{ fontFamily: "var(--f-body)" }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {msgs.map((m, i) => (
              <div key={i} className="flex">
                {m.role === "user" ? (
                  <div
                    className="ml-auto max-w-[85%] rounded-[12px_12px_4px_12px] px-3.5 py-3 text-[13.5px] font-light leading-[1.55] text-white"
                    style={{
                      background: "linear-gradient(135deg,#d95f48,#c9497c)",
                      fontFamily: "var(--f-body)",
                    }}
                  >
                    {m.content}
                  </div>
                ) : (
                  <div
                    className="mr-auto max-w-[85%] whitespace-pre-wrap rounded-[12px_12px_12px_4px] border border-[rgba(201,73,124,0.2)] bg-white px-3.5 py-3 text-[13.5px] font-light leading-[1.55] text-[#5a2338]"
                    style={{ fontFamily: "var(--f-body)" }}
                  >
                    {m.content}
                  </div>
                )}
              </div>
            ))}

            {busy ? (
              <div className="flex gap-1.5 self-start rounded-[12px_12px_12px_4px] border border-[rgba(201,73,124,0.2)] bg-white px-4 py-3.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-[#c9497c]"
                    style={{
                      animation: "wi-float 1s ease-in-out infinite",
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            ) : null}

            {error ? (
              <div
                className="self-start rounded-[10px] border border-[rgba(217,95,72,0.4)] bg-[#fbe0d8] px-3.5 py-2 text-[12.5px] text-[#7a2418]"
                style={{ fontFamily: "var(--f-body)" }}
              >
                {error}
              </div>
            ) : null}
          </div>

          {/* input */}
          <div className="flex items-center gap-2.5 border-t border-[rgba(201,73,124,0.15)] bg-white p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder="Type your question…"
              className="flex-1 rounded-full border border-[rgba(90,35,56,0.2)] bg-[#fdf4ec] px-4 py-2.5 text-[13.5px] font-light text-[#5a2338] outline-none placeholder:text-[rgba(90,35,56,0.45)] focus:border-[#c9497c]"
              style={{ fontFamily: "var(--f-body)" }}
            />
            <button
              onClick={() => send()}
              disabled={busy || !draft.trim()}
              aria-label="Send message"
              className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#d95f48] text-white transition-colors hover:bg-[#c14e38] disabled:opacity-50"
            >
              <span className="ml-[2px] text-[15px] font-medium">➤</span>
            </button>
          </div>
        </div>
      ) : null}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Ask AI assistant"}
        className="flex h-[60px] w-[60px] items-center justify-center rounded-full text-white shadow-[0_14px_34px_rgba(201,73,124,0.45)] transition-transform hover:scale-105"
        style={{ background: "linear-gradient(135deg,#d95f48,#c9497c)" }}
      >
        {open ? (
          <span className="-mt-0.5 text-[26px] font-light leading-none">×</span>
        ) : (
          <span className="flex flex-col items-center gap-1">
            <span className="h-2 w-2 rotate-45 bg-white" />
            <span
              className="text-[8.5px] font-semibold tracking-[0.14em]"
              style={{ fontFamily: "var(--f-body)" }}
            >
              ASK AI
            </span>
          </span>
        )}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Landing page                                                       */
/* ------------------------------------------------------------------ */

export default function Landing() {
  const [cat, setCat] = useState("general");
  const [designs, setDesigns] = useState<any[] | null>(null);
  const [site, setSite] = useState<PublicSiteSettings | null>(null);

  useEffect(() => {
    api.listDesigns().then(setDesigns).catch(() => setDesigns([]));
    api.publicSiteSettings().then(setSite).catch(() => setSite(null));
  }, []);

  function items(): Item[] {
    const useDesigns = designs && designs.length > 0;
    if (useDesigns) {
      const pool =
        cat === "general"
          ? designs!.slice(0, 9)
          : designs!.filter((d) => d.community === cat);
      return pool.map((d) => ({
        key: d.id,
        name: d.name,
        community: d.community,
        primary: d.colors.primary,
        accent: d.colors.accent,
        gradFrom: d.colors.gradientFrom,
        gradTo: d.colors.gradientTo,
        previewUrl: d.previewUrl,
        icons: Object.values(getMotif(d.community).icons).slice(0, 4),
        href: `/create?design=${d.id}`,
        previewHref: `/preview/${d.id}`,
      }));
    }
    const pool =
      cat === "general"
        ? ["kerala-christian", "hindu", "muslim", "secular"].flatMap((c) =>
            presets.filter((p) => p.community === c).slice(0, 2),
          )
        : presets.filter((p) => p.community === cat).slice(0, 6);
    return pool.map((p) => {
      const t = getTheme(p.themeId);
      return {
        key: p.id,
        name: p.name,
        community: p.community,
        primary: t.colors.primary,
        accent: t.colors.accent,
        gradFrom: t.colors.gradientFrom,
        gradTo: t.colors.gradientTo,
        icons: Object.values(getMotif(p.motifId).icons).slice(0, 4),
        href: `/create?preset=${p.id}`,
        previewHref: `/preview/${p.id}`,
      };
    });
  }

  const list = items();

  return (
    <div className="min-h-svh bg-[#fff8f0] font-[var(--f-body)] text-[#5a2338]">
      {/* top brand ribbon */}
      <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#e3a23c,#e0705a,#c9497c,#7a5ba6)" }} />

      {/* Nav */}
      <nav className="mx-auto flex max-w-[1240px] items-center justify-between px-6 py-6 sm:px-16">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-[26px] font-semibold italic text-[#5a2338]" style={{ fontFamily: "var(--f-serif)" }}>
            Web Invite
          </span>
          <span className="h-[5px] w-[5px] rotate-45 bg-[#e0705a]" />
        </Link>
        <div className="flex items-center gap-4 text-[14px] tracking-[0.06em] text-[rgba(90,35,56,0.75)] sm:gap-8" style={{ fontFamily: "var(--f-body)" }}>
          <a href="#samples" className="hidden hover:text-[#d95f48] sm:inline">Designs</a>
          <a href="#how" className="hidden hover:text-[#d95f48] sm:inline">How it works</a>
          <a href="#pricing" className="hidden hover:text-[#d95f48] md:inline">Pricing</a>
          <Link href="/login" className="hover:text-[#d95f48]">Log in</Link>
          <Link
            href="/create"
            className="rounded-full px-5 py-2.5 text-[14px] font-medium transition hover:brightness-95"
            style={{ background: "var(--c-primary)", color: "var(--c-on-primary)" }}
          >
            Create yours
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-6 px-6 pb-8 pt-10 text-center sm:px-16 sm:pt-16">
          <div className="flex items-center gap-3 text-[11px] font-medium tracking-[0.3em] text-[#c9497c]" style={{ fontFamily: "var(--f-body)" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-[#e3a23c]" />
            <span className="text-center">WEDDINGS · ENGAGEMENTS · ANNIVERSARIES</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#e3a23c]" />
          </div>

          <h1
            className="max-w-[820px] text-balance text-[44px] font-medium italic leading-[1.06] text-[#5a2338] sm:text-[64px] lg:text-[72px]"
            style={{ fontFamily: "var(--f-serif)" }}
          >
            Your celebration, <em className="text-[#d95f48]">in full colour</em>
          </h1>

          <p
            className="max-w-[560px] text-pretty text-[16px] font-light leading-[1.65] text-[rgba(90,35,56,0.75)] sm:text-[18px]"
            style={{ fontFamily: "var(--f-body)" }}
          >
            Animated invitation pages as vivid as the day itself — your story, your music, your schedule. Share one link, gather every RSVP.
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/create"
              className="rounded-full px-9 py-4 text-[15px] font-medium tracking-[0.04em] shadow-[0_12px_30px_rgba(217,95,72,0.35)] transition hover:brightness-95"
              style={{ background: "var(--c-primary)", color: "var(--c-on-primary)" }}
            >
              Create your invitation
            </Link>
            <a
              href="#samples"
              className="rounded-full border border-[rgba(90,35,56,0.35)] px-7 py-4 text-[15px] font-normal text-[#5a2338] transition-colors hover:border-[#d95f48] hover:text-[#d95f48]"
            >
              Browse designs
            </a>
          </div>

          <p className="text-[13px] font-light tracking-[0.06em] text-[rgba(90,35,56,0.5)]" style={{ fontFamily: "var(--f-body)" }}>
            Loved by 12,000+ couples · Free to start · No app needed
          </p>
        </div>

        {/* Fanning cards + confetti */}
        <div className="relative mt-2 h-[460px]">
          {/* floating confetti dots */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {[
              { l: "20%", t: 50, s: 10, c: "#e3a23c", r: false },
              { l: "14%", t: 190, s: 8, c: "#c9497c", r: false, d: -2, dur: 5 },
              { l: "27%", t: 300, s: 6, c: "#e0705a", r: true, d: -1.4, dur: 4.2 },
              { r2: "18%", t: 70, s: 8, c: "#e0705a", r: false, d: -1 },
              { r2: "24%", t: 280, s: 7, c: "#7a5ba6", r: true, d: -2.6, dur: 5.2 },
              { r2: "13%", t: 200, s: 11, c: "#e3a23c", r: false, d: -3, dur: 5.5 },
            ].map((p, i) => (
              <span
                key={i}
                className="absolute"
                style={{
                  left: p.l,
                  right: p.r2,
                  top: p.t,
                  width: p.s,
                  height: p.s,
                  background: p.c,
                  borderRadius: p.r ? 0 : "50%",
                  transform: p.r ? "rotate(45deg)" : undefined,
                  animation: `wi-float ${p.dur ?? 4}s ease-in-out infinite`,
                  animationDelay: `${p.d ?? 0}s`,
                }}
              />
            ))}
          </div>

          <div className="absolute left-1/2 top-6 -translate-x-1/2">
            <FanningCards />
          </div>

          {/* RSVP toast */}
          <div
            className="pointer-events-none absolute left-4 bottom-14 flex items-center gap-2.5 rounded-full border border-[rgba(201,73,124,0.3)] bg-white py-2.5 pl-3 pr-4 shadow-[0_14px_34px_rgba(122,44,44,0.18)] sm:left-[10%]"
            style={{ animation: "wi-toast 8s ease-in-out infinite" }}
          >
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#c9497c] text-[12px] font-semibold text-white">P</span>
            <span className="text-[13px] font-normal text-[#5a2338]" style={{ fontFamily: "var(--f-body)" }}>
              Priya replied <strong className="font-semibold text-[#c9497c]">Yes</strong> · +2 guests
            </span>
          </div>

          {/* fade-out at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#fff8f0] to-transparent" />
        </div>
      </header>

      {/* Feature strip */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 bg-[#fbeed6] px-6 py-8 text-[12.5px] tracking-[0.14em] text-[#8a5f2a] sm:px-16" style={{ fontFamily: "var(--f-body)" }}>
        <span>LIVE RSVP TRACKING</span>
        <span className="h-1.5 w-1.5 rotate-45 bg-[#d95f48]" />
        <span>MUSIC &amp; ANIMATION</span>
        <span className="h-1.5 w-1.5 rotate-45 bg-[#c9497c]" />
        <span>GUEST MESSAGES</span>
        <span className="h-1.5 w-1.5 rotate-45 bg-[#7a5ba6]" />
        <span>EVERY LANGUAGE</span>
      </div>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-[1140px] px-6 pb-16 pt-20 sm:px-16 sm:pb-20 sm:pt-24">
        <div className="mb-12 flex flex-col items-center gap-3 text-center">
          <span className="text-[11px] font-medium tracking-[0.28em] text-[#c9497c]" style={{ fontFamily: "var(--f-body)" }}>
            HOW IT WORKS
          </span>
          <h2 className="text-[34px] font-medium italic text-[#5a2338] sm:text-[44px]" style={{ fontFamily: "var(--f-serif)" }}>
            Three steps to “you’re invited”
          </h2>
        </div>

        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              n: 1,
              title: "Choose a design",
              body:
                "180+ animated designs for every ceremony, culture and style — from garden pastels to grand marigold.",
              bg: "#fbecc9",
              border: "rgba(227,162,60,0.35)",
              ink: "#a5761f",
            },
            {
              n: 2,
              title: "Make it yours",
              body:
                "Names, story, photos, music, schedule, maps, dress code — every detail is editable in minutes.",
              bg: "#fbe0d8",
              border: "rgba(217,95,72,0.35)",
              ink: "#b04a36",
            },
            {
              n: 3,
              title: "Share & track RSVPs",
              body:
                "One link for WhatsApp or email. Watch replies, meal choices and messages land the moment they’re sent.",
              bg: "#f9dce9",
              border: "rgba(201,73,124,0.35)",
              ink: "#a53a66",
            },
          ].map((c) => (
            <div
              key={c.n}
              className="flex flex-col gap-3.5 rounded-xl border bg-white p-8"
              style={{ borderColor: c.border }}
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full text-[22px] font-semibold italic"
                style={{ background: c.bg, color: c.ink, fontFamily: "var(--f-serif)" }}
              >
                {c.n}
              </span>
              <span className="text-[17px] font-medium text-[#5a2338]" style={{ fontFamily: "var(--f-body)" }}>
                {c.title}
              </span>
              <p className="text-[14.5px] font-light leading-[1.65] text-[rgba(90,35,56,0.7)]" style={{ fontFamily: "var(--f-body)" }}>
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Live RSVP demo */}
      <section className="mx-auto max-w-[1140px] px-6 pb-20 sm:grid sm:grid-cols-2 sm:items-center sm:gap-16 sm:px-16">
        <div className="flex flex-col gap-3.5 rounded-2xl border border-[rgba(201,73,124,0.25)] bg-white p-7 shadow-[0_20px_50px_rgba(122,44,44,0.08)]">
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] font-medium tracking-[0.18em] text-[rgba(90,35,56,0.55)]" style={{ fontFamily: "var(--f-body)" }}>
              GUEST LIST
            </span>
            <span className="text-[16px] font-medium italic text-[#c9497c]" style={{ fontFamily: "var(--f-serif)" }}>
              86 of 120 replied
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#f9dce9]">
            <span className="block h-full w-[72%]" style={{ background: "linear-gradient(90deg,#e3a23c,#d95f48,#c9497c)" }} />
          </div>
          {[
            { name: "Priya & family", status: "YES · 3", color: "#5c8a5e" },
            { name: "Uncle Tariq", status: "YES · 1", color: "#5c8a5e" },
            { name: "The Fernandes", status: "CAN'T MAKE IT", color: "#c96a55" },
          ].map((r) => (
            <div key={r.name} className="flex items-center justify-between rounded-lg bg-[#fdf4ec] px-4 py-3">
              <span className="text-[14px] text-[#5a2338]" style={{ fontFamily: "var(--f-body)" }}>{r.name}</span>
              <span className="text-[11px] font-medium tracking-[0.1em]" style={{ color: r.color, fontFamily: "var(--f-body)" }}>{r.status}</span>
            </div>
          ))}
          <div className="flex items-center gap-2.5 rounded-lg bg-[#f9dce9] px-4 py-3">
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#c9497c] text-[10px] font-semibold text-white">M</span>
            <span className="text-[14px] font-medium italic text-[#5a2338]" style={{ fontFamily: "var(--f-serif)" }}>
              “Counting the days! ❤” — Maya
            </span>
          </div>
        </div>

        <div className="mt-10 flex max-w-[440px] flex-col gap-4 sm:mt-0">
          <span className="text-[11px] font-medium tracking-[0.28em] text-[#d95f48]" style={{ fontFamily: "var(--f-body)" }}>
            LIVE RSVP
          </span>
          <h2 className="text-[34px] font-medium italic leading-[1.15] text-[#5a2338] sm:text-[42px]" style={{ fontFamily: "var(--f-serif)" }}>
            Never chase a reply again
          </h2>
          <p className="text-pretty text-[16px] font-light leading-[1.7] text-[rgba(90,35,56,0.72)]" style={{ fontFamily: "var(--f-body)" }}>
            Guests reply in one tap — attendance, plus-ones, meal choices, little notes. Your dashboard updates live, and gentle reminders go out for you before the big day.
          </p>
          <Link
            href="/dashboard"
            className="mt-1 self-start rounded-full border border-[rgba(217,95,72,0.5)] px-6 py-3 text-[13px] font-medium tracking-[0.06em] text-[#d95f48] transition-colors hover:bg-[#fbe0d8]"
            style={{ fontFamily: "var(--f-body)" }}
          >
            See the dashboard →
          </Link>
        </div>
      </section>

      {/* Customization */}
      <section className="bg-[#fdf1e2]">
        <div className="mx-auto max-w-[1140px] px-6 py-20 sm:grid sm:grid-cols-2 sm:items-center sm:gap-16 sm:px-16 sm:py-24">
          <div className="flex max-w-[440px] flex-col gap-4">
            <span className="text-[11px] font-medium tracking-[0.28em] text-[#c98f2e]" style={{ fontFamily: "var(--f-body)" }}>
              FULL CUSTOMIZATION
            </span>
            <h2 className="text-[34px] font-medium italic leading-[1.15] text-[#5a2338] sm:text-[42px]" style={{ fontFamily: "var(--f-serif)" }}>
              Every detail, yours
            </h2>
            <p className="text-pretty text-[16px] font-light leading-[1.7] text-[rgba(90,35,56,0.72)]" style={{ fontFamily: "var(--f-body)" }}>
              Colours, typefaces, photos, music, schedule, dress code, maps — change anything. Your invitation, not a template with your names on it.
            </p>
          </div>

          <div className="mt-10 flex flex-col gap-5 rounded-2xl border border-[rgba(198,141,44,0.3)] bg-white p-7 shadow-[0_20px_50px_rgba(122,44,44,0.08)] sm:mt-0">
            <div className="flex flex-col gap-2.5">
              <span className="text-[11px] font-medium tracking-[0.18em] text-[rgba(90,35,56,0.55)]" style={{ fontFamily: "var(--f-body)" }}>
                PALETTE
              </span>
              <div className="flex gap-2.5">
                {[
                  { c: "#e3a23c", ring: true },
                  { c: "#e0705a" },
                  { c: "#c9497c" },
                  { c: "#7a5ba6" },
                  { c: "#5c8a5e" },
                ].map((s, i) => (
                  <span
                    key={i}
                    className="h-8 w-8 rounded-full"
                    style={{ background: s.c, border: s.ring ? "2px solid #5a2338" : undefined }}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-[11px] font-medium tracking-[0.18em] text-[rgba(90,35,56,0.55)]" style={{ fontFamily: "var(--f-body)" }}>
                TYPEFACE
              </span>
              <div className="flex flex-wrap gap-2.5">
                <span
                  className="rounded-lg border-[1.5px] border-[#d95f48] bg-[#fbe0d8] px-4 py-2 text-[15px] font-medium italic text-[#5a2338]"
                  style={{ fontFamily: "var(--f-serif)" }}
                >
                  Cormorant
                </span>
                <span
                  className="rounded-lg border border-[rgba(90,35,56,0.2)] px-4 py-2 text-[13px] text-[rgba(90,35,56,0.75)]"
                  style={{ fontFamily: "var(--f-body)" }}
                >
                  Jost
                </span>
                <span
                  className="rounded-lg border border-[rgba(90,35,56,0.2)] px-4 py-2 text-[13px] text-[rgba(90,35,56,0.75)]"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  Georgia
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-[11px] font-medium tracking-[0.18em] text-[rgba(90,35,56,0.55)]" style={{ fontFamily: "var(--f-body)" }}>
                MUSIC
              </span>
              <div className="flex items-center gap-3 rounded-lg bg-[#fdf4ec] px-4 py-3">
                <span className="h-2 w-2 rounded-full bg-[#d95f48]" style={{ animation: "wi-float 2s ease-in-out infinite" }} />
                <span className="text-[14px] text-[#5a2338]" style={{ fontFamily: "var(--f-body)" }}>
                  Kun Faya Kun — instrumental
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Design gallery — retained functional grid */}
      <section id="samples" className="mx-auto max-w-[1140px] px-6 py-20 sm:px-16 sm:py-24">
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <span className="text-[11px] font-medium tracking-[0.28em] text-[#c9497c]" style={{ fontFamily: "var(--f-body)" }}>
            SEE A SAMPLE
          </span>
          <h2 className="text-[34px] font-medium italic text-[#5a2338] sm:text-[44px]" style={{ fontFamily: "var(--f-serif)" }}>
            Which style speaks to you?
          </h2>
          <p className="max-w-[520px] text-pretty text-[15.5px] font-light text-[rgba(90,35,56,0.7)]" style={{ fontFamily: "var(--f-body)" }}>
            Pick a category to preview live samples. Everything you see is editable once you pick one.
          </p>
        </div>

        <div className="mb-10 flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((c) => {
            const on = cat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className="rounded-full border px-5 py-2 text-[12px] font-medium tracking-[0.16em] transition-colors"
                style={{
                  background: on ? "#d95f48" : "#fff",
                  color: on ? "#fff" : "#5a2338",
                  borderColor: on ? "#d95f48" : "rgba(90,35,56,0.2)",
                  fontFamily: "var(--f-body)",
                }}
              >
                {c.label.toUpperCase()}
              </button>
            );
          })}
        </div>

        {designs === null ? (
          <p className="mt-8 text-center text-[rgba(90,35,56,0.5)]" style={{ fontFamily: "var(--f-body)" }}>
            Loading designs…
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((it) => (
              <div
                key={it.key}
                className="group overflow-hidden rounded-2xl border border-[rgba(201,73,124,0.15)] bg-white shadow-[0_10px_30px_rgba(122,44,44,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(122,44,44,0.14)]"
              >
                <div
                  className="relative h-48 bg-cover bg-center"
                  style={
                    it.previewUrl
                      ? { backgroundImage: `url(${it.previewUrl})` }
                      : { background: `linear-gradient(135deg, ${it.gradFrom}, ${it.gradTo})` }
                  }
                >
                  {!it.previewUrl ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[46px] font-semibold italic" style={{ color: it.primary, fontFamily: "var(--f-serif)" }}>
                        S &amp; L
                      </span>
                      <span className="mt-1 text-[10px] tracking-[0.2em]" style={{ color: it.accent, fontFamily: "var(--f-body)" }}>
                        {it.icons.join("  ")}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1 p-5">
                  <p className="text-[15px] font-medium text-[#5a2338]" style={{ fontFamily: "var(--f-body)" }}>
                    {it.name}
                  </p>
                  <p className="text-[13px] text-[rgba(90,35,56,0.55)]" style={{ fontFamily: "var(--f-body)" }}>
                    {getMotif(it.community).name}
                  </p>
                  <div className="mt-3 flex items-center gap-2.5">
                    <Link
                      href={it.previewHref}
                      className="rounded-full border border-[rgba(90,35,56,0.2)] px-3.5 py-1.5 text-[11px] font-medium tracking-[0.14em] text-[#c98f2e] transition-colors hover:border-[#e3a23c] hover:bg-[#fbecc9]"
                      style={{ fontFamily: "var(--f-body)" }}
                    >
                      PREVIEW
                    </Link>
                    <Link
                      href={it.href}
                      className="rounded-full bg-[#d95f48] px-3.5 py-1.5 text-[11px] font-medium tracking-[0.14em] text-white transition-colors hover:bg-[#c14e38]"
                      style={{ fontFamily: "var(--f-body)" }}
                    >
                      USE THIS →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            {list.length === 0 ? (
              <p className="col-span-full text-center text-[rgba(90,35,56,0.5)]" style={{ fontFamily: "var(--f-body)" }}>
                No designs in this category yet.
              </p>
            ) : null}
          </div>
        )}

        <p className="mt-10 text-center">
          <Link href="/gallery" className="text-[14px] text-[#c9497c] hover:text-[#5a2338] hover:underline" style={{ fontFamily: "var(--f-body)" }}>
            Browse all designs →
          </Link>
        </p>
      </section>

      {/* Testimonial */}
      <section className="bg-[#5a2338] px-6 py-20 text-center sm:px-16">
        <p
          className="mx-auto max-w-[720px] text-balance text-[24px] font-medium italic leading-[1.4] text-[#fbecc9] sm:text-[32px]"
          style={{ fontFamily: "var(--f-serif)" }}
        >
          “Guests kept the link open all evening. Half our RSVPs arrived before dinner.”
        </p>
        <span className="mt-4 inline-block text-[12px] tracking-[0.22em] text-[#e3a23c]" style={{ fontFamily: "var(--f-body)" }}>
          RHEA &amp; KABIR — MARRIED APRIL 2026
        </span>
      </section>

      {/* Final CTA */}
      <section id="pricing" className="flex flex-col items-center gap-6 px-6 pb-16 pt-24 text-center sm:px-16">
        <h2 className="text-[38px] font-medium italic text-[#5a2338] sm:text-[52px]" style={{ fontFamily: "var(--f-serif)" }}>
          Begin your invitation
        </h2>
        <p className="text-[16px] font-light text-[rgba(90,35,56,0.65)]" style={{ fontFamily: "var(--f-body)" }}>
          Free to start — pay only when you’re ready to share.
        </p>
        <Link
          href="/create"
          className="rounded-full px-10 py-4 text-[15px] font-medium tracking-[0.04em] shadow-[0_12px_30px_rgba(217,95,72,0.35)] transition hover:brightness-95"
          style={{ background: "var(--c-primary)", color: "var(--c-on-primary)" }}
        >
          Start free
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-[#4a1c2e] text-[#fbecc9]">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-6 py-16 sm:grid-cols-2 sm:px-16 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex max-w-[300px] flex-col gap-4">
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-semibold italic text-[#fbecc9]" style={{ fontFamily: "var(--f-serif)" }}>
                Web Invite
              </span>
              <span className="h-[5px] w-[5px] rotate-45 bg-[#e3a23c]" />
            </div>
            <p className="text-pretty text-[14px] font-light leading-[1.7] text-[rgba(251,236,201,0.65)]" style={{ fontFamily: "var(--f-body)" }}>
              Animated invitation pages for weddings, engagements and anniversaries — with RSVPs built in.
            </p>
          </div>

          {[
            { title: "DESIGNS", links: [["Weddings", "/gallery"], ["Engagements", "/gallery"], ["Anniversaries", "/gallery"], ["All designs", "/gallery"]] },
            { title: "COMPANY", links: [["About", "/p/about"], ["Pricing", "/p/pricing"], ["Blog", "/blog"], ["Contact", "/contact"]] },
            { title: "SUPPORT", links: [["Help centre", "/p/help"], ["FAQ", "/p/faq"], ["Privacy", "/p/privacy"], ["Terms", "/p/terms"]] },
          ].map((col) => (
            <div key={col.title} className="flex flex-col gap-3.5">
              <span className="text-[11px] font-medium tracking-[0.24em] text-[#e3a23c]" style={{ fontFamily: "var(--f-body)" }}>
                {col.title}
              </span>
              <div className="flex flex-col gap-2.5">
                {col.links.map(([label, href]) => (
                  <Link
                    key={label}
                    href={href}
                    className="text-[14px] font-light text-[rgba(251,236,201,0.75)] transition-colors hover:text-white"
                    style={{ fontFamily: "var(--f-body)" }}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[rgba(251,236,201,0.15)]">
          <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-6 py-5 sm:px-16">
            <span className="text-[12.5px] font-light text-[rgba(251,236,201,0.5)]" style={{ fontFamily: "var(--f-body)" }}>
              {site?.social.copyrightText?.trim() || `© ${new Date().getFullYear()} ${site?.branding.brandName || "Web Invite"} · All rights reserved`}
            </span>
            {(site?.social.links || []).filter((l) => l.url).length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {site!.social.links.filter((l) => l.url).map((l) => (
                  <a
                    key={l.platform + l.url}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={socialLabel(l.platform)}
                    title={socialLabel(l.platform)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(251,236,201,0.2)] text-[rgba(251,236,201,0.7)] transition-colors hover:border-[#e3a23c] hover:text-[#e3a23c]"
                  >
                    {socialIcon(l.platform, "h-4 w-4")}
                  </a>
                ))}
              </div>
            ) : (
              <span className="text-[14px] font-medium italic text-[rgba(251,236,201,0.6)]" style={{ fontFamily: "var(--f-serif)" }}>
                {site?.hero.tagline || "Made for the best day of your life"}
              </span>
            )}
          </div>
          {site?.social.footerMessage?.trim() ? (
            <div className="mx-auto max-w-[1240px] px-6 pb-6 sm:px-16">
              <p className="text-[13px] font-light leading-[1.65] text-[rgba(251,236,201,0.55)]" style={{ fontFamily: "var(--f-body)" }}>
                {site.social.footerMessage}
              </p>
            </div>
          ) : null}
        </div>
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#e3a23c,#e0705a,#c9497c,#7a5ba6)" }} />
      </footer>

      {/* Floating AI assistant */}
      <ChatWidget />
    </div>
  );
}
