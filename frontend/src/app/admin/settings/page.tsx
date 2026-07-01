"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api, type MailSettings } from "@/lib/api";

const PRESETS: { label: string; host: string; port: string }[] = [
  { label: "Gmail", host: "smtp.gmail.com", port: "465" },
  { label: "Outlook / Microsoft 365", host: "smtp.office365.com", port: "587" },
  { label: "Zoho", host: "smtp.zoho.com", port: "465" },
  { label: "Brevo (Sendinblue)", host: "smtp-relay.brevo.com", port: "587" },
];

function Lbl({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{children}</label>;
}

const inputCls =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400";

export default function MailSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    fromName: "",
    fromEmail: "",
    smtpHost: "",
    smtpPort: "",
    smtpUser: "",
    smtpPass: "",
    enabled: true,
  });
  const [passSet, setPassSet] = useState(false);
  const [live, setLive] = useState(false);
  const [from, setFrom] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [testTo, setTestTo] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const [testBusy, setTestBusy] = useState(false);

  const apply = (s: MailSettings) => {
    setForm((f) => ({
      ...f,
      fromName: s.fromName,
      fromEmail: s.fromEmail,
      smtpHost: s.smtpHost,
      smtpPort: s.smtpPort,
      smtpUser: s.smtpUser,
      smtpPass: "",
      enabled: s.enabled,
    }));
    setPassSet(s.smtpPassSet);
    setLive(s.live);
    setFrom(s.from);
  };

  useEffect(() => {
    if (loading) return;
    if (!user) return void router.push("/login");
    if (user.role !== "admin") return void router.push("/dashboard");
    setTestTo(user.email);
    api.getMailSettings().then(apply).catch((e) => setMsg((e as Error).message));
  }, [loading, user, router]);

  if (loading || !user || user.role !== "admin") {
    return <div className="flex h-dvh items-center justify-center text-slate-400">Loading…</div>;
  }

  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true);
    setMsg("");
    try {
      const body = {
        fromName: form.fromName,
        fromEmail: form.fromEmail,
        smtpHost: form.smtpHost,
        smtpPort: form.smtpPort,
        smtpUser: form.smtpUser,
        enabled: form.enabled,
        // only send a password when the admin typed a new one
        ...(form.smtpPass ? { smtpPass: form.smtpPass } : {}),
      };
      apply(await api.saveMailSettings(body));
      setMsg("Saved ✓");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    if (!testTo) return setTestMsg("Enter an address to send the test to.");
    setTestBusy(true);
    setTestMsg("");
    try {
      const r = await api.testMailSettings(testTo);
      if (r.ok && r.live) setTestMsg(`✓ Sent from ${r.from} to ${testTo}. Check the inbox.`);
      else if (r.ok && !r.live) setTestMsg("⚠ Saved but SMTP isn't live — set an SMTP host & enable sending to deliver real emails. (Logged in dev mode.)");
      else setTestMsg(`⚠ Failed: ${r.error}`);
    } catch (e) {
      setTestMsg(`⚠ ${(e as Error).message}`);
    } finally {
      setTestBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#f4f1ea]">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-800">← Admin</Link>
          <span className="font-display text-lg uppercase tracking-[0.12em] text-[#2b3a67]">Email settings</span>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] ${live ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
        >
          {live ? "● Live — real emails send" : "○ Dev mode — emails are logged, not sent"}
        </span>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        <p className="mb-6 text-sm text-slate-500">
          Set the address couples and you receive notifications from (RSVP exports, alerts).
          Notifications are sent <strong>from</strong> the address you configure here.
        </p>

        {/* From identity */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-display text-sm uppercase tracking-[0.12em] text-[#2b3a67]">Sender ("from")</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Lbl>From name</Lbl>
              <input className={inputCls} value={form.fromName} onChange={(e) => set("fromName", e.target.value)} placeholder="e.g. Eternal Invitations" />
            </div>
            <div>
              <Lbl>From email</Lbl>
              <input className={inputCls} type="email" value={form.fromEmail} onChange={(e) => set("fromEmail", e.target.value)} placeholder="e.g. weddings@yourdomain.com" />
            </div>
          </div>
          {from ? <p className="mt-2 text-xs text-slate-400">Recipients will see: <span className="font-medium text-slate-600">{from}</span></p> : null}
        </section>

        {/* SMTP */}
        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm uppercase tracking-[0.12em] text-[#2b3a67]">Sending server (SMTP)</h2>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} />
              Enable sending
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setForm((f) => ({ ...f, smtpHost: p.host, smtpPort: p.port }))}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-[#2b3a67] hover:text-[#2b3a67]"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Lbl>SMTP host</Lbl>
              <input className={inputCls} value={form.smtpHost} onChange={(e) => set("smtpHost", e.target.value)} placeholder="smtp.gmail.com" />
            </div>
            <div>
              <Lbl>Port</Lbl>
              <input className={inputCls} value={form.smtpPort} onChange={(e) => set("smtpPort", e.target.value)} placeholder="465 or 587" />
            </div>
            <div>
              <Lbl>Username</Lbl>
              <input className={inputCls} value={form.smtpUser} onChange={(e) => set("smtpUser", e.target.value)} placeholder="usually the full email" autoComplete="off" />
            </div>
            <div className="sm:col-span-2">
              <Lbl>Password / app password</Lbl>
              <input className={inputCls} type="password" value={form.smtpPass} onChange={(e) => set("smtpPass", e.target.value)} placeholder={passSet ? "•••••••• (saved — leave blank to keep)" : "app password"} autoComplete="new-password" />
              <p className="mt-1 text-[11px] text-slate-400">Gmail/Outlook need an <strong>app password</strong>, not your login password.</p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button onClick={save} disabled={busy} className="rounded-lg bg-[#2b3a67] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#23315a] disabled:opacity-60">
              {busy ? "Saving…" : "Save settings"}
            </button>
            {msg ? <span className="text-sm text-slate-500">{msg}</span> : null}
          </div>
        </section>

        {/* Test */}
        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-display text-sm uppercase tracking-[0.12em] text-[#2b3a67]">Send a test</h2>
          <p className="mt-1 text-xs text-slate-500">Save first, then send a test to confirm delivery.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input className={inputCls} type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" />
            <button onClick={sendTest} disabled={testBusy} className="shrink-0 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60">
              {testBusy ? "Sending…" : "Send test email"}
            </button>
          </div>
          {testMsg ? <p className="mt-2 text-sm text-slate-600">{testMsg}</p> : null}
        </section>
      </main>
    </div>
  );
}
