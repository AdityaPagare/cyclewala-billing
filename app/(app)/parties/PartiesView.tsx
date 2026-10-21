"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { Empty, ErrorNote, Field, Modal, api, btnDanger, btnGhost, btnPrimary, inputCls } from "@/components/ui";
import { inr, today } from "@/lib/format";
import type { Party } from "@/lib/types";

export type PartyRow = Party & { balance: number };
const EMPTY = { name: "", phone: "", email: "", gstin: "", address: "", kind: "customer", openingBalance: "", creditLimit: "" };

export default function PartiesView({ parties }: { parties: PartyRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "owe" | "suppliers">("all");
  const [edit, setEdit] = useState<PartyRow | "new" | null>(null);
  const [pay, setPay] = useState<PartyRow | null>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return parties.filter((p) => (!s || `${p.name} ${p.phone} ${p.email ?? ""}`.toLowerCase().includes(s)) && (filter === "all" || (filter === "owe" ? p.balance > 0 : p.kind !== "customer")));
  }, [parties, q, filter]);
  const toCollect = parties.reduce((n, p) => n + Math.max(0, p.balance), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Parties</h1>
          <p className="text-black/60">
            {parties.length} {parties.length === 1 ? "party" : "parties"} · to collect <b className="text-[#b3261e]">{inr(toCollect)}</b>
          </p>
        </div>
        <button className={`${btnPrimary} ml-auto`} onClick={() => setEdit("new")}>
          <Icon name="plus" className="h-4 w-4" /> Add party
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input className={`${inputCls} max-w-sm`} placeholder="Search name, phone or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search parties" />
        {(["all", "owe", "suppliers"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-4 py-2 text-sm font-bold ${filter === f ? "bg-[#0a0a0c] text-white" : "bg-white ring-1 ring-black/10 hover:bg-black/5"}`}>
            {f === "all" ? "All" : f === "owe" ? "They owe me" : "Suppliers"}
          </button>
        ))}
      </div>

      {parties.length === 0 ? (
        <Empty title="No parties yet" note="Add your customers and suppliers. Each gets a ledger that shows every invoice and payment.">
          <button className={btnPrimary} onClick={() => setEdit("new")}>
            Add your first party
          </button>
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-black/[0.03] text-xs uppercase tracking-wider text-black/55">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3 text-right">Balance</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p._id} className="border-t border-black/5">
                  <td className="px-5 py-3 font-bold">
                    <Link href={`/parties/${p._id}`} className="hover:text-[#3c8a24]">
                      {p.name}
                    </Link>
                    {p.creditLimit && p.balance > p.creditLimit ? <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-extrabold text-red-700">over limit</span> : null}
                  </td>
                  <td className="px-3 py-3">{p.phone}</td>
                  <td className="px-3 py-3 capitalize">{p.kind}</td>
                  <td className={`px-3 py-3 text-right font-extrabold ${p.balance > 0 ? "text-[#b3261e]" : p.balance < 0 ? "text-[#3c8a24]" : "text-black/40"}`}>
                    {inr(Math.abs(p.balance))}
                    <span className="ml-1 text-xs font-semibold">{p.balance > 0 ? "to collect" : p.balance < 0 ? "advance" : ""}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {p.balance > 0 ? (
                        <button className={btnGhost} onClick={() => setPay(p)}>
                          Receive
                        </button>
                      ) : null}
                      <button className={btnGhost} onClick={() => setEdit(p)}>
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-black/50">
                    Nobody matches that.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {edit ? <PartyForm party={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); router.refresh(); }} /> : null}
      {pay ? <ReceiveForm party={pay} onClose={() => setPay(null)} onSaved={() => { setPay(null); router.refresh(); }} /> : null}
    </div>
  );
}

function PartyForm({ party, onClose, onSaved }: { party: PartyRow | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState(
    party ? { name: party.name, phone: party.phone, email: party.email ?? "", gstin: party.gstin ?? "", address: party.address ?? "", kind: party.kind, openingBalance: String(party.openingBalance || ""), creditLimit: party.creditLimit ? String(party.creditLimit) : "" } : EMPTY
  );
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = party ? await api(`/api/parties/${party._id}`, "PUT", f) : await api("/api/parties", "POST", f);
    setBusy(false);
    if (r.ok) onSaved();
    else setErr(r.error);
  };
  const remove = async () => {
    if (!party || !confirm(`Delete ${party.name}?`)) return;
    const r = await api(`/api/parties/${party._id}`, "DELETE");
    if (r.ok) onSaved();
    else setErr(r.error);
  };

  return (
    <Modal title={party ? "Edit party" : "Add party"} onClose={onClose}>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name *" className="sm:col-span-2">
          <input className={inputCls} value={f.name} onChange={set("name")} autoFocus required />
        </Field>
        <Field label="Phone">
          <input className={inputCls} value={f.phone} onChange={set("phone")} inputMode="tel" />
        </Field>
        <Field label="Email">
          <input className={inputCls} type="email" value={f.email} onChange={set("email")} />
        </Field>
        <Field label="Type">
          <select className={inputCls} value={f.kind} onChange={set("kind")}>
            <option value="customer">Customer</option>
            <option value="supplier">Supplier</option>
            <option value="both">Both</option>
          </select>
        </Field>
        <Field label="GSTIN">
          <input className={inputCls} value={f.gstin} onChange={set("gstin")} />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <textarea className={inputCls} rows={2} value={f.address} onChange={set("address")} />
        </Field>
        <Field label="Opening balance (₹)" hint="What they already owe you. Use a minus if you owe them.">
          <input className={inputCls} inputMode="decimal" value={f.openingBalance} onChange={set("openingBalance")} />
        </Field>
        <Field label="Credit limit (₹)" hint="Optional — flagged when they go over it.">
          <input className={inputCls} inputMode="decimal" value={f.creditLimit} onChange={set("creditLimit")} />
        </Field>
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
          {party ? (
            <button type="button" className={`${btnDanger} ml-auto`} onClick={remove}>
              Delete
            </button>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}

export function ReceiveForm({ party, onClose, onSaved }: { party: { _id: string; name: string; balance: number }; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(String(Math.max(0, party.balance) || ""));
  const [mode, setMode] = useState("cash");
  const [date, setDate] = useState(today());
  const [reference, setReference] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await api("/api/payments", "POST", { partyId: party._id, amount, mode, date, reference });
    setBusy(false);
    if (r.ok) onSaved();
    else setErr(r.error);
  };

  return (
    <Modal title={`Receive payment from ${party.name}`} onClose={onClose}>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <p className="text-sm text-black/60 sm:col-span-2">
          Outstanding <b>{inr(Math.max(0, party.balance))}</b>. The amount goes against their oldest unpaid invoices first.
        </p>
        <Field label="Amount received (₹) *">
          <input className={inputCls} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus required />
        </Field>
        <Field label="Paid by">
          <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="bank">Bank transfer</option>
            <option value="cheque">Cheque</option>
          </select>
        </Field>
        <Field label="Date">
          <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Reference">
          <input className={inputCls} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI ref / cheque no." />
        </Field>
        <div className="sm:col-span-2">
          <ErrorNote text={err} />
        </div>
        <div className="flex gap-3 sm:col-span-2">
          <button className={btnPrimary} disabled={busy}>
            {busy ? "Saving…" : "Save payment"}
          </button>
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
