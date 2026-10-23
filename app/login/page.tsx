"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error || "Could not sign in. Please try again.");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[#0a0a0c] px-4 py-10">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(900px_500px_at_80%_-10%,rgba(76,175,46,.28),transparent_70%)]" />
      <form onSubmit={submit} className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
        <div className="mx-auto mb-6 w-fit rounded-full bg-[#0a0a0c] px-5 py-3">
          <Image src="/images/logo-wordmark.png" alt="Cycle Wala" width={170} height={37} priority className="h-auto w-[150px]" />
        </div>
        <h1 className="text-center text-2xl font-extrabold tracking-tight">Billing &amp; Staff</h1>
        <p className="mt-1 text-center text-sm text-black/55">Sign in to manage invoices, attendance and payroll.</p>

        <label className="mt-7 block text-sm font-bold">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            className="mt-1.5 w-full rounded-xl border border-black/15 px-4 py-3 text-[15px] font-normal outline-none transition focus:border-[#4CAF2E] focus:ring-4 focus:ring-[#4CAF2E]/15"
          />
        </label>
        <label className="mt-4 block text-sm font-bold">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="mt-1.5 w-full rounded-xl border border-black/15 px-4 py-3 text-[15px] font-normal outline-none transition focus:border-[#4CAF2E] focus:ring-4 focus:ring-[#4CAF2E]/15"
          />
        </label>

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-full bg-[#4CAF2E] py-3.5 text-[15px] font-extrabold text-white shadow-lg shadow-[#4CAF2E]/30 transition hover:bg-[#3c8a24] disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="mt-5 text-center text-sm text-black/50">
          Staff? <Link href="/staff-login" className="font-bold text-[#3c8a24] hover:underline">Sign in to mark attendance</Link>
        </p>
      </form>
    </main>
  );
}
