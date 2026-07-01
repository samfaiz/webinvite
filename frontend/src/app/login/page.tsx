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
      router.push(user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError((err as Error).message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f1ea] px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <Link href="/gallery" className="text-xs text-slate-400 hover:text-slate-600">
          ← Browse designs
        </Link>
        <h1 className="font-display mt-4 text-2xl uppercase tracking-[0.12em] text-[#2b3a67]">
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p className="font-body mt-1 text-sm text-slate-500">
          {mode === "login"
            ? "Log in to manage your invitations."
            : "Sign up to build and publish your invitation."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "register" ? (
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          ) : null}
          <input
            type="email"
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            minLength={6}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-[#2b3a67] py-2.5 text-sm font-medium text-white hover:bg-[#23315a] disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
          className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-800"
        >
          {mode === "login"
            ? "New here? Create an account"
            : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
