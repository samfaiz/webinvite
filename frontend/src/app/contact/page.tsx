"use client";

import { useEffect, useState } from "react";
import { PublicShell } from "@/cms/PublicShell";
import { api, type PublicSiteSettings, type ContactMessageInput } from "@/lib/api";

/**
 * `/contact` — public contact page. The left column shows contact info pulled
 * from Site Settings (Company → Site Settings → Contact tab). The right column
 * is a form that posts to `POST /api/contact/messages` and appears in the
 * admin Inbox.
 */
export default function ContactPage() {
  const [settings, setSettings] = useState<PublicSiteSettings | null>(null);

  useEffect(() => {
    api.publicSiteSettings().then(setSettings).catch(() => setSettings(null));
  }, []);

  const c = settings?.contact;
  const heroHeadline = settings?.hero.tagline || "We're here to help";
  const brandName = settings?.branding.brandName || "Web Invite";

  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl px-6 py-14">
        {/* Intro */}
        <div className="text-center">
          <span
            className="text-[11px] font-medium tracking-[0.28em] text-[#c9497c]"
            style={{ fontFamily: "var(--f-body)" }}
          >
            CONTACT
          </span>
          <h1
            className="mt-3 text-4xl font-medium italic text-[#5a2338] sm:text-5xl"
            style={{ fontFamily: "var(--f-serif)" }}
          >
            {heroHeadline}
          </h1>
          {c?.responseTime ? (
            <p
              className="mt-3 text-[15px] font-light text-[rgba(90,35,56,0.7)]"
              style={{ fontFamily: "var(--f-body)" }}
            >
              {c.responseTime}
            </p>
          ) : null}
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          {/* Contact info */}
          <div
            className="space-y-6 rounded-2xl border border-[rgba(201,73,124,0.15)] bg-[#fdf1e2] p-6 sm:p-8"
            style={{ fontFamily: "var(--f-body)" }}
          >
            <InfoRow label="Contact email" value={c?.contactEmail} href={c?.contactEmail ? `mailto:${c.contactEmail}` : undefined} />
            <InfoRow label="Careers email" value={c?.careersEmail} href={c?.careersEmail ? `mailto:${c.careersEmail}` : undefined} />
            <InfoRow label="Phone" value={c?.phone} href={c?.phone ? `tel:${c.phone.replace(/\s+/g, "")}` : undefined} />
            <InfoRow label="Office hours" value={c?.officeHours} />
            <InfoRow label="Address" value={c?.address} />
            {c?.calendarUrl ? (
              <a
                href={c.calendarUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#d95f48] px-5 py-2.5 text-[13px] font-medium text-white shadow-[0_10px_24px_rgba(217,95,72,0.3)] transition-colors hover:bg-[#c14e38]"
              >
                <span>Book a discovery call</span>
                <span aria-hidden>→</span>
              </a>
            ) : null}
          </div>

          {/* Form */}
          <ContactForm brandName={brandName} />
        </div>
      </div>
    </PublicShell>
  );
}

function InfoRow({ label, value, href }: { label: string; value?: string | null; href?: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[rgba(90,35,56,0.55)]">{label}</p>
      <div className="mt-1 text-[15px] text-[#5a2338]">
        {value ? (
          href ? (
            <a href={href} className="hover:text-[#d95f48] hover:underline">{value}</a>
          ) : (
            <span>{value}</span>
          )
        ) : (
          <span className="text-[rgba(90,35,56,0.4)]">— not set —</span>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Form ---------------------------------- */

function ContactForm({ brandName }: { brandName: string }) {
  const [form, setForm] = useState<ContactMessageInput>({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    source: "contact-page",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ receivedAt: string } | null>(null);

  const patch = (k: keyof ContactMessageInput, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.submitContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone?.trim() || undefined,
        subject: form.subject?.trim() || undefined,
        message: form.message.trim(),
        source: form.source,
      });
      setSent({ receivedAt: r.receivedAt });
      setForm({ name: "", email: "", phone: "", subject: "", message: "", source: "contact-page" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-2xl border border-[rgba(92,138,94,0.3)] bg-white p-10 text-center shadow-[0_10px_30px_rgba(122,44,44,0.05)]"
        style={{ fontFamily: "var(--f-body)" }}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eaf6ea] text-[#2f6b50]">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5 9-11" />
          </svg>
        </span>
        <h2 className="text-2xl font-medium italic text-[#5a2338]" style={{ fontFamily: "var(--f-serif)" }}>
          Message received
        </h2>
        <p className="max-w-md text-[14.5px] text-[rgba(90,35,56,0.7)]">
          Thanks — the {brandName} team will be in touch soon. We usually reply within a business day.
        </p>
        <button
          onClick={() => setSent(null)}
          className="mt-2 rounded-full border border-[rgba(90,35,56,0.2)] px-4 py-2 text-[13px] font-medium text-[#5a2338] hover:border-[#d95f48] hover:text-[#d95f48]"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl border border-[rgba(201,73,124,0.15)] bg-white p-6 shadow-[0_10px_30px_rgba(122,44,44,0.05)] sm:p-8"
      style={{ fontFamily: "var(--f-body)" }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Your name" required>
          <input
            required
            value={form.name}
            onChange={(e) => patch("name", e.target.value)}
            className={fieldCls}
            placeholder="First and last name"
          />
        </FormField>
        <FormField label="Email" required>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => patch("email", e.target.value)}
            className={fieldCls}
            placeholder="you@example.com"
          />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Phone (optional)">
          <input
            value={form.phone || ""}
            onChange={(e) => patch("phone", e.target.value)}
            className={fieldCls}
            placeholder="+971 …"
          />
        </FormField>
        <FormField label="Subject (optional)">
          <input
            value={form.subject || ""}
            onChange={(e) => patch("subject", e.target.value)}
            className={fieldCls}
            placeholder="What is this about?"
          />
        </FormField>
      </div>
      <FormField label="Message" required>
        <textarea
          required
          minLength={5}
          value={form.message}
          onChange={(e) => patch("message", e.target.value)}
          className={fieldCls + " min-h-[130px] resize-y"}
          placeholder="Tell us what you need — dates, venue, style, anything at all."
        />
      </FormField>

      {error ? (
        <p className="rounded-lg border border-[rgba(217,95,72,0.4)] bg-[#fbe0d8] px-3 py-2 text-sm text-[#7a2418]">{error}</p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-[rgba(90,35,56,0.55)]">
          By sending, you agree we can email you back about this message.
        </p>
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-[#d95f48] px-6 py-2.5 text-[13px] font-medium text-white shadow-[0_10px_24px_rgba(217,95,72,0.3)] transition-colors hover:bg-[#c14e38] disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}

const fieldCls =
  "w-full rounded-lg border border-[rgba(90,35,56,0.2)] bg-white px-3 py-2 text-[14px] text-[#5a2338] outline-none focus:border-[#c9497c]";

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-[12.5px] font-medium text-[rgba(90,35,56,0.75)]">
        {label}
        {required ? <span className="text-[#d95f48]">*</span> : null}
      </span>
      {children}
    </label>
  );
}
