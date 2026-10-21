"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Empty, ErrorNote, Field, Modal, api, btnGhost, btnPrimary, inputCls } from "@/components/ui";
import { day, inr, today } from "@/lib/format";
import type { PayrollEntry, StaffMember } from "@/lib/types";

type Row = { staff: StaffMember; entry: PayrollEntry };
const pad = (n: number) => String(n).padStart(2, "0");
const shift = (m: string, by: number) => {
  const [y, mo] = m.split("-").map(Number);
  const x = new Date(y, mo - 1 + by, 1);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}`;
};
const monthName = (m: string) => new Date(m + "-01T00:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const dec = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export default function PayrollView({ month, rows }: { month: string; rows: Row[] }) {
  const router = useRouter();
  const [paying, setPaying] = useState<Row | null>(null);
  const go = (m: string) => router.push(`/payroll?month=${m}`);
  const total = rows.reduce((n, r) => n + r.entry.net, 0);
  const due = rows.filter((r) => !r.entry.paid).reduce((n, r) => n + r.entry.net, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Payroll</h1>
          <p className="text-black/60">
            Salary worked out from attendance · total <b>{inr(total)}</b> · still to pay <b className="text-[#b3261e]">{inr(due)}</b>
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className={btnGhost} onClick={() => go(shift(month, -1))} aria-label="Previous month">
            ←
          </button>
          <span className="min-w-[9rem] text-center font-extrabold">{monthName(month)}</span>
          <button className={btnGhost} onClick={() => go(shift(month, 1))} aria-label="Next month">
            →
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty title="No payroll for this month" note="Add staff and mark their attendance — their salary shows up here.">
          <Link href="/staff" className={btnPrimary}>
            Go to Staff
          </Link>
        </Empty>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <PayRow key={r.entry._id + r.entry.bonus + r.entry.deductions + String(r.entry.paid)} r={r} month={month} onPay={() => setPaying(r)} onChanged={() => router.refresh()} />
          ))}
        </div>
      )}

      <p className="text-xs text-black/50">
        Monthly salary = pay ÷ days in the month × payable days (present, half-days as ½, paid leave, week-offs, holidays). Absent and unmarked days are unpaid. Daily-wage staff are paid for days worked only. Overtime is paid at the normal hourly rate. Advances are taken back automatically.
      </p>

      {paying ? <PayForm row={paying} month={month} onClose={() => setPaying(null)} onSaved={() => { setPaying(null); router.refresh(); }} /> : null}
    </div>
  );
}

function PayRow({ r, month, onPay, onChanged }: { r: Row; month: string; onPay: () => void; onChanged: () => void }) {
  const e = r.entry;
  const [bonus, setBonus] = useState(e.bonus ? String(e.bonus) : "");
  const [ded, setDed] = useState(e.deductions ? String(e.deductions) : "");
  const [err, setErr] = useState("");
  const save = async () => {
    if (e.paid || (Number(bonus || 0) === e.bonus && Number(ded || 0) === e.deductions)) return;
    setErr("");
    const res = await api("/api/payroll", "POST", { staffId: r.staff._id, month, bonus, deductions: ded });
    if (res.ok) onChanged();
    else setErr(res.error);
  };
  const small = "w-28 rounded-lg border border-black/15 px-2.5 py-1.5 text-sm outline-none focus:border-[#4CAF2E] disabled:bg-black/5";

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#0a0a0c] font-extrabold text-white">{r.staff.name.slice(0, 1).toUpperCase()}</span>
        <div>
          <p className="font-extrabold">{r.staff.name}</p>
          <p className="text-xs text-black/50">
            {r.staff.role} · {inr(r.staff.salary)} / {r.staff.salaryType === "monthly" ? "month" : r.staff.salaryType === "daily" ? "day" : "hour"}
          </p>
        </div>
        {e.paid ? <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-extrabold text-green-800">paid {day(e.paidOn)}</span> : null}
        <div className="ml-auto text-right">
          <p className="text-xs font-bold uppercase tracking-wider text-black/50">Net pay</p>
          <p className="text-2xl font-extrabold text-[#3c8a24]">{inr(e.net)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-6">
        <Stat k="Present" v={dec(e.presentDays)} />
        <Stat k="Half days" v={dec(e.halfDays)} />
        <Stat k="Leave" v={dec(e.leaveDays)} />
        <Stat k="Week off / holiday" v={dec(e.weekOffDays + e.holidayDays)} />
        <Stat k="Absent" v={dec(e.absentDays)} warn={e.absentDays > 0} />
        <Stat k="Not marked" v={dec(e.unmarkedDays)} warn={e.unmarkedDays > 0} />
      </div>
      {e.unmarkedDays > 0 && !e.paid ? (
        <p className="mt-2 text-xs font-semibold text-amber-700">
          {e.unmarkedDays} day{e.unmarkedDays === 1 ? "" : "s"} not marked yet are counted as unpaid. <Link href="/attendance" className="underline">Mark attendance</Link>
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3 border-t border-black/5 pt-4 text-sm">
        <Calc k={`Basic (${dec(e.payableDays)} ${r.staff.salaryType === "hourly" ? "days" : "payable days"})`} v={inr(e.basic)} />
        <Calc k={`Overtime (${dec(e.overtimeHours)} h)`} v={inr(e.overtimePay)} />
        <label className="font-semibold">
          <span className="block text-xs text-black/50">Bonus (₹)</span>
          <input className={small} inputMode="decimal" value={bonus} onChange={(x) => setBonus(x.target.value)} onBlur={save} disabled={e.paid} />
        </label>
        <label className="font-semibold">
          <span className="block text-xs text-black/50">Deductions (₹)</span>
          <input className={small} inputMode="decimal" value={ded} onChange={(x) => setDed(x.target.value)} onBlur={save} disabled={e.paid} />
        </label>
        <Calc k="Advance taken back" v={e.advances ? `- ${inr(e.advances)}` : "-"} />
        <div className="ml-auto flex gap-2">
          <Link href={`/payroll/slip/${r.staff._id}/${month}`} className={btnGhost}>
            Salary slip
          </Link>
          {!e.paid ? (
            <button className={btnPrimary} onClick={onPay} disabled={e.net <= 0 && e.advances <= 0}>
              Mark paid
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-2">
        <ErrorNote text={err} />
      </div>
    </div>
  );
}

const Stat = ({ k, v, warn }: { k: string; v: string; warn?: boolean }) => (
  <div className={`rounded-xl px-2 py-2 ${warn ? "bg-amber-50" : "bg-black/[0.04]"}`}>
    <p className={`text-lg font-extrabold ${warn ? "text-amber-700" : ""}`}>{v}</p>
    <p className="text-[11px] font-semibold text-black/50">{k}</p>
  </div>
);
const Calc = ({ k, v }: { k: string; v: string }) => (
  <div>
    <p className="text-xs text-black/50">{k}</p>
    <p className="font-extrabold">{v}</p>
  </div>
);

function PayForm({ row, month, onClose, onSaved }: { row: Row; month: string; onClose: () => void; onSaved: () => void }) {
  const [mode, setMode] = useState("cash");
  const [date, setDate] = useState(today());
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await api("/api/payroll/pay", "POST", { staffId: row.staff._id, month, mode, date });
    setBusy(false);
    if (r.ok) onSaved();
    else setErr(r.error);
  };
  return (
    <Modal title={`Pay ${row.staff.name}`} onClose={onClose}>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <p className="text-sm text-black/60 sm:col-span-2">
          Net pay for {monthName(month)}: <b>{inr(row.entry.net)}</b>. Once paid, the amount is locked{row.entry.advances ? ` and ${inr(row.entry.advances)} of advance is taken back` : ""}.
        </p>
        <Field label="Paid by">
          <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank">Bank transfer</option>
            <option value="cheque">Cheque</option>
          </select>
        </Field>
        <Field label="Date">
          <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <ErrorNote text={err} />
        </div>
        <div className="flex gap-3 sm:col-span-2">
          <button className={btnPrimary} disabled={busy}>
            {busy ? "Saving…" : "Confirm payment"}
          </button>
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
