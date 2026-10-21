"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/Icon";
import { Empty, ErrorNote, Field, Modal, api, btnDanger, btnGhost, btnPrimary, inputCls } from "@/components/ui";
import { day, inr, today } from "@/lib/format";
import type { Advance, StaffMember } from "@/lib/types";

type Row = StaffMember & { advanceOwed: number };
const EMPTY = { name: "", phone: "", role: "", salaryType: "monthly", salary: "", joinedOn: today(), active: true };
const PER: Record<string, string> = { monthly: "per month", daily: "per day", hourly: "per hour" };

export default function StaffView({ staff, advances }: { staff: Row[]; advances: Advance[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<Row | "new" | null>(null);
  const [adv, setAdv] = useState<Row | null>(null);
  const names = new Map(staff.map((s) => [s._id, s.name]));
  const active = staff.filter((s) => s.active);
  const done = () => {
    setEdit(null);
    setAdv(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Staff</h1>
          <p className="text-black/60">
            {active.length} active · monthly payroll about <b>{inr(active.filter((s) => s.salaryType === "monthly").reduce((n, s) => n + s.salary, 0))}</b>
          </p>
        </div>
        <button className={`${btnPrimary} ml-auto`} onClick={() => setEdit("new")}>
          <Icon name="plus" className="h-4 w-4" /> Add staff
        </button>
      </div>

      {staff.length === 0 ? (
        <Empty title="No staff yet" note="Add your team with their pay. Then mark attendance every day and payroll works out the salary for you.">
          <button className={btnPrimary} onClick={() => setEdit("new")}>
            Add your first staff member
          </button>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((s) => (
            <div key={s._id} className={`rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 ${s.active ? "" : "opacity-60"}`}>
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#4CAF2E] text-lg font-extrabold text-white">{s.name.slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0">
                  <p className="truncate font-extrabold">{s.name}</p>
                  <p className="truncate text-sm text-black/55">
                    {s.role}
                    {s.phone ? ` · ${s.phone}` : ""}
                  </p>
                </div>
                {!s.active ? <span className="ml-auto rounded-full bg-black/10 px-2.5 py-1 text-xs font-bold">inactive</span> : null}
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-2xl font-extrabold">{inr(s.salary)}</p>
                  <p className="text-xs text-black/50">{PER[s.salaryType]} · joined {day(s.joinedOn)}</p>
                </div>
                {s.advanceOwed > 0 ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800">advance {inr(s.advanceOwed)}</span> : null}
              </div>
              <div className="mt-4 flex gap-2">
                <button className={btnGhost} onClick={() => setEdit(s)}>
                  Edit
                </button>
                <button className={btnGhost} onClick={() => setAdv(s)} disabled={!s.active}>
                  Give advance
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {advances.length > 0 ? (
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="text-lg font-extrabold">Advances not yet taken back</h2>
          <p className="text-sm text-black/55">These come off the person&apos;s next salary automatically.</p>
          <ul className="mt-3 divide-y divide-black/5 text-sm">
            {advances.map((a) => (
              <li key={a._id} className="flex flex-wrap items-center gap-3 py-3">
                <b>{names.get(a.staffId) ?? "Former staff"}</b>
                <span className="text-black/50">
                  {day(a.date)}
                  {a.note ? ` · ${a.note}` : ""}
                </span>
                <b className="ml-auto">{inr(a.amount - a.settled)}</b>
                {a.settled === 0 ? (
                  <button
                    className={btnDanger}
                    onClick={async () => {
                      if (!confirm("Delete this advance?")) return;
                      const r = await api(`/api/advances/${a._id}`, "DELETE");
                      if (r.ok) router.refresh();
                      else alert(r.error);
                    }}
                  >
                    Delete
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {edit ? <StaffForm row={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSaved={done} /> : null}
      {adv ? <AdvanceForm row={adv} onClose={() => setAdv(null)} onSaved={done} /> : null}
    </div>
  );
}

function StaffForm({ row, onClose, onSaved }: { row: Row | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState(row ? { name: row.name, phone: row.phone ?? "", role: row.role, salaryType: row.salaryType as string, salary: String(row.salary), joinedOn: row.joinedOn, active: row.active } : EMPTY);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = row ? await api(`/api/staff/${row._id}`, "PUT", f) : await api("/api/staff", "POST", f);
    setBusy(false);
    if (r.ok) onSaved();
    else setErr(r.error);
  };
  const remove = async () => {
    if (!row || !confirm(`Delete ${row.name}?`)) return;
    const r = await api(`/api/staff/${row._id}`, "DELETE");
    if (r.ok) onSaved();
    else setErr(r.error);
  };

  return (
    <Modal title={row ? "Edit staff member" : "Add staff member"} onClose={onClose}>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name *" className="sm:col-span-2">
          <input className={inputCls} value={f.name} onChange={set("name")} autoFocus required />
        </Field>
        <Field label="Role">
          <input className={inputCls} value={f.role} onChange={set("role")} placeholder="Mechanic, Sales, Helper…" />
        </Field>
        <Field label="Phone">
          <input className={inputCls} value={f.phone} onChange={set("phone")} inputMode="tel" />
        </Field>
        <Field label="Paid">
          <select className={inputCls} value={f.salaryType} onChange={set("salaryType")}>
            <option value="monthly">Monthly salary</option>
            <option value="daily">Daily wage</option>
            <option value="hourly">Hourly</option>
          </select>
        </Field>
        <Field label={`Amount (₹ ${PER[f.salaryType]}) *`}>
          <input className={inputCls} inputMode="decimal" value={f.salary} onChange={set("salary")} required />
        </Field>
        <Field label="Joined on">
          <input className={inputCls} type="date" value={f.joinedOn} onChange={set("joinedOn")} />
        </Field>
        <label className="flex items-center gap-3 self-end pb-2 text-sm font-bold">
          <input type="checkbox" className="h-5 w-5 accent-[#4CAF2E]" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
          Currently working here
        </label>
        <div className="sm:col-span-2">
          <ErrorNote text={err} />
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button className={btnPrimary} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
          {row ? (
            <button type="button" className={`${btnDanger} ml-auto`} onClick={remove}>
              Delete
            </button>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}

function AdvanceForm({ row, onClose, onSaved }: { row: Row; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await api("/api/advances", "POST", { staffId: row._id, amount, date, note });
    setBusy(false);
    if (r.ok) onSaved();
    else setErr(r.error);
  };
  return (
    <Modal title={`Advance for ${row.name}`} onClose={onClose}>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <p className="text-sm text-black/60 sm:col-span-2">It is taken back from their next salary.{row.advanceOwed > 0 ? ` Already owed: ${inr(row.advanceOwed)}.` : ""}</p>
        <Field label="Amount (₹) *">
          <input className={inputCls} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus required />
        </Field>
        <Field label="Date">
          <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Note" className="sm:col-span-2">
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why / how it was given" />
        </Field>
        <div className="sm:col-span-2">
          <ErrorNote text={err} />
        </div>
        <div className="flex gap-3 sm:col-span-2">
          <button className={btnPrimary} disabled={busy}>
            {busy ? "Saving…" : "Save advance"}
          </button>
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
