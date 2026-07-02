"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  api,
  type IntegrationsStatus,
  type IntegrationsUpdate,
  type SeoAlgorithm,
  type SeoAlgorithmFrequency,
  type SeoAlgorithmInput,
  type SeoAlgorithmVersion,
  type SiteBranding,
  type SiteContact,
  type SiteHero,
  type SiteSeo,
  type SiteSettings,
  type SiteSocial,
  type SiteTheme,
  type SocialLink,
} from "@/lib/api";
import { FONT_CATALOG, FONT_DEFAULT, type FontRole } from "@/lib/theme-catalog";

/**
 * `/admin/site-settings/edit` — tabbed form for the singleton site settings.
 * Only the Branding tab is wired for now; the other tabs render an "in
 * progress" hint and are safe to click without side effects.
 */

const TABS = [
  { id: "branding", label: "Branding", icon: "img" },
  { id: "hero", label: "Hero & messaging", icon: "spark" },
  { id: "contact", label: "Contact", icon: "mail" },
  { id: "location", label: "Location", icon: "pin" },
  { id: "social", label: "Social & footer", icon: "share" },
  { id: "theme", label: "Theme", icon: "paint" },
  { id: "seo", label: "SEO & analytics", icon: "chart" },
  { id: "algo", label: "SEO Algorithm", icon: "flask" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function EditSiteSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<TabId>("branding");
  const [data, setData] = useState<SiteSettings | null>(null);
  const [branding, setBranding] = useState<SiteBranding>({ brandName: "", logo: "", logoDark: "", favicon: "" });
  const [hero, setHero] = useState<SiteHero>({
    tagline: "",
    heroHeadline: "",
    heroSubheadline: "",
    valueProposition: "",
    mission: "",
    primaryCtaLabel: "",
    primaryCtaUrl: "",
  });
  const [contact, setContact] = useState<SiteContact>({
    contactEmail: "",
    careersEmail: "",
    phone: "",
    responseTime: "",
    address: "",
    officeHours: "",
    calendarUrl: "",
  });
  const [social, setSocial] = useState<SiteSocial>({
    links: [],
    footerMessage: "",
    copyrightText: "",
  });
  const [theme, setTheme] = useState<SiteTheme>({
    accent: "",
    accentSoft: "",
    textOnAccent: "",
    accentDark: "",
    accentSoftDark: "",
    textOnAccentDark: "",
    fontHeadings: "",
    fontBody: "",
    fontMono: "",
  });
  const [seo, setSeo] = useState<SiteSeo>({
    metaTitle: "",
    metaDescription: "",
    ogImage: "",
    keywords: [],
    metaPixelId: "",
    orgSchemaType: "",
    orgFoundedYear: "",
  });
  const [integrations, setIntegrations] = useState<IntegrationsStatus | null>(null);
  // Accumulates unsaved changes to integrations (AI + GA). Flushed alongside
  // siteSettings on Save so the SEO tab can be a single click.
  const [intPatch, setIntPatch] = useState<IntegrationsUpdate>({});

  // SEO Algorithm — loaded lazily the first time the Algo tab opens so the
  // main site-settings load isn't slowed by two extra queries + a possible
  // AI-improve draft download.
  const [algo, setAlgo] = useState<SeoAlgorithm | null>(null);
  const [algoPatch, setAlgoPatch] = useState<SeoAlgorithmInput>({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) return void router.push("/login");
    if (user.role !== "admin") return void router.push("/dashboard");
    Promise.all([api.getSiteSettings(), api.getIntegrations()])
      .then(([d, i]) => {
        setData(d);
        setBranding(d.branding);
        setHero(d.hero);
        setContact(d.contact);
        setSocial(d.social);
        setTheme(d.theme);
        setSeo(d.seo);
        setIntegrations(i);
      })
      .catch((e) => setError((e as Error).message));
  }, [loading, user, router]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const [next, nextInt, nextAlgo] = await Promise.all([
        api.saveSiteSettings({ branding, hero, contact, social, theme, seo }),
        Object.keys(intPatch).length > 0
          ? api.saveIntegrations(intPatch)
          : Promise.resolve(integrations as IntegrationsStatus),
        Object.keys(algoPatch).length > 0
          ? api.saveSeoAlgorithm(algoPatch)
          : Promise.resolve(algo),
      ]);
      setData(next);
      setBranding(next.branding);
      setHero(next.hero);
      setContact(next.contact);
      setSocial(next.social);
      setTheme(next.theme);
      setSeo(next.seo);
      if (nextInt) setIntegrations(nextInt);
      if (nextAlgo) setAlgo(nextAlgo);
      setIntPatch({});
      setAlgoPatch({});
      setSuccess("Site settings saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Lazy-load the SEO Algorithm state the first time the tab opens.
  useEffect(() => {
    if (tab !== "algo" || algo) return;
    api
      .getSeoAlgorithm()
      .then((a) => setAlgo(a))
      .catch((e) => setError((e as Error).message));
  }, [tab, algo]);

  const reset = async () => {
    if (!confirm("Delete every site setting? This clears branding, favicon, contact info and everything else.")) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const next = await api.resetSiteSettings();
      setData(next);
      setBranding(next.branding);
      setHero(next.hero);
      setContact(next.contact);
      setSocial(next.social);
      setTheme(next.theme);
      setSeo(next.seo);
      setSuccess("Site settings cleared.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) {
    return (
      <div
        className="flex h-[70vh] items-center justify-center text-[rgba(90,35,56,0.5)]"
        style={{ fontFamily: "var(--f-body)" }}
      >
        {loading ? "Loading…" : error || "Loading site settings…"}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 sm:px-10 sm:py-10" style={{ fontFamily: "var(--f-body)" }}>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-[12px] text-[rgba(90,35,56,0.55)]">
            <Link href="/admin" className="hover:text-[#d95f48]">Admin</Link>
            <span className="text-[rgba(90,35,56,0.3)]">›</span>
            <Link href="/admin/site-settings" className="hover:text-[#d95f48]">Site Settings</Link>
            <span className="text-[rgba(90,35,56,0.3)]">›</span>
            <span className="text-[rgba(90,35,56,0.55)]">Edit</span>
          </nav>
          <h1
            className="mt-1 text-4xl font-medium italic text-[#5a2338] sm:text-[42px]"
            style={{ fontFamily: "var(--f-serif)" }}
          >
            Edit Site Setting
          </h1>
        </div>
        <button
          onClick={reset}
          disabled={saving}
          className="rounded-full bg-[#d92f2f] px-4 py-2.5 text-[13px] font-medium text-white shadow-[0_8px_22px_rgba(217,47,47,0.3)] transition-colors hover:bg-[#b52020] disabled:opacity-60"
        >
          Delete
        </button>
      </div>

      {error ? <div className="mt-4 rounded-lg border border-[rgba(217,95,72,0.4)] bg-[#fbe0d8] px-4 py-2 text-sm text-[#7a2418]">{error}</div> : null}
      {success ? <div className="mt-4 rounded-lg border border-[rgba(92,138,94,0.3)] bg-[#eaf6ea] px-4 py-2 text-sm text-[#2f6b50]">{success}</div> : null}

      {/* Tab strip */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-[rgba(201,73,124,0.15)] bg-white shadow-[0_10px_30px_rgba(122,44,44,0.05)]">
        <div className="flex overflow-x-auto border-b border-[rgba(90,35,56,0.08)] bg-[#fdf4ec]/60">
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={
                  "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-[13px] font-medium transition-colors " +
                  (on
                    ? "border-[#d95f48] bg-white text-[#5a2338]"
                    : "border-transparent text-[rgba(90,35,56,0.6)] hover:bg-white/60 hover:text-[#5a2338]")
                }
              >
                <TabIcon name={t.icon} active={on} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6 sm:p-8">
          {tab === "branding" ? (
            <BrandingTab value={branding} onChange={setBranding} onError={setError} />
          ) : tab === "hero" ? (
            <HeroTab value={hero} onChange={setHero} />
          ) : tab === "contact" ? (
            <ContactTab value={contact} onChange={setContact} />
          ) : tab === "social" ? (
            <SocialTab value={social} onChange={setSocial} />
          ) : tab === "theme" ? (
            <ThemeTab value={theme} onChange={setTheme} />
          ) : tab === "seo" ? (
            <SeoTab
              value={seo}
              onChange={setSeo}
              integrations={integrations}
              patch={intPatch}
              onIntPatch={(p) => setIntPatch((prev) => ({ ...prev, ...p }))}
              onError={setError}
            />
          ) : tab === "algo" ? (
            <AlgoTab
              value={algo}
              onChange={(next) => setAlgo(next)}
              patch={algoPatch}
              onPatch={(p) => setAlgoPatch((prev) => ({ ...prev, ...p }))}
              onError={setError}
              onSuccess={setSuccess}
            />
          ) : (
            <ComingSoon tab={TABS.find((t) => t.id === tab)!.label} />
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-6 flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-full bg-[#d95f48] px-6 py-2.5 text-[13px] font-medium text-white shadow-[0_10px_24px_rgba(217,95,72,0.3)] transition-colors hover:bg-[#c14e38] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <Link
          href="/admin/site-settings"
          className="rounded-full border border-[rgba(90,35,56,0.2)] px-4 py-2.5 text-[13px] font-medium text-[#5a2338] hover:border-[#d95f48] hover:text-[#d95f48]"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------ Branding tab ----------------------------- */

function BrandingTab({
  value,
  onChange,
  onError,
}: {
  value: SiteBranding;
  onChange: (v: SiteBranding) => void;
  onError: (msg: string) => void;
}) {
  const patch = (k: keyof SiteBranding, v: string) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-6">
      <Field label="Brand name" required>
        <input
          value={value.brandName}
          onChange={(e) => patch("brandName", e.target.value)}
          placeholder="We Manage Digital"
          className={inputCls}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Logo" hint="Primary logo (used on light backgrounds).">
          <FileDrop
            value={value.logo}
            onChange={(url) => patch("logo", url)}
            onError={onError}
            accept="image/*"
          />
        </Field>
        <Field label="Logo dark" hint="Optional logo for dark backgrounds.">
          <FileDrop
            value={value.logoDark}
            onChange={(url) => patch("logoDark", url)}
            onError={onError}
            accept="image/*"
          />
        </Field>
      </div>

      <Field label="Favicon" hint="Browser tab icon (square, e.g. 512×512).">
        <FileDrop
          value={value.favicon}
          onChange={(url) => patch("favicon", url)}
          onError={onError}
          accept="image/png,image/x-icon,image/svg+xml,image/webp"
        />
      </Field>
    </div>
  );
}

/* ---------------------------- Hero & messaging --------------------------- */

function HeroTab({ value, onChange }: { value: SiteHero; onChange: (v: SiteHero) => void }) {
  const patch = (k: keyof SiteHero, v: string) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-6">
      <Field label="Tagline" hint="One line shown near the brand name (nav, share cards).">
        <input
          value={value.tagline}
          onChange={(e) => patch("tagline", e.target.value)}
          className={inputCls}
          placeholder="Building Digital Freedom"
        />
      </Field>

      <Field label="Hero headline" hint="Big italic line on the landing page.">
        <input
          value={value.heroHeadline}
          onChange={(e) => patch("heroHeadline", e.target.value)}
          className={inputCls}
          placeholder="Building Digital Freedom"
        />
      </Field>

      <Field label="Hero subheadline" hint="Prose shown below the headline (1–2 sentences).">
        <textarea
          value={value.heroSubheadline}
          onChange={(e) => patch("heroSubheadline", e.target.value)}
          className={inputCls + " min-h-[80px] resize-y"}
          placeholder="What your brand does, in one clear sentence guests can read at a glance."
        />
      </Field>

      <Field label="Value proposition" hint="Longer promise used in about / hero-adjacent sections.">
        <textarea
          value={value.valueProposition}
          onChange={(e) => patch("valueProposition", e.target.value)}
          className={inputCls + " min-h-[90px] resize-y"}
          placeholder="We help brands grow faster with digital strategy that works, execution that performs, and systems that scale."
        />
      </Field>

      <Field label="Mission" hint="A paragraph for about pages / manifesto blocks.">
        <textarea
          value={value.mission}
          onChange={(e) => patch("mission", e.target.value)}
          className={inputCls + " min-h-[110px] resize-y"}
          placeholder="Why you exist and what you stand for — the story that guides every design decision."
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Primary cta label" hint="Text on the main call-to-action button.">
          <input
            value={value.primaryCtaLabel}
            onChange={(e) => patch("primaryCtaLabel", e.target.value)}
            className={inputCls}
            placeholder="Book a discovery call"
          />
        </Field>
        <Field label="Primary cta url" hint="Where the button links. Internal paths (/create) or full URLs both work.">
          <input
            value={value.primaryCtaUrl}
            onChange={(e) => patch("primaryCtaUrl", e.target.value)}
            className={inputCls}
            placeholder="/contact"
          />
        </Field>
      </div>
    </div>
  );
}

/* -------------------------------- Contact -------------------------------- */

function ContactTab({ value, onChange }: { value: SiteContact; onChange: (v: SiteContact) => void }) {
  const patch = (k: keyof SiteContact, v: string) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Contact email">
          <input
            type="email"
            value={value.contactEmail}
            onChange={(e) => patch("contactEmail", e.target.value)}
            className={inputCls}
            placeholder="hello@your-domain.com"
          />
        </Field>
        <Field label="Careers email">
          <input
            type="email"
            value={value.careersEmail}
            onChange={(e) => patch("careersEmail", e.target.value)}
            className={inputCls}
            placeholder="careers@your-domain.com"
          />
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Phone">
          <input
            value={value.phone}
            onChange={(e) => patch("phone", e.target.value)}
            className={inputCls}
            placeholder="+971 5X XXX XXXX"
          />
        </Field>
        <Field label="Response time">
          <input
            value={value.responseTime}
            onChange={(e) => patch("responseTime", e.target.value)}
            className={inputCls}
            placeholder="We reply within 24 hours"
          />
        </Field>
      </div>

      <Field label="Address">
        <input
          value={value.address}
          onChange={(e) => patch("address", e.target.value)}
          className={inputCls}
          placeholder="Studio 402, Building 4, Dubai Studio City, Dubai, UAE"
        />
      </Field>

      <Field label="Office hours">
        <input
          value={value.officeHours}
          onChange={(e) => patch("officeHours", e.target.value)}
          className={inputCls}
          placeholder="Monday–Friday, 9 AM – 5 PM (GCC)"
        />
      </Field>

      <Field label="Calendar url" hint="Booking link for discovery calls.">
        <input
          value={value.calendarUrl}
          onChange={(e) => patch("calendarUrl", e.target.value)}
          className={inputCls}
          placeholder="https://cal.com/…"
        />
      </Field>
    </div>
  );
}

/* ----------------------------- Social & footer --------------------------- */

const PLATFORM_SUGGESTIONS = [
  "instagram",
  "x",
  "linkedin",
  "facebook",
  "tiktok",
  "youtube",
  "pinterest",
  "whatsapp",
  "threads",
  "github",
  "dribbble",
  "behance",
];

function SocialTab({ value, onChange }: { value: SiteSocial; onChange: (v: SiteSocial) => void }) {
  const patchLink = (i: number, patch: Partial<SocialLink>) =>
    onChange({
      ...value,
      links: value.links.map((l, j) => (j === i ? { ...l, ...patch } : l)),
    });

  const removeLink = (i: number) =>
    onChange({ ...value, links: value.links.filter((_, j) => j !== i) });

  const addLink = () =>
    onChange({ ...value, links: [...value.links, { platform: "", url: "" }] });

  return (
    <div className="space-y-6">
      {/* Social links table */}
      <div>
        <p className="mb-2 text-[12.5px] font-medium text-[rgba(90,35,56,0.75)]">Social links</p>
        <datalist id="wi-platform-suggestions">
          {PLATFORM_SUGGESTIONS.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <div className="overflow-hidden rounded-lg border border-[rgba(90,35,56,0.15)]">
          <div className="grid grid-cols-[1fr_1.6fr_36px] items-center gap-3 border-b border-[rgba(90,35,56,0.1)] bg-[#fdf4ec] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[rgba(90,35,56,0.55)]">
            <span>Platform</span>
            <span>URL</span>
            <span aria-hidden />
          </div>
          {value.links.length === 0 ? (
            <div className="px-3 py-6 text-center text-[13px] text-[rgba(90,35,56,0.5)]">
              No social links yet. Click <em>Add social link</em> below.
            </div>
          ) : (
            value.links.map((l, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_1.6fr_36px] items-center gap-3 border-b border-[rgba(90,35,56,0.08)] px-3 py-2 last:border-b-0"
              >
                <input
                  list="wi-platform-suggestions"
                  value={l.platform}
                  onChange={(e) => patchLink(i, { platform: e.target.value })}
                  className="w-full rounded-md border-none bg-transparent px-2 py-1 font-mono text-[13px] text-[#5a2338] outline-none focus:bg-[#fdf4ec]"
                  placeholder="instagram"
                />
                <input
                  value={l.url}
                  onChange={(e) => patchLink(i, { url: e.target.value })}
                  className="w-full rounded-md border-none bg-transparent px-2 py-1 text-[13px] text-[#5a2338] outline-none focus:bg-[#fdf4ec]"
                  placeholder="https://instagram.com/…"
                />
                <button
                  type="button"
                  onClick={() => removeLink(i)}
                  aria-label={`Remove ${l.platform || "link"}`}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-[rgba(217,47,47,0.8)] transition-colors hover:bg-[#fbe0d8] hover:text-[#d92f2f]"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                  </svg>
                </button>
              </div>
            ))
          )}
          <button
            type="button"
            onClick={addLink}
            className="flex w-full items-center justify-center border-t border-[rgba(90,35,56,0.1)] bg-[#fdf4ec]/40 px-3 py-2 text-[13px] font-medium text-[#c9497c] transition-colors hover:bg-[#fbe0d8]/60"
          >
            + Add social link
          </button>
        </div>
        <p className="mt-1.5 text-[11.5px] text-[rgba(90,35,56,0.55)]">
          e.g. <code className="font-mono">instagram</code> → <code className="font-mono">https://instagram.com/…</code>
        </p>
      </div>

      <Field label="Footer message" hint="Short brand statement shown in the footer.">
        <textarea
          value={value.footerMessage}
          onChange={(e) => onChange({ ...value, footerMessage: e.target.value })}
          className={inputCls + " min-h-[90px] resize-y"}
          placeholder="A short line that sums up what your brand does — shown at the bottom of every marketing page."
        />
      </Field>

      <Field label="Copyright text">
        <input
          value={value.copyrightText}
          onChange={(e) => onChange({ ...value, copyrightText: e.target.value })}
          className={inputCls}
          placeholder={`© ${new Date().getFullYear()} Your Brand Name`}
        />
      </Field>
    </div>
  );
}

/* ---------------------------------- Theme -------------------------------- */

function ThemeTab({ value, onChange }: { value: SiteTheme; onChange: (v: SiteTheme) => void }) {
  const patch = (k: keyof SiteTheme, v: string) => onChange({ ...value, [k]: v });
  const [darkOpen, setDarkOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Accent colors — light */}
      <div className="rounded-xl border border-[rgba(90,35,56,0.1)] p-5">
        <div className="mb-1">
          <p className="text-[15px] font-medium text-[#5a2338]">Accent colors</p>
          <p className="text-[12.5px] text-[rgba(90,35,56,0.6)]">
            Brand accent used for buttons, links and highlights. Leave blank to keep the default coral.
          </p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <ColorField label="Accent" value={value.accent} onChange={(v) => patch("accent", v)} placeholder="#d95f48" />
          <ColorField label="Accent (soft)" value={value.accentSoft} onChange={(v) => patch("accentSoft", v)} placeholder="#fbe0d8" />
          <ColorField label="Text on accent" value={value.textOnAccent} onChange={(v) => patch("textOnAccent", v)} placeholder="#ffffff" />
        </div>
      </div>

      {/* Accent colors — dark mode (collapsible) */}
      <div className="rounded-xl border border-[rgba(90,35,56,0.1)]">
        <button
          type="button"
          onClick={() => setDarkOpen((v) => !v)}
          className="flex w-full items-start justify-between gap-3 p-5 text-left"
        >
          <div>
            <p className="text-[15px] font-medium text-[#5a2338]">Accent colors — dark mode</p>
            <p className="text-[12.5px] text-[rgba(90,35,56,0.6)]">
              Optional overrides applied only when the site is in dark mode.
            </p>
          </div>
          <svg
            className={"mt-1 h-4 w-4 text-[rgba(90,35,56,0.5)] transition-transform " + (darkOpen ? "rotate-180" : "")}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {darkOpen ? (
          <div className="grid gap-4 border-t border-[rgba(90,35,56,0.08)] p-5 sm:grid-cols-3">
            <ColorField label="Accent" value={value.accentDark} onChange={(v) => patch("accentDark", v)} placeholder="#e0705a" />
            <ColorField label="Accent (soft)" value={value.accentSoftDark} onChange={(v) => patch("accentSoftDark", v)} placeholder="#3a1620" />
            <ColorField label="Text on accent" value={value.textOnAccentDark} onChange={(v) => patch("textOnAccentDark", v)} placeholder="#ffffff" />
          </div>
        ) : null}
      </div>

      {/* Fonts */}
      <div className="rounded-xl border border-[rgba(90,35,56,0.1)] p-5">
        <div className="mb-1">
          <p className="text-[15px] font-medium text-[#5a2338]">Fonts</p>
          <p className="text-[12.5px] text-[rgba(90,35,56,0.6)]">
            Pick from a curated set. Leave blank to keep the defaults.
          </p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <FontField role="headings" label="Headings" value={value.fontHeadings} onChange={(v) => patch("fontHeadings", v)} />
          <FontField role="body" label="Body" value={value.fontBody} onChange={(v) => patch("fontBody", v)} />
          <FontField role="mono" label="Mono / labels" value={value.fontMono} onChange={(v) => patch("fontMono", v)} />
        </div>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const isValidHex = /^#([0-9a-fA-F]{3,8})$/.test(value.trim());
  const swatch = isValidHex ? value.trim() : "transparent";

  return (
    <label className="block">
      <span className="mb-1 flex text-[12.5px] font-medium text-[rgba(90,35,56,0.75)]">{label}</span>
      <div className="flex items-center gap-2 rounded-lg border border-[rgba(90,35,56,0.2)] bg-white pr-1">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 border-none bg-transparent px-3 py-2 font-mono text-[13.5px] text-[#5a2338] outline-none placeholder:text-[rgba(90,35,56,0.35)]"
        />
        {/* Native colour picker; its output overwrites the text field. */}
        <input
          type="color"
          value={isValidHex ? value.trim().slice(0, 7) : "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7 shrink-0 cursor-pointer rounded-full border border-[rgba(90,35,56,0.15)]"
          style={{ background: swatch, padding: 0 }}
          aria-label={`${label} colour picker`}
        />
      </div>
    </label>
  );
}

function FontField({
  role,
  label,
  value,
  onChange,
}: {
  role: FontRole;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const options = FONT_CATALOG[role];
  const def = FONT_DEFAULT[role];
  return (
    <label className="block">
      <span className="mb-1 flex text-[12.5px] font-medium text-[rgba(90,35,56,0.75)]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls + " appearance-none pr-9 bg-no-repeat bg-[right_0.75rem_center]"}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23855f6c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>\")",
        }}
      >
        <option value="">{def.label} (default)</option>
        {options.map((o) => (
          <option key={o.key} value={o.key}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

/* ------------------------------ SEO & analytics ------------------------- */

const CLAUDE_MODELS = [
  { key: "claude-opus-4-8", label: "Claude Opus 4.8 (best quality)" },
  { key: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (balanced)" },
  { key: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (cheapest)" },
] as const;

const ORG_SCHEMA_TYPES = ["Organization", "Corporation", "LocalBusiness", "NGO", "EducationalOrganization"] as const;

function SeoTab({
  value,
  onChange,
  integrations,
  patch,
  onIntPatch,
  onError,
}: {
  value: SiteSeo;
  onChange: (v: SiteSeo) => void;
  integrations: IntegrationsStatus | null;
  patch: IntegrationsUpdate;
  onIntPatch: (p: IntegrationsUpdate) => void;
  onError: (msg: string) => void;
}) {
  const patchField = (k: keyof SiteSeo, v: string | string[]) => onChange({ ...value, [k]: v });

  const [aiKeyDraft, setAiKeyDraft] = useState("");
  const [gaJsonDraft, setGaJsonDraft] = useState("");
  const [kwDraft, setKwDraft] = useState("");
  const [aiOpen, setAiOpen] = useState(true);
  const [orgOpen, setOrgOpen] = useState(true);
  const [gaOpen, setGaOpen] = useState(true);

  const model = patch.aiModel ?? integrations?.ai.model ?? CLAUDE_MODELS[1].key;
  const gaMeasurementId = patch.gaMeasurementId ?? integrations?.ga.measurementId ?? "";
  const gaPropertyId = patch.gaPropertyId ?? integrations?.ga.propertyId ?? "";

  return (
    <div className="space-y-6">
      {/* Direct fields */}
      <Field label="Meta title" hint="Default browser/social title for pages.">
        <input
          value={value.metaTitle}
          onChange={(e) => patchField("metaTitle", e.target.value)}
          className={inputCls}
          placeholder="Your brand — tagline"
        />
      </Field>
      <Field label="Meta description">
        <textarea
          value={value.metaDescription}
          onChange={(e) => patchField("metaDescription", e.target.value)}
          className={inputCls + " min-h-[80px] resize-y"}
          placeholder="One or two sentences summarising the site."
        />
      </Field>
      <Field label="Og image" hint="Default social share image (1200×630).">
        <FileDrop value={value.ogImage} onChange={(url) => patchField("ogImage", url)} onError={onError} accept="image/*" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Google Analytics Measurement ID"
          hint="Public tag injected on every page so GA starts collecting data."
        >
          <input
            value={gaMeasurementId}
            onChange={(e) => onIntPatch({ gaMeasurementId: e.target.value })}
            className={inputCls}
            placeholder="G-XXXXXXXXXX"
          />
        </Field>
        <Field label="Meta pixel id">
          <input
            value={value.metaPixelId}
            onChange={(e) => patchField("metaPixelId", e.target.value.replace(/[^\d]/g, ""))}
            className={inputCls}
            placeholder="123456789012345"
          />
        </Field>
      </div>

      <Field label="Default site keywords" hint="Fallback keywords used when a page has none of its own.">
        <KeywordChips
          value={value.keywords}
          onChange={(v) => patchField("keywords", v)}
          draft={kwDraft}
          onDraft={setKwDraft}
        />
      </Field>

      {/* AI SEO assistant */}
      <Section
        open={aiOpen}
        onToggle={() => setAiOpen((v) => !v)}
        title="AI SEO assistant (Anthropic Claude)"
        description="Connect Claude to generate titles, descriptions, keywords and FAQs, and to run SEO / AEO / GEO audits from each content editor."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Anthropic API key" hint="Stored encrypted and never shown again. Get one from the Anthropic Console.">
            <input
              type="password"
              value={aiKeyDraft}
              onChange={(e) => {
                setAiKeyDraft(e.target.value);
                if (e.target.value === "") {
                  const { aiApiKey: _drop, ...rest } = patch;
                  onIntPatch({ ...rest, aiApiKey: undefined });
                } else {
                  onIntPatch({ aiApiKey: e.target.value, clearAiApiKey: false });
                }
              }}
              className={inputCls}
              placeholder={
                integrations?.ai.hasKey
                  ? `${integrations.ai.keyPreview || "•••••••••••"} saved — type a new key to replace it`
                  : "sk-ant-…"
              }
            />
            {integrations?.ai.hasKey && !aiKeyDraft ? (
              <button
                type="button"
                onClick={() => {
                  onIntPatch({ clearAiApiKey: true, aiApiKey: undefined });
                }}
                className="mt-1 text-[11.5px] text-[#c14e38] hover:underline"
              >
                Clear saved key
              </button>
            ) : null}
          </Field>
          <Field label="Model">
            <select
              value={model}
              onChange={(e) => onIntPatch({ aiModel: e.target.value })}
              className={inputCls + " appearance-none pr-9 bg-no-repeat bg-[right_0.75rem_center]"}
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23855f6c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>\")",
              }}
            >
              {CLAUDE_MODELS.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      {/* Organization (structured data) */}
      <Section
        open={orgOpen}
        onToggle={() => setOrgOpen((v) => !v)}
        title="Organization (structured data)"
        description="Used to build Organization JSON-LD for search & AI engines. Brand name, logo, address and social links come from the other tabs."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Schema type">
            <select
              value={value.orgSchemaType || "Organization"}
              onChange={(e) => patchField("orgSchemaType", e.target.value)}
              className={inputCls + " appearance-none pr-9 bg-no-repeat bg-[right_0.75rem_center]"}
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23855f6c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>\")",
              }}
            >
              {ORG_SCHEMA_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Founded">
            <input
              value={value.orgFoundedYear}
              onChange={(e) => patchField("orgFoundedYear", e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
              className={inputCls}
              placeholder={`${new Date().getFullYear()}`}
            />
          </Field>
        </div>
      </Section>

      {/* Analytics dashboard (GA4 Data API) */}
      <Section
        open={gaOpen}
        onToggle={() => setGaOpen((v) => !v)}
        title="Analytics dashboard (GA4 Data API)"
        description="Connect a Google Cloud service account so live Google Analytics charts appear on your admin dashboard. See the setup steps below."
      >
        <Field
          label="GA4 Property ID"
          hint="The numeric Property ID from GA4 Admin → Property settings (not the G-XXXX tag)."
        >
          <input
            value={gaPropertyId}
            onChange={(e) => onIntPatch({ gaPropertyId: e.target.value })}
            className={inputCls}
            placeholder="123456789"
          />
        </Field>
        <Field
          label="Service account key (JSON)"
          hint='Paste the full service-account JSON key. Stored encrypted and never shown again. Grant this account "Viewer" access to your GA4 property.'
        >
          <textarea
            value={gaJsonDraft}
            onChange={(e) => {
              setGaJsonDraft(e.target.value);
              if (e.target.value === "") {
                onIntPatch({ gaServiceAccountJson: undefined });
              } else {
                onIntPatch({ gaServiceAccountJson: e.target.value, clearGaServiceAccount: false });
              }
            }}
            className={inputCls + " min-h-[140px] resize-y font-mono text-[12px]"}
            placeholder={
              integrations?.ga.hasServiceAccount
                ? "A key is saved — paste new JSON to replace it"
                : '{ "type": "service_account", "private_key": "…", "client_email": "…@…iam.gserviceaccount.com" }'
            }
          />
          {integrations?.ga.hasServiceAccount && !gaJsonDraft ? (
            <button
              type="button"
              onClick={() => onIntPatch({ clearGaServiceAccount: true, gaServiceAccountJson: undefined })}
              className="mt-1 text-[11.5px] text-[#c14e38] hover:underline"
            >
              Clear saved service account
            </button>
          ) : null}
        </Field>

        <div className="mt-4 rounded-lg border border-[rgba(90,35,56,0.1)] bg-[#fdf4ec] p-4 text-[13px] text-[rgba(90,35,56,0.75)]">
          <p className="mb-2 font-medium text-[#5a2338]">How to connect</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>In <strong>Google Cloud Console</strong>, create (or pick) a project and enable the <strong>Google Analytics Data API</strong>.</li>
            <li>Create a <strong>Service Account</strong> → add a <strong>JSON key</strong> → download it.</li>
            <li>Paste the JSON above and enter your numeric GA4 Property ID.</li>
            <li>In GA4 → Admin → <strong>Property access management</strong>, add the service account&rsquo;s email as a <strong>Viewer</strong>.</li>
            <li>Save. The dashboard charts populate within a few minutes (cached ~15 min).</li>
          </ol>
        </div>
      </Section>
    </div>
  );
}

/* ---------------- Keyword chips (used by SEO tab) ----------------- */

function KeywordChips({
  value,
  onChange,
  draft,
  onDraft,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  draft: string;
  onDraft: (v: string) => void;
}) {
  const commit = () => {
    const parts = draft.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const next = Array.from(new Set([...value, ...parts]));
    onChange(next);
    onDraft("");
  };
  return (
    <div className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-lg border border-[rgba(90,35,56,0.2)] bg-white px-2 py-1.5">
      {value.map((k, i) => (
        <span
          key={k + i}
          className="inline-flex items-center gap-1 rounded-full bg-[#f9dce9] px-2.5 py-1 text-[11.5px] text-[#a53a66]"
        >
          {k}
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="hover:text-[#5a2338]"
            aria-label={`Remove ${k}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => onDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={value.length ? "" : "Add a keyword"}
        className="flex-1 border-none bg-transparent px-1 py-1 text-[13px] text-[#5a2338] outline-none placeholder:text-[rgba(90,35,56,0.4)]"
      />
    </div>
  );
}

/* --------- collapsible section shared by SEO tab --------- */

function Section({
  open,
  onToggle,
  title,
  description,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[rgba(90,35,56,0.1)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 p-5 text-left"
      >
        <div>
          <p className="text-[15px] font-medium text-[#5a2338]">{title}</p>
          {description ? <p className="mt-0.5 text-[12.5px] text-[rgba(90,35,56,0.6)]">{description}</p> : null}
        </div>
        <svg
          className={"mt-1 h-4 w-4 shrink-0 text-[rgba(90,35,56,0.5)] transition-transform " + (open ? "rotate-180" : "")}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open ? <div className="space-y-4 border-t border-[rgba(90,35,56,0.08)] p-5">{children}</div> : null}
    </div>
  );
}

/* ------------------------------- SEO Algorithm --------------------------- */

const ALGO_FREQUENCIES: { key: SeoAlgorithmFrequency; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

function AlgoTab({
  value,
  onChange,
  patch,
  onPatch,
  onError,
  onSuccess,
}: {
  value: SeoAlgorithm | null;
  onChange: (next: SeoAlgorithm) => void;
  patch: SeoAlgorithmInput;
  onPatch: (p: SeoAlgorithmInput) => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}) {
  const [busy, setBusy] = useState<null | "improve" | "run" | "reset" | "restore">(null);
  const [versionsOpen, setVersionsOpen] = useState(true);
  const [memoryOpen, setMemoryOpen] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<string>("");

  if (!value) {
    return (
      <div className="flex h-40 items-center justify-center text-[13px] text-[rgba(90,35,56,0.55)]">
        Loading SEO algorithm…
      </div>
    );
  }

  // Effective values (draft patch layered on top of the loaded record).
  const eff = {
    algorithm: patch.algorithm ?? value.algorithm,
    learningMemory: patch.learningMemory ?? value.learningMemory,
    autoImprove: patch.autoImprove ?? value.autoImprove,
    frequency: patch.frequency ?? value.frequency,
    versionsToKeep: patch.versionsToKeep ?? value.versionsToKeep,
  };

  const improveDraft = async () => {
    setBusy("improve");
    onError("");
    try {
      const r = await api.improveSeoAlgorithmDraft();
      onPatch({ algorithm: r.algorithm, learningMemory: r.learningMemory });
      onSuccess(`AI drafted an improved rubric. ${r.rationale ? `— ${r.rationale}` : ""} Review, then Save.`);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const runNow = async () => {
    if (!confirm("Run an improvement now? This calls Claude, archives a new version, and marks it as current.")) return;
    setBusy("run");
    onError("");
    try {
      const r = await api.runSeoAlgorithmNow();
      onChange(r.dto);
      onPatch({}); // clear stale drafts
      onSuccess(`Improvement run complete. ${r.rationale ? `— ${r.rationale}` : ""}`);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const resetToDefault = async () => {
    if (!confirm("Reset the algorithm text back to the built-in default? The current version will be archived first.")) return;
    setBusy("reset");
    onError("");
    try {
      const next = await api.resetSeoAlgorithm();
      onChange(next);
      onPatch({});
      onSuccess("Reset to the built-in default rubric.");
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const loadVersionIntoEditor = async (id: string) => {
    if (!id) return;
    setBusy("restore");
    onError("");
    try {
      const v = await api.getSeoAlgorithmVersion(id);
      if (v.algorithm !== undefined) {
        onPatch({ algorithm: v.algorithm, learningMemory: v.learningMemory ?? "" });
        onSuccess(`Loaded v${versionLabel(value.versions, id)} into the editor. Save to make it current, or Cancel to discard.`);
      }
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const restoreVersion = async (id: string) => {
    if (!confirm("Restore this version? A new 'current' version will be created with this content.")) return;
    setBusy("restore");
    onError("");
    try {
      const next = await api.restoreSeoAlgorithmVersion(id);
      onChange(next);
      onPatch({});
      onSuccess("Restored — this version is now current.");
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Automatic weekly improvement */}
      <div className="rounded-xl border border-[rgba(90,35,56,0.1)] p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fdf1e2] text-[#c98f2e]">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-3.5-7.1" /><path d="M21 4v5h-5" />
            </svg>
          </span>
          <div>
            <p className="text-[15px] font-medium text-[#5a2338]">Automatic weekly improvement</p>
            <p className="mt-0.5 text-[12.5px] text-[rgba(90,35,56,0.6)]">
              Let AI research and refresh the algorithm on a schedule, archiving every previous version so you can
              compare and revert. Each run also updates the AI&rsquo;s learning memory, so results compound over time.
            </p>
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[12.5px] font-medium text-[rgba(90,35,56,0.75)]">Auto-improve with AI</p>
            <Toggle
              checked={eff.autoImprove}
              onChange={(v) => onPatch({ autoImprove: v })}
              label={eff.autoImprove ? "On" : "Off"}
            />
            <p className="mt-2 text-[11.5px] text-[rgba(90,35,56,0.55)]">
              When on, the algorithm is researched and replaced automatically at the cadence below.
            </p>
          </div>
          <Field label="Frequency">
            <select
              value={eff.frequency}
              onChange={(e) => onPatch({ frequency: e.target.value as SeoAlgorithmFrequency })}
              className={inputCls + " appearance-none pr-9 bg-no-repeat bg-[right_0.75rem_center]"}
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23855f6c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>\")",
              }}
            >
              {ALGO_FREQUENCIES.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <Field label="Versions to keep in history" hint="Older versions beyond this are pruned (5–365). Default 90.">
            <input
              type="number"
              min={5}
              max={365}
              value={eff.versionsToKeep}
              onChange={(e) => onPatch({ versionsToKeep: Math.max(5, Math.min(365, Number(e.target.value) || 90)) })}
              className={inputCls}
            />
          </Field>
          <div>
            <p className="mb-1 text-[12.5px] font-medium text-[rgba(90,35,56,0.75)]">Last AI run</p>
            <p className="text-[14px] text-[#5a2338]">
              {value.lastRunAt ? formatDateTime(value.lastRunAt) : "Never run yet"}
              {value.lastRunNote ? (
                <span className="ml-1 text-[12.5px] text-[rgba(90,35,56,0.55)]">— {value.lastRunNote}</span>
              ) : null}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={runNow}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-full bg-[#7b6bcf] px-4 py-2 text-[12.5px] font-medium text-white shadow-[0_8px_20px_rgba(123,107,207,0.35)] transition-colors hover:bg-[#6c5cbf] disabled:opacity-60"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2 3 14h9l-1 8 10-12h-9z" />
            </svg>
            {busy === "run" ? "Running…" : "Run improvement now"}
          </button>
        </div>
      </div>

      {/* AI audit & optimisation algorithm */}
      <div className="rounded-xl border border-[rgba(90,35,56,0.1)] p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fdf1e2] text-[#c98f2e]">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />
            </svg>
          </span>
          <div>
            <p className="text-[15px] font-medium text-[#5a2338]">AI audit &amp; optimisation algorithm</p>
            <p className="mt-0.5 text-[12.5px] text-[rgba(90,35,56,0.6)]">
              The strategy and 0–100 scoring rubric Claude follows when auditing and optimising every page. A strong
              default is provided — tune it, or let AI improve it. Save to apply across all content editors; every
              save is archived as a version.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={improveDraft}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#7b6bcf] px-3.5 py-1.5 text-[12.5px] font-medium text-white shadow-[0_8px_20px_rgba(123,107,207,0.3)] transition-colors hover:bg-[#6c5cbf] disabled:opacity-60"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
            </svg>
            {busy === "improve" ? "Thinking…" : "Improve editor text with AI"}
          </button>
          <button
            type="button"
            onClick={resetToDefault}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(90,35,56,0.2)] bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-[#5a2338] transition-colors hover:border-[#d95f48] hover:text-[#d95f48] disabled:opacity-60"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v6h6" />
            </svg>
            {busy === "reset" ? "Resetting…" : "Reset to default"}
          </button>
        </div>
        <textarea
          value={eff.algorithm}
          onChange={(e) => onPatch({ algorithm: e.target.value })}
          className={
            "mt-4 w-full rounded-lg border border-[rgba(90,35,56,0.2)] bg-white p-3 font-mono text-[12.5px] leading-[1.6] text-[#3d2540] outline-none focus:border-[#c9497c]"
          }
          rows={18}
          spellCheck={false}
        />
      </div>

      {/* Version history & revert */}
      <Section
        open={versionsOpen}
        onToggle={() => setVersionsOpen((v) => !v)}
        title="Version history & revert"
        description="Every version is archived with its source and SEO performance (average audit score). Restore any earlier version, or load it into the editor to compare."
      >
        <div>
          <p className="mb-1 text-[12.5px] font-medium text-[rgba(90,35,56,0.75)]">Saved versions (newest first)</p>
          <select
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(e.target.value)}
            className={inputCls + " appearance-none pr-9 bg-no-repeat bg-[right_0.75rem_center]"}
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23855f6c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>\")",
            }}
          >
            <option value="">Select a version…</option>
            {value.versions.map((v, i) => (
              <option key={v.id} value={v.id}>
                {formatVersionLabel(value.versions.length - i, v)}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11.5px] text-[rgba(90,35,56,0.55)]">
            &ldquo;•&rdquo; marks the version currently in use.
          </p>
        </div>
        {selectedVersion ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadVersionIntoEditor(selectedVersion)}
              disabled={busy !== null}
              className="rounded-full border border-[rgba(90,35,56,0.2)] bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-[#5a2338] hover:border-[#c9497c] hover:text-[#c9497c] disabled:opacity-60"
            >
              Load into editor
            </button>
            <button
              type="button"
              onClick={() => restoreVersion(selectedVersion)}
              disabled={busy !== null || value.versions.find((v) => v.id === selectedVersion)?.isCurrent}
              className="rounded-full bg-[#d95f48] px-3.5 py-1.5 text-[12.5px] font-medium text-white hover:bg-[#c14e38] disabled:opacity-60"
            >
              Restore as current
            </button>
          </div>
        ) : null}
      </Section>

      {/* AI learning memory */}
      <Section
        open={memoryOpen}
        onToggle={() => setMemoryOpen((v) => !v)}
        title="AI learning memory"
        description="Notes the AI keeps and rewrites after each improvement run — durable principles, what correlates with higher audit scores, and pitfalls to avoid. This is how the system improves itself over time. You can read and lightly edit it."
      >
        <textarea
          value={eff.learningMemory}
          onChange={(e) => onPatch({ learningMemory: e.target.value })}
          className={
            "w-full rounded-lg border border-[rgba(90,35,56,0.2)] bg-white p-3 font-mono text-[12.5px] leading-[1.6] text-[#3d2540] outline-none focus:border-[#c9497c]"
          }
          rows={14}
          spellCheck={false}
        />
        <p className="mt-1.5 text-[11.5px] text-[rgba(90,35,56,0.55)]">
          Passed to the AI before each run so improvements build on prior learnings.
        </p>
      </Section>
    </div>
  );
}

function formatVersionLabel(index: number, v: SeoAlgorithmVersion): string {
  const dot = v.isCurrent ? "• " : "";
  const score = v.avgAuditScore != null ? ` — avg ${Math.round(v.avgAuditScore)}` : "";
  const src = v.source === "manual" ? "" : ` [${v.source}]`;
  return `${dot}v${index} — ${formatDateTime(v.createdAt)}${src}${score}`;
}

function versionLabel(versions: SeoAlgorithmVersion[], id: string): string {
  const idx = versions.findIndex((v) => v.id === id);
  if (idx === -1) return "?";
  return String(versions.length - idx);
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        className={
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors " +
          (checked ? "bg-[#d95f48]" : "bg-[rgba(90,35,56,0.25)]")
        }
      >
        <span
          className={
            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform " +
            (checked ? "translate-x-6" : "translate-x-1")
          }
        />
      </button>
      {label ? <span className="text-[13px] text-[#5a2338]">{label}</span> : null}
    </label>
  );
}

function ComingSoon({ tab }: { tab: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[rgba(90,35,56,0.2)] px-6 py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fdf1e2] text-[#c98f2e]">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 8v4l3 2M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" />
        </svg>
      </span>
      <p
        className="text-lg font-medium italic text-[#5a2338]"
        style={{ fontFamily: "var(--f-serif)" }}
      >
        {tab} — coming next
      </p>
      <p className="max-w-md text-[13.5px] text-[rgba(90,35,56,0.65)]">
        Share the fields you want in this tab and I'll wire them to the same site-settings record.
      </p>
    </div>
  );
}

/* --------------------------- shared bits --------------------------------- */

const inputCls =
  "w-full rounded-lg border border-[rgba(90,35,56,0.2)] bg-white px-3 py-2 text-[14px] text-[#5a2338] outline-none focus:border-[#c9497c]";

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-[12.5px] font-medium text-[rgba(90,35,56,0.75)]">
        {label}
        {required ? <span className="text-[#d95f48]">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11.5px] text-[rgba(90,35,56,0.55)]">{hint}</span> : null}
    </label>
  );
}

function FileDrop({
  value,
  onChange,
  onError,
  accept = "image/*",
}: {
  value: string;
  onChange: (url: string) => void;
  onError: (msg: string) => void;
  accept?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await api.uploadImage(file);
      onChange(url);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) upload(f);
        }}
        onClick={() => inputRef.current?.click()}
        className="flex min-h-[92px] cursor-pointer items-center justify-center rounded-lg border border-dashed border-[rgba(90,35,56,0.25)] bg-[#fdf4ec] px-4 py-4 text-center text-[13px] text-[rgba(90,35,56,0.7)] transition-colors hover:border-[#d95f48] hover:bg-[#fbe0d8]/40 hover:text-[#5a2338]"
      >
        {uploading ? (
          <span>Uploading…</span>
        ) : value ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              className="h-14 w-14 rounded-md border border-[rgba(90,35,56,0.1)] bg-white object-contain p-1"
            />
            <span className="text-left">
              <span className="block text-[13px] font-medium text-[#5a2338]">Replace</span>
              <span className="block text-[11.5px] text-[rgba(90,35,56,0.55)]">Drag &amp; drop or click to change</span>
            </span>
          </div>
        ) : (
          <span>
            Drag &amp; Drop your files or <span className="text-[#c9497c] underline">Browse</span>
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
      </div>
      {value ? (
        <div className="mt-2 flex items-center justify-between text-[11.5px] text-[rgba(90,35,56,0.55)]">
          <span className="truncate">{value}</span>
          <button
            type="button"
            onClick={() => onChange("")}
            className="ml-2 shrink-0 rounded-full border border-[rgba(217,47,47,0.35)] px-2 py-0.5 text-[11px] text-[#c14e38] hover:bg-[#fbe0d8]"
          >
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------- tab icons ----------------------------------- */

function TabIcon({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? "#d95f48" : "currentColor";
  const cls = "h-4 w-4";
  switch (name) {
    case "img":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="1.6" /><path d="M21 15l-5-5-8 8" />
        </svg>
      );
    case "spark":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
          <path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z" />
        </svg>
      );
    case "mail":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" />
        </svg>
      );
    case "pin":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s-7-7.6-7-13a7 7 0 0 1 14 0c0 5.4-7 13-7 13z" /><circle cx="12" cy="9" r="2.5" />
        </svg>
      );
    case "share":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" />
          <path d="M8 11l8-4M8 13l8 4" />
        </svg>
      );
    case "paint":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a9 9 0 1 0 0 18 3 3 0 0 0 0-6 2 2 0 0 1 0-4h1a5 5 0 0 0 5-5 5 5 0 0 0-6-3z" />
          <circle cx="7.5" cy="10.5" r="1.2" /><circle cx="12" cy="7.5" r="1.2" /><circle cx="16.5" cy="10.5" r="1.2" />
        </svg>
      );
    case "chart":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );
    case "flask":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />
        </svg>
      );
    default:
      return null;
  }
}
