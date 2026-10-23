"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { ErrorNote, Field, Modal, api, btnGhost, btnPrimary, inputCls } from "@/components/ui";
import { day } from "@/lib/format";
import { hm, istParts, toMinutes } from "@/lib/ist";
import type { AttendanceStatus } from "@/lib/types";

type Rec = { date: string; status: AttendanceStatus; inTime?: string; outTime?: string; self: boolean; note?: string };

const META: Record<AttendanceStatus, { label: string; cell: string; dot: string }> = {
  present: { label: "Present", cell: "bg-[#4CAF2E] text-white", dot: "bg-[#4CAF2E]" },
  "half-day": { label: "Half day", cell: "bg-amber-400 text-white", dot: "bg-amber-400" },
  absent: { label: "Absent", cell: "bg-red-500 text-white", dot: "bg-red-500" },
  leave: { label: "Leave", cell: "bg-sky-500 text-white", dot: "bg-sky-500" },
  "week-off": { label: "Week off", cell: "bg-zinc-400 text-white", dot: "bg-zinc-400" },
  holiday: { label: "Holiday", cell: "bg-purple-500 text-white", dot: "bg-purple-500" },
};
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/* a ticking clock without an effect: React re-reads the second every time it fires */
const subscribe = (cb: () => void) => {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
};
const useSecond = () => useSyncExternalStore(subscribe, () => Math.floor(Date.now() / 1000), () => 0);

