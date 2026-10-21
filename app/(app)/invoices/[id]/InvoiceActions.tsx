"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorNote, Field, Modal, StatusChip, api, btnDanger, btnGhost, btnPrimary, inputCls } from "@/components/ui";
import { inr, today } from "@/lib/format";

type Inv = { _id: string; number: string; status: string; total: number; paid: number; token: string; partyName: string; phone: string; email: string };

export default function InvoiceActions({ inv, shopName, siteUrl, mailReady }: { inv: Inv; shopName: string; siteUrl: string; mailReady: boolean }) {
  const router = useRouter();
  const [modal, setModal] = useState<"pay" | "email" | null>(null);
  const [note, setNote] = useState("");
  const due = Math.max(0, inv.total - inv.paid);
  const link = `${siteUrl || (typeof window !== "undefined" ? window.location.origin : "")}/i/${inv.token}`;
  const cancelled = inv.status === "cancelled";

  const record = (channel: string, to?: string) => api(`/api/invoices/${inv._id}/send`, "POST", { channel, to });

  const whatsapp = async () => {
    const d = inv.phone.replace(/\D/g, "");
    const msg = `Hi ${inv.partyName}, your invoice ${inv.number} from ${shopName} for ${inr(inv.total)}${due > 0 ? ` (balance due ${inr(due)})` : ""}.\nView it here: ${link}`;
    window.open(`https://wa.me/${d ? (d.length === 10 ? "91" + d : d) : ""}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
    await record("whatsapp", inv.phone || undefined);
    router.refresh();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setNote("Invoice link copied.");
    } catch {
      setNote(link);
    }
    await record("link");
    router.refresh();
  };
  const print = async () => {
    await record("print");
    window.print();
  };
  const cancel = async () => {
    if (!confirm(`Cancel invoice ${inv.number}? The stock goes back and it stops counting as sales.`)) return;
    const r = await api(`/api/invoices/${inv._id}`, "DELETE");
    if (r.ok) router.refresh();
    else setNote(r.error);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <h1 className="mr-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{inv.number}</h1>
      <StatusChip status={inv.status} />
      <div className="ml-auto flex flex-wrap gap-2">
        {!cancelled && due > 0 ? (
          <button className={btnPrimary} onClick={() => setModal("pay")}>
            Record payment
          </button>
        ) : null}
        <button className={btnGhost} onClick={print}>
          Print / PDF
        </button>
        <button className={btnGhost} onClick={() => setModal("email")}>
          Email
        </button>
        <button className={btnGhost} onClick={whatsapp}>
          WhatsApp
        </button>
        <button className={btnGhost} onClick={copy}>
          Copy link
        </button>
        {!cancelled ? (
          <button className={btnDanger} onClick={cancel}>
            Cancel invoice
          </button>
        ) : null}
      </div>
      {note ? <p className="w-full rounded-xl bg-black/5 px-4 py-2 text-sm font-semibold">{note}</p> : null}

      {modal === "pay" ? <PayForm inv={inv} due={due} onClose={() => setModal(null)} onSaved={() => { setModal(null); router.refresh(); }} /> : null}
      {modal === "email" ? <EmailForm inv={inv} mailReady={mailReady} onClose={() => setModal(null)} onSent={() => { setModal(null); setNote("Invoice emailed."); router.refresh(); }} /> : null}
    </div>
  );
}

function PayForm({ inv, due, onClose, onSaved }: { inv: Inv; due: number; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(String(due));
  const [mode, setMode] = useState("cash");
  const [date, setDate] = useState(today());
  const [reference, setReference] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await api(`/api/invoices/${inv._id}/payments`, "POST", { amount, mode, date, reference });
    setBusy(false);
    if (r.ok) onSaved();
    else setErr(r.error);
  };
  return (
    <Modal title={`Payment for ${inv.number}`} onClose={onClose}>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <p className="text-sm text-black/60 sm:col-span-2">
          Balance due <b>{inr(due)}</b>.
        </p>
        <Field label="Amount (₹)">
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

function EmailForm({ inv, mailReady, onClose, onSent }: { inv: Inv; mailReady: boolean; onClose: () => void; onSent: () => void }) {
  const [to, setTo] = useState(inv.email);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await api(`/api/invoices/${inv._id}/send`, "POST", { channel: "email", to });
    setBusy(false);
    if (r.ok) onSent();
    else setErr(r.error);
  };
  return (
    <Modal title={`Email ${inv.number}`} onClose={onClose}>
      <form onSubmit={send} className="space-y-4">
        {!mailReady ? <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Email is not set up on the server yet — add SMTP_USER and SMTP_PASS (a Gmail App password). You can still use WhatsApp or copy the link.</p> : null}
        <Field label="Customer's email">
          <input className={inputCls} type="email" value={to} onChange={(e) => setTo(e.target.value)} autoFocus required placeholder="customer@example.com" />
        </Field>
        <p className="text-sm text-black/55">They get the full invoice in the email, plus a link to view or print it online.</p>
        <ErrorNote text={err} />
        <div className="flex gap-3">
          <button className={btnPrimary} disabled={busy}>
            {busy ? "Sending…" : "Send email"}
          </button>
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
