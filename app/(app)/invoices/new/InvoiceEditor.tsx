"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { ErrorNote, Field, api, btnGhost, btnPrimary, inputCls } from "@/components/ui";
import { computeTotals } from "@/lib/calc";
import { inr, today } from "@/lib/format";
import type { Invoice, Item, Party } from "@/lib/types";

type Row = { key: number; itemId: string; name: string; hsn: string; serial: string; qty: string; unit: string; rate: string; discountPct: string; gstRate: number };
let seq = 1;
const blank = (): Row => ({ key: seq++, itemId: "", name: "", hsn: "", serial: "", qty: "1", unit: "pcs", rate: "", discountPct: "", gstRate: 0 });
const n = (s: string) => (s.trim() === "" || Number.isNaN(Number(s)) ? 0 : Number(s));

export default function InvoiceEditor({ parties, items, gstOn, startParty }: { parties: Party[]; items: Item[]; gstOn: boolean; startParty?: string }) {
  const router = useRouter();
  const [partyId, setPartyId] = useState(startParty && parties.some((p) => p._id === startParty) ? startParty : "");
  const [walkIn, setWalkIn] = useState("");
  const [date, setDate] = useState(today());
  const [dueDate, setDueDate] = useState("");
  const [interState, setInterState] = useState(false);
  const [rows, setRows] = useState<Row[]>([blank()]);
  const [notes, setNotes] = useState("");
  const [paidNow, setPaidNow] = useState("");
  const [mode, setMode] = useState("cash");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const t = useMemo(
    () =>
      computeTotals(
        rows.filter((r) => r.name.trim()).map((r) => ({ itemId: r.itemId || undefined, name: r.name, hsn: r.hsn, serial: r.serial, qty: n(r.qty), unit: r.unit, rate: n(r.rate), discountPct: n(r.discountPct), gstRate: r.gstRate })),
        { gst: gstOn, interState }
      ),
    [rows, gstOn, interState]
  );

  // the item choices, grouped by brand
  const groups = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const i of items) m.set(i.brand || "Other items", [...(m.get(i.brand || "Other items") ?? []), i]);
    return [...m.entries()].sort((a, b) => (a[0] === "Other items" ? 1 : b[0] === "Other items" ? -1 : a[0].localeCompare(b[0])));
  }, [items]);

  const patch = (key: number, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const pick = (key: number, id: string) => {
    const it = items.find((i) => i._id === id);
    if (!it) return patch(key, { itemId: "" });
    patch(key, { itemId: it._id, name: it.name, hsn: it.hsn ?? "", unit: it.unit, rate: String(it.salePrice), gstRate: it.gstRate });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    const lines = rows.filter((r) => r.name.trim());
    if (lines.length === 0) return setErr("Add at least one item.");
    setBusy(true);
    const r = await api<Invoice>("/api/invoices", "POST", {
      partyId: partyId || undefined,
      walkInName: walkIn,
      date,
      dueDate: dueDate || undefined,
      interState,
      notes,
      paidNow,
      paidMode: mode,
      lines: lines.map((l) => ({ itemId: l.itemId || undefined, name: l.name, hsn: l.hsn, serial: l.serial, qty: n(l.qty), unit: l.unit, rate: n(l.rate), discountPct: n(l.discountPct), gstRate: l.gstRate })),
    });
    setBusy(false);
    if (r.ok) {
      router.push(`/invoices/${r.data._id}`);
      router.refresh();
    } else setErr(r.error);
  };

  const stockWarn = (r: Row) => {
    const it = items.find((i) => i._id === r.itemId);
    return it && !it.isService && n(r.qty) > it.stock ? `Only ${it.stock} ${it.unit} in stock` : "";
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">New sales invoice</h1>
        <p className="text-black/60">Pick the customer, add items, save — then print or send it.</p>
      </div>

      <section className="grid gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:grid-cols-4">
        <Field label="Customer" className="sm:col-span-2">
          <select className={inputCls} value={partyId} onChange={(e) => setPartyId(e.target.value)}>
            <option value="">Walk-in customer</option>
            {parties
              .filter((p) => p.kind !== "supplier")
              .map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                  {p.phone ? ` — ${p.phone}` : ""}
                </option>
              ))}
          </select>
        </Field>
        {!partyId ? (
          <Field label="Customer name (optional)" className="sm:col-span-2">
            <input className={inputCls} value={walkIn} onChange={(e) => setWalkIn(e.target.value)} placeholder="Walk-in customer" />
          </Field>
        ) : (
          <div className="hidden sm:col-span-2 sm:block" />
        )}
        <Field label="Invoice date">
          <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Due date">
          <input className={inputCls} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        {gstOn ? (
          <label className="flex items-center gap-3 text-sm font-bold sm:col-span-2">
            <input type="checkbox" className="h-5 w-5 accent-[#4CAF2E]" checked={interState} onChange={(e) => setInterState(e.target.checked)} />
            Customer is in another state (charge IGST)
          </label>
        ) : null}
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
        <div className="hidden grid-cols-[2.4fr_0.7fr_0.9fr_0.7fr_auto] gap-3 px-1 pb-2 text-xs font-bold uppercase tracking-wider text-black/50 md:grid">
          <span>Item</span>
          <span>Qty</span>
          <span>Rate (₹)</span>
          <span>Disc %</span>
          <span className="w-9" />
        </div>
        <div className="space-y-4 md:space-y-3">
          {rows.map((r) => (
            <div key={r.key} className="grid gap-3 rounded-2xl border border-black/10 p-3 md:grid-cols-[2.4fr_0.7fr_0.9fr_0.7fr_auto] md:border-0 md:p-0">
              <div>
                <select className={inputCls} value={r.itemId} onChange={(e) => pick(r.key, e.target.value)} aria-label="Choose an item">
                  <option value="">Type below or choose an item…</option>
                  {groups.map(([g, list]) => (
                    <optgroup key={g} label={g}>
                      {list.map((i) => (
                        <option key={i._id} value={i._id}>
                          {i.name} — {inr(i.salePrice)}
                          {i.isService ? "" : ` (${i.stock} in stock)`}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <input className={`${inputCls} mt-2`} value={r.name} onChange={(e) => patch(r.key, { name: e.target.value, itemId: r.itemId && items.find((i) => i._id === r.itemId)?.name === e.target.value ? r.itemId : "" })} placeholder="Item name" aria-label="Item name" />
                <input className={`${inputCls} mt-2`} value={r.serial} onChange={(e) => patch(r.key, { serial: e.target.value })} placeholder="Frame / serial no. (for warranty, optional)" aria-label="Frame or serial number" />
                {stockWarn(r) ? <p className="mt-1 text-xs font-semibold text-[#b3261e]">{stockWarn(r)}</p> : null}
              </div>
              <input className={inputCls} inputMode="decimal" value={r.qty} onChange={(e) => patch(r.key, { qty: e.target.value })} aria-label="Quantity" placeholder="Qty" />
              <input className={inputCls} inputMode="decimal" value={r.rate} onChange={(e) => patch(r.key, { rate: e.target.value })} aria-label="Rate" placeholder="Rate" />
              <input className={inputCls} inputMode="decimal" value={r.discountPct} onChange={(e) => patch(r.key, { discountPct: e.target.value })} aria-label="Discount percent" placeholder="0" />
              <button type="button" className="grid h-10 w-9 place-items-center self-start rounded-lg text-black/40 hover:bg-red-50 hover:text-red-700 disabled:opacity-30" onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : rs))} disabled={rows.length === 1} aria-label="Remove line">
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" className={`${btnGhost} mt-4`} onClick={() => setRows((rs) => [...rs, blank()])}>
          <Icon name="plus" className="h-4 w-4" /> Add another item
        </button>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <Field label="Notes (shown on the invoice)">
            <textarea className={inputCls} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount received now (₹)" hint="Leave empty if nothing is paid yet.">
              <input className={inputCls} inputMode="decimal" value={paidNow} onChange={(e) => setPaidNow(e.target.value)} />
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
          </div>
        </section>

        <section className="space-y-2 rounded-3xl bg-[#0a0a0c] p-6 text-white shadow-sm">
          <Line k="Subtotal" v={inr(t.subtotal)} />
          {t.discount > 0 ? <Line k="Discount given" v={`- ${inr(t.discount)}`} /> : null}
          {t.cgst > 0 ? <Line k="CGST" v={inr(t.cgst)} /> : null}
          {t.sgst > 0 ? <Line k="SGST" v={inr(t.sgst)} /> : null}
          {t.igst > 0 ? <Line k="IGST" v={inr(t.igst)} /> : null}
          {t.roundOff !== 0 ? <Line k="Round off" v={inr(t.roundOff)} /> : null}
          <div className="mt-3 flex items-baseline justify-between border-t border-white/20 pt-4">
            <span className="text-sm font-bold uppercase tracking-wider text-white/60">Total</span>
            <span className="text-3xl font-extrabold text-[#67DD25]">{inr(t.total)}</span>
          </div>
          {n(paidNow) > 0 ? <Line k="Balance after payment" v={inr(Math.max(0, t.total - n(paidNow)))} /> : null}
        </section>
      </div>

      <ErrorNote text={err} />
      <div className="flex flex-wrap gap-3">
        <button className={btnPrimary} disabled={busy}>
          {busy ? "Saving…" : "Save invoice"}
        </button>
        <button type="button" className={btnGhost} onClick={() => router.push("/invoices")}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-white/60">{k}</span>
      <span className="font-semibold">{v}</span>
    </div>
  );
}