const shiftMonth = (m: string, by: number) => {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function MeView(p: { name: string; role: string; greeting: string; today: string; joinedOn: string; month: string; records: Rec[]; payableDays: number | null; minutesWorked: number }) {
  const router = useRouter();
  const sec = useSecond();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pw, setPw] = useState(false);
  const [sel, setSel] = useState<string | null>(null);

  const first = p.name.split(" ")[0];
  const rec = p.records.find((r) => r.date === p.today);
  const live = sec ? istParts(new Date(sec * 1000)) : null;
  const clock = live ? `${String(live.hour % 12 || 12).padStart(2, "0")}:${live.time.slice(3)}` : "--:--";
  const ampm = live ? (live.hour < 12 ? "AM" : "PM") : "";
  const state: "none" | "in" | "done" | "owner" = !rec ? "none" : !rec.self ? "owner" : rec.outTime ? "done" : "in";
  const elapsed = state === "in" && live && rec?.inTime ? Math.max(0, live.minutes - toMinutes(rec.inTime)) : 0;

  const act = async (action: "in" | "out") => {
    setBusy(true);
    setErr("");
    const r = await api("/api/me/attendance", "POST", { action });
    setBusy(false);
    if (r.ok) router.refresh();
    else setErr(r.error);
  };
  const signOut = async () => {
    await api("/api/me/logout", "POST");
    router.replace("/staff-login");
    router.refresh();
  };

  /* ---- the month ---- */
  const [y, mo] = p.month.split("-").map(Number);
  const dim = new Date(y, mo, 0).getDate();
  const lead = new Date(y, mo - 1, 1).getDay();
  const byDate = new Map(p.records.map((r) => [r.date, r]));
  const count = (s: AttendanceStatus) => p.records.filter((r) => r.status === s).length;
  const thisMonth = p.today.slice(0, 7);
  const picked = sel ? byDate.get(sel) : undefined;
  const tiles: { s: AttendanceStatus; n: number }[] = [
    { s: "present", n: count("present") },
    { s: "half-day", n: count("half-day") },
    { s: "absent", n: count("absent") },
    { s: "leave", n: count("leave") },
  ];

  return (
    <main className="min-h-[100dvh] bg-[#f3f5f2] pb-10 text-[#0a0a0c]">
      {/* header */}
      <header className="relative overflow-hidden bg-[#0a0a0c] px-5 pb-24 pt-5 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(520px_300px_at_90%_-10%,rgba(103,221,37,.32),transparent_70%)]" />
        <div className="relative mx-auto flex max-w-lg items-center justify-between">
          <Image src="/images/logo-wordmark.png" alt="Cycle Wala" width={130} height={28} priority className="h-auto w-[120px]" />
          <button onClick={signOut} className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white/85 hover:bg-white/10">
            Sign out
          </button>
        </div>
        <div className="relative mx-auto mt-6 flex max-w-lg items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#4CAF2E] text-2xl font-extrabold shadow-lg shadow-[#4CAF2E]/30">{p.name.slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white/60">{p.greeting}</p>
            <h1 className="truncate text-2xl font-extrabold tracking-tight">{first}</h1>
            <p className="truncate text-xs font-bold uppercase tracking-[0.14em] text-[#67DD25]">{p.role}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto -mt-16 max-w-lg space-y-5 px-4">
        {/* today */}
        <section className="relative overflow-hidden rounded-[2rem] bg-white p-6 text-center shadow-xl shadow-black/10 ring-1 ring-black/5">
          <p className="text-sm font-bold text-black/50">{day(p.today)}</p>
          <p className="mt-1 text-6xl font-extrabold tabular-nums tracking-tight">
            {clock}
            <span className="ml-1.5 text-lg font-bold text-black/40">{ampm}</span>
          </p>

          <div className="mt-6 grid place-items-center">
            {state === "none" || state === "in" ? (
              <div className="relative grid h-44 w-44 place-items-center">
                <span className={`absolute inset-0 animate-ping rounded-full opacity-25 ${state === "none" ? "bg-[#4CAF2E]" : "bg-amber-500"}`} style={{ animationDuration: "2.4s" }} />
                <span className={`absolute inset-3 rounded-full opacity-20 ${state === "none" ? "bg-[#4CAF2E]" : "bg-amber-500"}`} />
                <button
                  onClick={() => act(state === "none" ? "in" : "out")}
                  disabled={busy}
                  aria-label={state === "none" ? "Check in" : "Check out"}
                  className={`relative grid h-36 w-36 place-items-center rounded-full text-white shadow-2xl transition active:scale-95 disabled:opacity-60 ${state === "none" ? "bg-gradient-to-br from-[#67DD25] to-[#3c8a24] shadow-[#4CAF2E]/50" : "bg-gradient-to-br from-amber-400 to-orange-600 shadow-orange-500/40"}`}
                >
                  <span>
                    <svg viewBox="0 0 24 24" className="mx-auto h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {state === "none" ? <path d="M15 4h4v16h-4M10 8l4 4-4 4M14 12H4" /> : <path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9" />}
                    </svg>
                    <span className="mt-1 block text-lg font-extrabold">{busy ? "Wait…" : state === "none" ? "Check in" : "Check out"}</span>
                  </span>
                </button>
              </div>
            ) : state === "done" ? (
              <div className="grid h-36 w-36 place-items-center rounded-full bg-[#4CAF2E]/12 text-[#3c8a24] ring-8 ring-[#4CAF2E]/10">
                <span>
                  <svg viewBox="0 0 24 24" className="mx-auto h-12 w-12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7" />
                  </svg>
                  <span className="block text-sm font-extrabold">Day complete</span>
                </span>
              </div>
            ) : (
              <div className="rounded-3xl bg-black/[0.04] px-6 py-5">
                <span className={`inline-block h-3 w-3 rounded-full ${META[rec!.status].dot}`} />
                <p className="mt-2 text-lg font-extrabold">Marked {META[rec!.status].label.toLowerCase()}</p>
                <p className="text-sm text-black/55">by the owner. Ask them if it needs changing.</p>
              </div>
            )}
          </div>

          {state === "in" ? (
            <p className="mt-4 text-sm font-semibold text-black/60">
              Checked in at <b className="text-black">{rec?.inTime}</b> · working for <b className="text-[#3c8a24]">{hm(elapsed)}</b>
            </p>
          ) : state === "done" ? (
            <p className="mt-4 text-sm font-semibold text-black/60">
              <b className="text-black">{rec?.inTime}</b> to <b className="text-black">{rec?.outTime}</b> · worked <b className="text-[#3c8a24]">{hm(toMinutes(rec!.outTime!) - toMinutes(rec!.inTime!))}</b>
            </p>
          ) : state === "none" ? (
            <p className="mt-4 text-sm text-black/50">Tap the button when you reach the shop.</p>
          ) : null}
          {err ? (
            <div className="mt-4 text-left">
              <ErrorNote text={err} />
            </div>
          ) : null}
        </section>

        {/* month */}
        <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <Link href={`/me?month=${shiftMonth(p.month, -1)}`} aria-label="Previous month" className="grid h-10 w-10 place-items-center rounded-full bg-black/5 text-lg font-extrabold hover:bg-black/10">
              ‹
            </Link>
            <h2 className="text-lg font-extrabold">
              {MONTHS[mo - 1]} {y}
            </h2>
            {p.month < thisMonth ? (
              <Link href={`/me?month=${shiftMonth(p.month, 1)}`} aria-label="Next month" className="grid h-10 w-10 place-items-center rounded-full bg-black/5 text-lg font-extrabold hover:bg-black/10">
                ›
              </Link>
            ) : (
              <span className="h-10 w-10" />
            )}
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {tiles.map((t) => (
              <div key={t.s} className="rounded-2xl bg-[#f6f7f5] px-2 py-3 text-center">
                <p className="text-2xl font-extrabold">{t.n}</p>
                <p className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-bold text-black/55">
                  <span className={`h-2 w-2 rounded-full ${META[t.s].dot}`} />
                  {META[t.s].label.replace(" day", "")}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-[#eef7ea] px-4 py-3">
              <p className="text-xs font-bold text-[#3c8a24]">Days counted for pay</p>
              <p className="text-xl font-extrabold">{p.payableDays === null ? "–" : p.payableDays}</p>
            </div>
            <div className="rounded-2xl bg-[#eef7ea] px-4 py-3">
              <p className="text-xs font-bold text-[#3c8a24]">Hours at work</p>
              <p className="text-xl font-extrabold">{hm(p.minutesWorked)}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-1.5 text-center text-[11px] font-extrabold uppercase tracking-wide text-black/40">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-1.5">
            {Array.from({ length: lead }).map((_, i) => (
              <span key={`b${i}`} />
            ))}
            {Array.from({ length: dim }).map((_, i) => {
              const date = `${p.month}-${String(i + 1).padStart(2, "0")}`;
              const r = byDate.get(date);
              const future = date > p.today;
              const before = date < p.joinedOn;
              const isToday = date === p.today;
              return (
                <button
                  key={date}
                  onClick={() => setSel(sel === date ? null : date)}
                  disabled={future || before}
                  aria-label={`${day(date)}${r ? ` ${META[r.status].label}` : ""}`}
                  className={`grid aspect-square place-items-center rounded-xl text-sm font-extrabold transition disabled:cursor-default ${r ? META[r.status].cell : future || before ? "text-black/20" : "bg-black/[0.05] text-black/45"} ${isToday ? "ring-2 ring-[#0a0a0c] ring-offset-2" : ""} ${sel === date ? "scale-95 outline outline-2 outline-offset-1 outline-[#0a0a0c]" : ""}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[11px] font-bold text-black/55">
            {(Object.keys(META) as AttendanceStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${META[s].dot}`} />
                {META[s].label}
              </span>
            ))}
          </div>

          {sel ? (
            <div className="mt-4 rounded-2xl bg-[#f6f7f5] px-4 py-3 text-sm">
              <p className="font-extrabold">{day(sel)}</p>
              {picked ? (
                <p className="text-black/65">
                  {META[picked.status].label}
                  {picked.inTime ? ` · in ${picked.inTime}` : ""}
                  {picked.outTime ? ` · out ${picked.outTime}` : ""}
                  {picked.note ? ` · ${picked.note}` : ""}
                  {picked.self ? " · marked by you" : " · marked by the owner"}
                </p>
              ) : (
                <p className="text-black/55">Nothing was marked for this day.</p>
              )}
            </div>
          ) : null}
        </section>

        <div className="flex justify-center">
          <button onClick={() => setPw(true)} className={btnGhost}>
            Change my password
          </button>
        </div>
      </div>

      {pw ? <PasswordForm onClose={() => setPw(false)} /> : null}
    </main>
  );
}

function PasswordForm({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await api("/api/me/password", "POST", { current, next });
    setBusy(false);
    if (r.ok) setDone(true);
    else setErr(r.error);
  };
  return (
    <Modal title="Change my password" onClose={onClose}>
      {done ? (
        <div className="space-y-4">
          <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">Your password is changed.</p>
          <button className={btnPrimary} onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={save} className="space-y-4">
          <Field label="Current password">
            <input className={inputCls} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" autoFocus required />
          </Field>
          <Field label="New password" hint="At least 6 characters.">
            <input className={inputCls} type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
          </Field>
          <ErrorNote text={err} />
          <div className="flex gap-3">
            <button className={btnPrimary} disabled={busy}>
              {busy ? "Saving…" : "Save password"}
            </button>
            <button type="button" className={btnGhost} onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
