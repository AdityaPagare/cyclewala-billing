"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/components/ui";

const input = "w-full rounded-2xl border border-black/10 bg-[#f6f7f5] px-4 py-3.5 text-base font-medium outline-none transition placeholder:font-normal placeholder:text-black/35 focus:border-[#4CAF2E] focus:bg-white focus:ring-4 focus:ring-[#4CAF2E]/15";

export default function StaffLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await api("/api/me/login", "POST", { username, password });
    if (r.ok) {
      router.replace("/me");
      router.refresh();
      return;
    }
    setBusy(false);
    setError(r.error);
  };

  return (
    <main className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-[#0a0a0c] px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_420px_at_85%_-5%,rgba(103,221,37,.30),transparent_70%),radial-gradient(600px_380px_at_0%_105%,rgba(76,175,46,.22),transparent_70%)]" />
      <div className="relative w-full max-w-sm">
        <div className="mx-auto mb-6 w-fit">
          <Image src="/images/logo-wordmark.png" alt="Cycle Wala" width={170} height={37} priority className="h-auto w-[170px]" />
        </div>

        <form onSubmit={submit} className="rounded-[2rem] bg-white p-7 shadow-2xl shadow-black/40 sm:p-8">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#4CAF2E] text-white shadow-lg shadow-[#4CAF2E]/40">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <h1 className="mt-4 text-center text-2xl font-extrabold tracking-tight">Staff attendance</h1>
          <p className="mt-1 text-center text-sm text-black/55">Sign in with the username and password the owner gave you.</p>

          <label className="mt-6 block text-sm font-bold">
            Username
            <input className={`${input} mt-1.5`} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="e.g. ramesh" required />
          </label>
          <label className="mt-4 block text-sm font-bold">
            Password
            <div className="relative mt-1.5">
              <input className={`${input} pr-20`} type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Your password" required />
              <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-3 py-1.5 text-xs font-extrabold text-[#3c8a24] hover:bg-[#4CAF2E]/10">
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {error ? (
            <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={busy} className="mt-6 w-full rounded-full bg-[#4CAF2E] py-4 text-base font-extrabold text-white shadow-lg shadow-[#4CAF2E]/35 transition hover:bg-[#3c8a24] active:scale-[.99] disabled:opacity-60">
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="mt-5 text-center text-xs text-black/45">Forgot your password? Ask the owner to give you a new one.</p>
        </form>

        <p className="mt-6 text-center text-sm text-white/55">
          Are you the owner?{" "}
          <Link href="/login" className="font-bold text-[#67DD25] hover:underline">
            Owner sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
