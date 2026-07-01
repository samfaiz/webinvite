"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, type IntegrationsStatus, type IntegrationsUpdate } from "@/lib/api";
import { AdminHeader } from "../AdminHeader";

const MODELS = [
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (balanced)" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (cheapest)" },
  { value: "claude-opus-4-8", label: "Claude Opus 4.8 (best)" },
];

function SourceBadge({ source }: { source: "admin" | "env" | null }) {
  if (!source) return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">not set</span>;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] ${source === "admin" ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"}`}>
      {source === "admin" ? "set in admin" : "from env"}
    </span>
  );
}

export default function AdminIntegrationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [st, setSt] = useState<IntegrationsStatus | null>(null);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  // editable fields
  const [aiKeyInput, setAiKeyInput] = useState("");
  const [aiModel, setAiModel] = useState("claude-sonnet-4-6");
  const [auditCron, setAuditCron] = useState(true);
  const [gaId, setGaId] = useState("");
  const [gaProp, setGaProp] = useState("");
  const [saInput, setSaInput] = useState("");

  const apply = useCallback((s: IntegrationsStatus) => {
    setSt(s);
    setAiModel(s.ai.model || "claude-sonnet-4-6");
    setAuditCron(s.seo.auditCron);
    setGaId(s.ga.measurementId || "");
    setGaProp(s.ga.propertyId || "");
    setAiKeyInput("");
    setSaInput("");
  }, []);

  const load = useCallback(async () => {
    try {
      apply(await api.getIntegrations());
    } catch (e) {
      setMsg((e as Error).message);
    }
  }, [apply]);

  useEffect(() => {
    if (loading) return;
    if (!user) return void router.push("/login");
    if (user.role !== "admin") return void router.push("/dashboard");
    load();
  }, [loading, user, router, load]);

  const save = async (extra: IntegrationsUpdate = {}) => {
    setSaving(true);
    setMsg("");
    try {
      const body: IntegrationsUpdate = {
        aiModel,
        auditCron,
        gaMeasurementId: gaId,
        gaPropertyId: gaProp,
        ...(aiKeyInput.trim() ? { aiApiKey: aiKeyInput.trim() } : {}),
        ...(saInput.trim() ? { gaServiceAccountJson: saInput.trim() } : {}),
        ...extra,
      };
      apply(await api.saveIntegrations(body));
      setMsg("Saved ✓");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const test = async (which: "ai" | "ga") => {
    setMsg(which === "ai" ? "Testing the API key…" : "Testing the GA connection…");
    try {
      const r = which === "ai" ? await api.testAiKey() : await api.testGa();
      setMsg(r.ok ? `${which === "ai" ? "Anthropic" : "Google Analytics"} connection OK ✓` : `Failed: ${r.error}`);
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  if (loading || !user || user.role !== "admin" || !st) {
    return <div className="flex h-screen items-center justify-center text-slate-400">Loading…</div>;
  }

  const input = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400";

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      <AdminHeader active="/admin/integrations" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-display text-2xl uppercase tracking-[0.1em] text-[#2b3a67]">Integrations</h1>
        <p className="mt-1 text-sm text-slate-500">API keys are encrypted (AES-256-GCM) before they touch the database and never shown again — only a masked preview.</p>

        {!st.encryption.dedicatedKey ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-2 text-xs text-amber-800">
            Encryption is using a key derived from <code>JWT_SECRET</code>. For production, set a dedicated <code>SECRETS_KEY</code> in the backend env (rotating JWT_SECRET would otherwise orphan saved secrets).
          </p>
        ) : null}

        {msg ? <p className="mt-4 rounded-lg bg-white px-4 py-2 text-sm text-slate-600 ring-1 ring-slate-200">{msg}</p> : null}

        {/* AI */}
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Claude (AI)</h2>
            <SourceBadge source={st.ai.source} />
          </div>

          <label className="mb-3 block text-xs text-slate-500">
            Anthropic API key {st.ai.hasKey ? <span className="text-slate-400">· current: <code>{st.ai.keyPreview}</code></span> : null}
            <input type="password" autoComplete="off" value={aiKeyInput} onChange={(e) => setAiKeyInput(e.target.value)}
              placeholder={st.ai.hasKey ? "Enter a new key to replace it" : "sk-ant-…"} className={`${input} mt-1`} />
          </label>

          <label className="mb-3 block text-xs text-slate-500">Model
            <select value={aiModel} onChange={(e) => setAiModel(e.target.value)} className={`${input} mt-1`}>
              {MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              {MODELS.every((m) => m.value !== aiModel) ? <option value={aiModel}>{aiModel}</option> : null}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={auditCron} onChange={(e) => setAuditCron(e.target.checked)} />
            Run the weekly SEO audit automatically
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => test("ai")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Test key</button>
            {st.ai.hasKey ? (
              <button onClick={() => save({ clearAiApiKey: true })} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50">Remove key</button>
            ) : null}
          </div>
        </section>

        {/* GA */}
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Google Analytics 4</h2>
            <SourceBadge source={st.ga.source} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-slate-500">Measurement ID <span className="text-slate-300">(tracking tag)</span>
              <input value={gaId} onChange={(e) => setGaId(e.target.value)} placeholder="G-XXXXXXXXXX" className={`${input} mt-1`} />
            </label>
            <label className="block text-xs text-slate-500">Property ID <span className="text-slate-300">(reporting)</span>
              <input value={gaProp} onChange={(e) => setGaProp(e.target.value)} placeholder="123456789" className={`${input} mt-1`} />
            </label>
          </div>

          <label className="mt-3 block text-xs text-slate-500">
            Service account JSON {st.ga.hasServiceAccount ? <span className="text-slate-400">· current: <code>{st.ga.serviceAccountPreview}</code></span> : null}
            <textarea value={saInput} onChange={(e) => setSaInput(e.target.value)} rows={4}
              placeholder={st.ga.hasServiceAccount ? "Paste new JSON to replace it" : '{"type":"service_account", ...}'}
              className={`${input} mt-1 font-mono text-[11px]`} />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => test("ga")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Test connection</button>
            {st.ga.hasServiceAccount ? (
              <button onClick={() => save({ clearGaServiceAccount: true })} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50">Remove service account</button>
            ) : null}
          </div>
        </section>

        <div className="mt-6 flex justify-end">
          <button onClick={() => save()} disabled={saving} className="rounded-lg bg-[#2b3a67] px-5 py-2 text-sm font-medium text-white hover:bg-[#23315a] disabled:opacity-60">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </main>
    </div>
  );
}
