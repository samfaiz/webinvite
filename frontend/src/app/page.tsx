"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, type PublicSiteSettings } from "@/lib/api";
import { socialIcon, socialLabel } from "@/lib/social-icons";
import { LandingTop } from "@/components/landing/LandingTop";





type ChatMsg = { role: "user" | "assistant"; content: string };

/* ------------------------------------------------------------------ */
/*  Fanning invitation cards used in the hero                          */
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
        <div className="flex h-[min(480px,calc(100vh-130px))] w-[360px] max-w-[calc(100vw-3.5rem)] flex-col overflow-hidden rounded-2xl border border-[rgba(111,138,184,0.25)] bg-white shadow-[0_30px_80px_rgba(74,28,46,0.35)]">
          {/* header */}
          <div
            className="flex items-center gap-3 px-[18px] py-4"
            style={{ background: "linear-gradient(135deg,var(--b-primary),var(--b-gold-deep))" }}
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
            className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-[#eef2f8] p-4"
          >
            {msgs.length === 0 ? (
              <>
                <div
                  className="max-w-[85%] self-start rounded-[12px_12px_12px_4px] border border-[rgba(111,138,184,0.2)] bg-white px-3.5 py-3 text-[13.5px] font-light leading-[1.55] text-[var(--b-ink)]"
                  style={{ fontFamily: "var(--f-body)" }}
                >
                  Hi! I can help with designs, RSVPs, pricing — anything about your invitation. What would you like to know?
                </div>
                <div className="mt-1 flex flex-col gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="self-start rounded-full border border-[rgba(111,138,184,0.4)] bg-white px-3.5 py-2 text-[12.5px] font-normal text-[var(--b-gold)] transition-colors hover:bg-[#f9dce9]"
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
                      background: "linear-gradient(135deg,var(--b-primary),var(--b-gold-deep))",
                      fontFamily: "var(--f-body)",
                    }}
                  >
                    {m.content}
                  </div>
                ) : (
                  <div
                    className="mr-auto max-w-[85%] whitespace-pre-wrap rounded-[12px_12px_12px_4px] border border-[rgba(111,138,184,0.2)] bg-white px-3.5 py-3 text-[13.5px] font-light leading-[1.55] text-[var(--b-ink)]"
                    style={{ fontFamily: "var(--f-body)" }}
                  >
                    {m.content}
                  </div>
                )}
              </div>
            ))}

            {busy ? (
              <div className="flex gap-1.5 self-start rounded-[12px_12px_12px_4px] border border-[rgba(111,138,184,0.2)] bg-white px-4 py-3.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-[var(--b-gold)]"
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
                className="self-start rounded-[10px] border border-[rgba(43,27,18,0.4)] bg-[#e3eaf5] px-3.5 py-2 text-[12.5px] text-[#7a2418]"
                style={{ fontFamily: "var(--f-body)" }}
              >
                {error}
              </div>
            ) : null}
          </div>

          {/* input */}
          <div className="flex items-center gap-2.5 border-t border-[rgba(111,138,184,0.15)] bg-white p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder="Type your question…"
              className="flex-1 rounded-full border border-[rgba(43,27,18,0.2)] bg-[#eef2f8] px-4 py-2.5 text-[13.5px] font-light text-[var(--b-ink)] outline-none placeholder:text-[rgba(43,27,18,0.45)] focus:border-[var(--b-gold)]"
              style={{ fontFamily: "var(--f-body)" }}
            />
            <button
              onClick={() => send()}
              disabled={busy || !draft.trim()}
              aria-label="Send message"
              className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[var(--b-ink)] text-white transition-colors hover:bg-[#22305a] disabled:opacity-50"
            >
              <span className="ml-[2px] text-[15px] font-medium">➤</span>
            </button>
          </div>
        </div>
      ) : null}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Ask AI assistant"}
        className="flex h-[60px] w-[60px] items-center justify-center rounded-full text-white shadow-[0_14px_34px_rgba(111,138,184,0.45)] transition-transform hover:scale-105"
        style={{ background: "linear-gradient(135deg,var(--b-primary),var(--b-gold-deep))" }}
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
  const [site, setSite] = useState<PublicSiteSettings | null>(null);

  useEffect(() => {
    api.publicSiteSettings().then(setSite).catch(() => setSite(null));
  }, []);

  return (
    <div className="min-h-svh" style={{ background: "var(--b-bg)", fontFamily: "var(--f-brand)", color: "var(--b-body)" }}>
      <LandingTop />

      {/* How it works */}
      <section id="how" className="mx-auto max-w-[1240px] px-6 pb-16 pt-20 sm:px-16 sm:pb-20 sm:pt-24">
        <div className="mb-12 flex flex-col items-center gap-3 text-center">
          <span className="text-[11px] font-medium tracking-[0.28em] text-[var(--b-gold)]" style={{ fontFamily: "var(--f-body)" }}>
            HOW IT WORKS
          </span>
          <h2 className="text-[34px] font-medium italic text-[var(--b-ink)] sm:text-[44px]" style={{ fontFamily: "var(--f-serif)" }}>
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
              bg: "var(--b-tint)",
              border: "rgba(227,162,60,0.35)",
              ink: "#a5761f",
            },
            {
              n: 2,
              title: "Make it yours",
              body:
                "Names, story, photos, music, schedule, maps, dress code — every detail is editable in minutes.",
              bg: "#e3eaf5",
              border: "rgba(43,27,18,0.35)",
              ink: "#b04a36",
            },
            {
              n: 3,
              title: "Share & track RSVPs",
              body:
                "One link for WhatsApp or email. Watch replies, meal choices and messages land the moment they’re sent.",
              bg: "#f9dce9",
              border: "rgba(111,138,184,0.35)",
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
              <span className="text-[17px] font-medium text-[var(--b-ink)]" style={{ fontFamily: "var(--f-body)" }}>
                {c.title}
              </span>
              <p className="text-[14.5px] font-light leading-[1.65] text-[rgba(43,27,18,0.7)]" style={{ fontFamily: "var(--f-body)" }}>
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Live RSVP demo */}
      <section className="mx-auto max-w-[1240px] px-6 pb-20 sm:grid sm:grid-cols-2 sm:items-center sm:gap-16 sm:px-16">
        <div className="flex flex-col gap-3.5 rounded-2xl border border-[rgba(111,138,184,0.25)] bg-white p-7 shadow-[0_20px_50px_rgba(43,27,18,0.08)]">
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] font-medium tracking-[0.18em] text-[rgba(43,27,18,0.55)]" style={{ fontFamily: "var(--f-body)" }}>
              GUEST LIST
            </span>
            <span className="text-[16px] font-medium italic text-[var(--b-gold)]" style={{ fontFamily: "var(--f-serif)" }}>
              86 of 120 replied
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#f9dce9]">
            <span className="block h-full w-[72%]" style={{ background: "linear-gradient(90deg,var(--b-gold),var(--b-primary),var(--b-gold-deep))" }} />
          </div>
          {[
            { name: "Priya & family", status: "YES · 3", color: "#5c8a5e" },
            { name: "Uncle Tariq", status: "YES · 1", color: "#5c8a5e" },
            { name: "The Fernandes", status: "CAN'T MAKE IT", color: "#c96a55" },
          ].map((r) => (
            <div key={r.name} className="flex items-center justify-between rounded-lg bg-[#eef2f8] px-4 py-3">
              <span className="text-[14px] text-[var(--b-ink)]" style={{ fontFamily: "var(--f-body)" }}>{r.name}</span>
              <span className="text-[11px] font-medium tracking-[0.1em]" style={{ color: r.color, fontFamily: "var(--f-body)" }}>{r.status}</span>
            </div>
          ))}
          <div className="flex items-center gap-2.5 rounded-lg bg-[#f9dce9] px-4 py-3">
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[var(--b-gold)] text-[10px] font-semibold text-white">M</span>
            <span className="text-[14px] font-medium italic text-[var(--b-ink)]" style={{ fontFamily: "var(--f-serif)" }}>
              “Counting the days! ❤” — Maya
            </span>
          </div>
        </div>

        <div className="mt-10 flex max-w-[440px] flex-col gap-4 sm:mt-0">
          <span className="text-[11px] font-medium tracking-[0.28em] text-[var(--b-ink)]" style={{ fontFamily: "var(--f-body)" }}>
            LIVE RSVP
          </span>
          <h2 className="text-[34px] font-medium italic leading-[1.15] text-[var(--b-ink)] sm:text-[42px]" style={{ fontFamily: "var(--f-serif)" }}>
            Never chase a reply again
          </h2>
          <p className="text-pretty text-[16px] font-light leading-[1.7] text-[rgba(43,27,18,0.72)]" style={{ fontFamily: "var(--f-body)" }}>
            Guests reply in one tap — attendance, plus-ones, meal choices, little notes. Your dashboard updates live, and gentle reminders go out for you before the big day.
          </p>
          <Link
            href="/dashboard"
            className="mt-1 self-start rounded-full border border-[rgba(43,27,18,0.5)] px-6 py-3 text-[13px] font-medium tracking-[0.06em] text-[var(--b-ink)] transition-colors hover:bg-[#e3eaf5]"
            style={{ fontFamily: "var(--f-body)" }}
          >
            See the dashboard →
          </Link>
        </div>
      </section>

      {/* Customization */}
      <section className="bg-[var(--b-tint)]">
        <div className="mx-auto max-w-[1240px] px-6 py-20 sm:grid sm:grid-cols-2 sm:items-center sm:gap-16 sm:px-16 sm:py-24">
          <div className="flex max-w-[440px] flex-col gap-4">
            <span className="text-[11px] font-medium tracking-[0.28em] text-[var(--b-gold)]" style={{ fontFamily: "var(--f-body)" }}>
              FULL CUSTOMIZATION
            </span>
            <h2 className="text-[34px] font-medium italic leading-[1.15] text-[var(--b-ink)] sm:text-[42px]" style={{ fontFamily: "var(--f-serif)" }}>
              Every detail, yours
            </h2>
            <p className="text-pretty text-[16px] font-light leading-[1.7] text-[rgba(43,27,18,0.72)]" style={{ fontFamily: "var(--f-body)" }}>
              Colours, typefaces, photos, music, schedule, dress code, maps — change anything. Your invitation, not a template with your names on it.
            </p>
          </div>

          <div className="mt-10 flex flex-col gap-5 rounded-2xl border border-[rgba(198,141,44,0.3)] bg-white p-7 shadow-[0_20px_50px_rgba(43,27,18,0.08)] sm:mt-0">
            <div className="flex flex-col gap-2.5">
              <span className="text-[11px] font-medium tracking-[0.18em] text-[rgba(43,27,18,0.55)]" style={{ fontFamily: "var(--f-body)" }}>
                PALETTE
              </span>
              <div className="flex gap-2.5">
                {[
                  { c: "var(--b-gold)", ring: true },
                  { c: "var(--b-gold)" },
                  { c: "var(--b-gold)" },
                  { c: "var(--b-gold-deep)" },
                  { c: "#5c8a5e" },
                ].map((s, i) => (
                  <span
                    key={i}
                    className="h-8 w-8 rounded-full"
                    style={{ background: s.c, border: s.ring ? "2px solid var(--b-primary)" : undefined }}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-[11px] font-medium tracking-[0.18em] text-[rgba(43,27,18,0.55)]" style={{ fontFamily: "var(--f-body)" }}>
                TYPEFACE
              </span>
              <div className="flex flex-wrap gap-2.5">
                <span
                  className="rounded-lg border-[1.5px] border-[var(--b-ink)] bg-[#e3eaf5] px-4 py-2 text-[15px] font-medium italic text-[var(--b-ink)]"
                  style={{ fontFamily: "var(--f-serif)" }}
                >
                  Cormorant
                </span>
                <span
                  className="rounded-lg border border-[rgba(43,27,18,0.2)] px-4 py-2 text-[13px] text-[rgba(43,27,18,0.75)]"
                  style={{ fontFamily: "var(--f-body)" }}
                >
                  Jost
                </span>
                <span
                  className="rounded-lg border border-[rgba(43,27,18,0.2)] px-4 py-2 text-[13px] text-[rgba(43,27,18,0.75)]"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  Georgia
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-[11px] font-medium tracking-[0.18em] text-[rgba(43,27,18,0.55)]" style={{ fontFamily: "var(--f-body)" }}>
                MUSIC
              </span>
              <div className="flex items-center gap-3 rounded-lg bg-[#eef2f8] px-4 py-3">
                <span className="h-2 w-2 rounded-full bg-[var(--b-ink)]" style={{ animation: "wi-float 2s ease-in-out infinite" }} />
                <span className="text-[14px] text-[var(--b-ink)]" style={{ fontFamily: "var(--f-body)" }}>
                  Kun Faya Kun — instrumental
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Testimonial */}
      <section className="bg-[var(--b-ink)] px-6 py-20 text-center sm:px-16">
        <p
          className="mx-auto max-w-[720px] text-balance text-[24px] font-medium italic leading-[1.4] text-[var(--b-tint)] sm:text-[32px]"
          style={{ fontFamily: "var(--f-serif)" }}
        >
          “Guests kept the link open all evening. Half our RSVPs arrived before dinner.”
        </p>
        <span className="mt-4 inline-block text-[12px] tracking-[0.22em] text-[var(--b-gold)]" style={{ fontFamily: "var(--f-body)" }}>
          RHEA &amp; KABIR — MARRIED APRIL 2026
        </span>
      </section>

      {/* Final CTA */}
      <section id="pricing" className="flex flex-col items-center gap-6 px-6 pb-16 pt-24 text-center sm:px-16">
        <h2 className="text-[38px] font-medium italic text-[var(--b-ink)] sm:text-[52px]" style={{ fontFamily: "var(--f-serif)" }}>
          Begin your invitation
        </h2>
        <p className="text-[16px] font-light text-[rgba(43,27,18,0.65)]" style={{ fontFamily: "var(--f-body)" }}>
          Free to start — pay only when you’re ready to share.
        </p>
        <Link
          href="/create"
          className="rounded-full px-10 py-4 text-[15px] font-medium tracking-[0.04em] shadow-[0_12px_30px_rgba(43,27,18,0.35)] transition hover:brightness-95"
          style={{ background: "var(--b-primary)", color: "var(--b-bg)" }}
        >
          Start free
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--b-ink)] text-[var(--b-tint)]">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-6 py-16 sm:grid-cols-2 sm:px-16 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex max-w-[300px] flex-col gap-4">
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-semibold italic text-[var(--b-tint)]" style={{ fontFamily: "var(--f-serif)" }}>
                Web Invite
              </span>
              <span className="h-[5px] w-[5px] rotate-45 bg-[var(--b-gold)]" />
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
              <span className="text-[11px] font-medium tracking-[0.24em] text-[var(--b-gold)]" style={{ fontFamily: "var(--f-body)" }}>
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
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(251,236,201,0.2)] text-[rgba(251,236,201,0.7)] transition-colors hover:border-[var(--b-gold)] hover:text-[var(--b-gold)]"
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
        <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,var(--b-gold),var(--b-primary),var(--b-primary),var(--b-gold-deep))" }} />
      </footer>

      {/* Floating AI assistant */}
      <ChatWidget />
    </div>
  );
}
