"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Empty, ErrorNote, Modal, api, btnGhost, btnPrimary, inputCls } from "@/components/ui";
import { day } from "@/lib/format";
import type { AttendanceRecord, AttendanceStatus, StaffMember } from "@/lib/types";

const STATUS: { k: AttendanceStatus; label: string; short: string; on: string; cell: string }[] = [
  { k: "present", label: "Present", short: "P", on: "bg-[#4CAF2E] text-white", cell: "bg-green-100 text-green-800" },
  { k: "absent", label: "Absent", short: "A", on: "bg-red-600 text-white", cell: "bg-red-100 text-red-700" },
  { k: "half-day", label: "Half day", short: "½", on: "bg-amber-500 text-white", cell: "bg-amber-100 text-amber-800" },
  { k: "leave", label: "Leave", short: "L", on: "bg-sky-600 text-white", cell: "bg-sky-100 text-sky-800" },
  { k: "week-off", label: "Week off", short: "W", on: "bg-zinc-600 text-white", cell: "bg-zinc-200 text-zinc-700" },
  { k: "holiday", label: "Holiday", short: "H", on: "bg-purple-600 text-white", cell: "bg-purple-100 text-purple-800" },
];
const meta = (k: AttendanceStatus) => STATUS.find((s) => s.k === k)!;
const pad = (n: number) => String(n).padStart(2, "0");
const shiftDay = (d: string, by: number) => {
  const x = new Date(d + "T00:00:00");
  x.setDate(x.getDate() + by);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};
