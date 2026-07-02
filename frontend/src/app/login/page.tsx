"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user =
        mode === "login"
          ? await login(email, password)
          : await register(email, password, name);
      // return to where the user came from (e.g. the builder), if it's a safe
      // internal path; otherwise go to their default home
      const redirect = new URLSearchParams(window.location.search).get("redirect");
      const safe = redirect && redirect.startsWith("/") && !redirect.startsWith("//");
      router.push(safe ? redirect : user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError((err as Error).message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fff8f0] px-6">
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: "linear-gradient(90deg,#e3a23c,#e0705a,#c9497c,#7a5ba6)" }} />
      <div className="w-full max-w-sm rounded-2xl border border-[rgba(201,73,124,0.15)] bg-white p-8 shadow-[0_20px_50px_rgba(122,44,44,0.12)]">
        <Link
          href="/gallery"
          className="text-xs text-[rgba(90,35,56,0.55)] hover:text-[#d95f48]"
          style={{ fontFamily: "var(--f-body)" }}
        >
          ← Browse designs
        </Link>
        <h1
          className="mt-4 text-3xl font-medium italic text-[#5a2338]"
          style={{ fontFamily: "var(--f-serif)" }}
        >
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p className="mt-1 text-sm text-[rgba(90,35,56,0.65)]" style={{ fontFamily: "var(--f-body)" }}>
          {mode === "login"
            ? "Log in to manage your invitations."
            : "Sign up to build and publish your invitation."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "register" ? (
            <input
              className="w-full rounded-lg border border-[rgba(90,35,56,0.2)] bg-[#fdf4ec] px-3 py-2.5 text-sm text-[#5a2338] outline-none focus:border-[#c9497c]"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ fontFamily: "var(--f-body)" }}
            />
          ) : null}
          <input
            type="email"
            required
            className="w-full rounded-lg border border-[rgba(90,35,56,0.2)] bg-[#fdf4ec] px-3 py-2.5 text-sm text-[#5a2338] outline-none focus:border-[#c9497c]"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ fontFamily: "var(--f-body)" }}
          />
          <input
            type="password"
            required
            minLength={6}
            className="w-full rounded-lg border border-[rgba(90,35,56,0.2)] bg-[#fdf4ec] px-3 py-2.5 text-sm text-[#5a2338] outline-none focus:border-[#c9497c]"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ fontFamily: "var(--f-body)" }}
          />

          {error ? <p className="text-sm text-[#c14e38]">{error}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full py-2.5 text-sm font-medium shadow-[0_10px_24px_rgba(217,95,72,0.3)] transition hover:brightness-95 disabled:opacity-60"
            style={{ background: "var(--c-primary)", color: "var(--c-on-primary)", fontFamily: "var(--f-body)" }}
          >
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
          className="mt-4 w-full text-center text-sm text-[rgba(90,35,56,0.6)] hover:text-[#c9497c]"
          style={{ fontFamily: "var(--f-body)" }}
        >
          {mode === "login"
            ? "New here? Create an account"
            : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