const shiftMonth = (m: string, by: number) => {
  const [y, mo] = m.split("-").map(Number);
  const x = new Date(y, mo - 1 + by, 1);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}`;
};
const monthName = (m: string) => new Date(m + "-01T00:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" });

type Draft = { status: AttendanceStatus; inTime: string; outTime: string; lateMinutes: string; overtimeHours: string; note: string };
const toDraft = (r?: AttendanceRecord): Draft => ({ status: r?.status ?? "present", inTime: r?.inTime ?? "", outTime: r?.outTime ?? "", lateMinutes: r?.lateMinutes ? String(r.lateMinutes) : "", overtimeHours: r?.overtimeHours ? String(r.overtimeHours) : "", note: r?.note ?? "" });

export default function AttendanceView({ staff, today, initial }: { staff: StaffMember[]; today: string; initial: AttendanceRecord[] }) {
  const [tab, setTab] = useState<"day" | "month">("day");
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [recs, setRecs] = useState<AttendanceRecord[]>(initial);
  const [monthRecs, setMonthRecs] = useState<AttendanceRecord[]>([]);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<{ s: StaffMember; date: string } | null>(null);

  const loadDay = useCallback(async (d: string) => {
    const r = await api<AttendanceRecord[]>(`/api/attendance?date=${d}`, "GET");
    if (r.ok) setRecs(r.data);
  }, []);
  const loadMonth = useCallback(async (m: string) => {
    const r = await api<AttendanceRecord[]>(`/api/attendance?month=${m}`, "GET");
    if (r.ok) setMonthRecs(r.data);
  }, []);
  // load when the person changes the day or month (not in an effect): the page already holds today's records
  const goDay = (d: string) => {
    setDate(d);
    void loadDay(d);
  };
  const goMonth = (m: string) => {
    setMonth(m);
    void loadMonth(m);
  };

  const byStaff = useMemo(() => new Map(recs.map((r) => [r.staffId, r])), [recs]);
  const here = staff.filter((s) => s.joinedOn <= date);

  const save = async (s: StaffMember, d: string, draft: Draft) => {
    setErr("");
    const r = await api<AttendanceRecord>("/api/attendance", "POST", { staffId: s._id, date: d, ...draft });
    if (!r.ok) return setErr(r.error);
    if (d === date) setRecs((rs) => [...rs.filter((x) => x.staffId !== s._id), r.data]);
    if (tab === "month") void loadMonth(month);
  };
  const clear = async (s: StaffMember, d: string) => {
    setErr("");
    const r = await api("/api/attendance", "DELETE", { staffId: s._id, date: d });
    if (!r.ok) return setErr(r.error);
    if (d === date) setRecs((rs) => rs.filter((x) => x.staffId !== s._id));
    if (tab === "month") void loadMonth(month);
  };
  const markAll = async (status: AttendanceStatus) => {
    setErr("");
    const r = await api("/api/attendance", "POST", { all: true, date, status });
    if (!r.ok) return setErr(r.error);
    await loadDay(date);
  };

  if (staff.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Attendance</h1>
        <Empty title="Add your staff first" note="Attendance is marked for each person on your team.">
          <Link href="/staff" className={btnPrimary}>
            Go to Staff
          </Link>
        </Empty>
      </div>
    );
  }

  const counts = STATUS.map((s) => ({ ...s, n: here.filter((p) => byStaff.get(p._id)?.status === s.k).length }));
  const unmarked = here.filter((p) => !byStaff.has(p._id)).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Attendance</h1>
          <p className="text-black/60">Tap a status to mark the day — it saves instantly.</p>
        </div>
        <div className="ml-auto flex gap-2 rounded-full bg-white p-1 ring-1 ring-black/10">
          {(["day", "month"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); if (t === "month") void loadMonth(month); }} className={`rounded-full px-5 py-2 text-sm font-bold ${tab === t ? "bg-[#0a0a0c] text-white" : "text-black/60 hover:bg-black/5"}`}>
              {t === "day" ? "Daily" : "Month"}
            </button>
          ))}
        </div>
      </div>
      <ErrorNote text={err} />

      {tab === "day" ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <button className={btnGhost} onClick={() => goDay(shiftDay(date, -1))} aria-label="Previous day">
              ←
            </button>
            <input type="date" className={`${inputCls} max-w-[11rem]`} value={date} onChange={(e) => e.target.value && goDay(e.target.value)} aria-label="Date" />
            <button className={btnGhost} onClick={() => goDay(shiftDay(date, 1))} aria-label="Next day">
              →
            </button>
            {date !== today ? (
              <button className={btnGhost} onClick={() => goDay(today)}>
                Today
              </button>
            ) : null}
            <span className="text-sm font-bold text-black/60">{day(date)}</span>
            <button className={`${btnPrimary} ml-auto`} onClick={() => markAll("present")} disabled={unmarked === 0}>
              Mark everyone present{unmarked ? ` (${unmarked})` : ""}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {counts.map((c) => (
              <span key={c.k} className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${c.cell}`}>
                {c.label} {c.n}
              </span>
            ))}
            <span className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-extrabold text-black/60">Not marked {unmarked}</span>
          </div>

          <div className="space-y-3">
            {here.map((s) => (
              <DayRow key={s._id + date} s={s} rec={byStaff.get(s._id)} onSave={(d) => save(s, date, d)} onClear={() => clear(s, date)} />
            ))}
            {here.length === 0 ? <p className="rounded-2xl bg-white p-6 text-center text-black/55">Nobody had joined by this date.</p> : null}
          </div>
        </>
      ) : (
        <MonthGrid staff={staff} month={month} setMonth={goMonth} recs={monthRecs} onPick={(s, d) => setEditing({ s, date: d })} />
      )}

      {editing ? (
        <Modal title={`${editing.s.name} — ${day(editing.date)}`} onClose={() => setEditing(null)}>
          <DayRow
            s={editing.s}
            rec={monthRecs.find((r) => r.staffId === editing.s._id && r.date === editing.date)}
            bare
            onSave={async (d) => {
              await save(editing.s, editing.date, d);
            }}
            onClear={async () => {
              await clear(editing.s, editing.date);
              setEditing(null);
            }}
          />
          <button className={`${btnGhost} mt-4`} onClick={() => setEditing(null)}>
            Done
          </button>
        </Modal>
      ) : null}
    </div>
  );
}

function DayRow({ s, rec, onSave, onClear, bare = false }: { s: StaffMember; rec?: AttendanceRecord; onSave: (d: Draft) => void | Promise<void>; onClear: () => void | Promise<void>; bare?: boolean }) {
  const [d, setD] = useState<Draft>(toDraft(rec));
  const worked = rec && (rec.status === "present" || rec.status === "half-day");
  const pick = (status: AttendanceStatus) => {
    if (rec?.status === status) return void onClear();
    const next = { ...d, status };
    setD(next);
    void onSave(next);
  };
  const blurSave = () => rec && void onSave({ ...d, status: rec.status });
  const field = "w-24 rounded-lg border border-black/15 px-2.5 py-1.5 text-sm outline-none focus:border-[#4CAF2E]";

  return (
    <div className={bare ? "" : "rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5"}>
      <div className="flex flex-wrap items-center gap-3">
        {!bare ? (
          <div className="flex min-w-[10rem] flex-1 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0a0a0c] font-extrabold text-white">{s.name.slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0">
              <p className="truncate font-extrabold">{s.name}</p>
              <p className="truncate text-xs text-black/50">
                {s.role}
                {rec?.source === "self" ? <span className="ml-2 rounded-full bg-[#4CAF2E]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#3c8a24]">marked by self</span> : null}
              </p>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Attendance for ${s.name}`}>
          {STATUS.map((x) => {
            const on = rec?.status === x.k;
            return (
              <button key={x.k} type="button" onClick={() => pick(x.k)} aria-pressed={on} title={on ? `${x.label} — tap again to clear` : x.label} className={`h-10 min-w-[2.6rem] rounded-xl px-3 text-sm font-extrabold transition ${on ? x.on : "bg-black/5 text-black/55 hover:bg-black/10"}`}>
                <span className="sm:hidden">{x.short}</span>
                <span className="hidden sm:inline">{x.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      {worked ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-black/5 pt-3 text-sm">
          <label className="flex items-center gap-2 font-semibold">
            In
            <input type="time" className={field} value={d.inTime} onChange={(e) => setD({ ...d, inTime: e.target.value })} onBlur={blurSave} />
          </label>
          <label className="flex items-center gap-2 font-semibold">
            Out
            <input type="time" className={field} value={d.outTime} onChange={(e) => setD({ ...d, outTime: e.target.value })} onBlur={blurSave} />
          </label>
          <label className="flex items-center gap-2 font-semibold">
            Late (min)
            <input className={`${field} w-20`} inputMode="numeric" value={d.lateMinutes} onChange={(e) => setD({ ...d, lateMinutes: e.target.value })} onBlur={blurSave} />
          </label>
          <label className="flex items-center gap-2 font-semibold">
            Overtime (hrs)
            <input className={`${field} w-20`} inputMode="decimal" value={d.overtimeHours} onChange={(e) => setD({ ...d, overtimeHours: e.target.value })} onBlur={blurSave} />
          </label>
        </div>
      ) : null}
    </div>
  );
}

function MonthGrid({ staff, month, setMonth, recs, onPick }: { staff: StaffMember[]; month: string; setMonth: (m: string) => void; recs: AttendanceRecord[]; onPick: (s: StaffMember, d: string) => void }) {
  const [y, m] = month.split("-").map(Number);
  const D = new Date(y, m, 0).getDate();
  const days = Array.from({ length: D }, (_, i) => i + 1);
  const map = new Map(recs.map((r) => [`${r.staffId}_${r.date}`, r]));
  const weekday = (d: number) => new Date(y, m - 1, d).toLocaleDateString("en-IN", { weekday: "narrow" });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button className={btnGhost} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
          ←
        </button>
        <span className="min-w-[10rem] text-center text-lg font-extrabold">{monthName(month)}</span>
        <button className={btnGhost} onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">
          →
        </button>
        <div className="ml-auto flex flex-wrap gap-2 text-xs font-bold">
          {STATUS.map((s) => (
            <span key={s.k} className={`rounded-full px-2.5 py-1 ${s.cell}`}>
              {s.short} {s.label}
            </span>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
        <table className="w-full border-collapse text-center text-xs">
          <thead>
            <tr className="bg-black/[0.03]">
              <th className="sticky left-0 z-10 min-w-[8rem] bg-[#f6f7f5] px-4 py-3 text-left text-sm">Staff</th>
              {days.map((d) => (
                <th key={d} className="px-0.5 py-2 font-bold text-black/55">
                  <div>{d}</div>
                  <div className="text-[10px] font-semibold text-black/35">{weekday(d)}</div>
                </th>
              ))}
              <th className="px-3 py-3">P</th>
              <th className="px-3 py-3">A</th>
              <th className="px-3 py-3">½</th>
              <th className="px-3 py-3">L</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const mine = days.map((d) => map.get(`${s._id}_${month}-${pad(d)}`));
              const n = (k: AttendanceStatus) => mine.filter((r) => r?.status === k).length;
              return (
                <tr key={s._id} className="border-t border-black/5">
                  <td className="sticky left-0 z-10 bg-white px-4 py-2 text-left text-sm font-bold">{s.name}</td>
                  {days.map((d, i) => {
                    const r = mine[i];
                    const date = `${month}-${pad(d)}`;
                    return (
                      <td key={d} className="p-0.5">
                        <button onClick={() => onPick(s, date)} disabled={s.joinedOn > date} aria-label={`${s.name} ${day(date)}`} className={`h-8 w-7 rounded-md text-[11px] font-extrabold transition hover:ring-2 hover:ring-black/20 disabled:opacity-20 ${r ? meta(r.status).cell : "bg-black/[0.04] text-black/20"}`}>
                          {r ? meta(r.status).short : "·"}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-3 font-extrabold text-green-700">{n("present")}</td>
                  <td className="px-3 font-extrabold text-red-600">{n("absent")}</td>
                  <td className="px-3 font-extrabold text-amber-700">{n("half-day")}</td>
                  <td className="px-3 font-extrabold text-sky-700">{n("leave")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-black/50">Tap any box to set or change that day.</p>
    </div>
  );
}
