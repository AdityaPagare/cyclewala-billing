"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorNote, Field, Modal, StatusChip, api, btnDanger, btnGhost, btnPrimary, inputCls } from "@/components/ui";
import { inr, today } from "@/lib/format";
import { docMessage } from "@/lib/messages";

type Inv = { _id: string; number: string; status: string; total: number; paid: number; token: string; partyName: string; phone: string; email: string; date: string };
export type DocKind = "sale" | "quotation" | "purchase";

const BASE: Record<DocKind, string> = { sale: "/api/invoices", quotation: "/api/quotations", purchase: "/api/purchases" };
const WORD: Record<DocKind, string> = { sale: "invoice", quotation: "quotation", purchase: "purchase bill" };

/** the buttons above an invoice, a quotation or a purchase bill: pay, print, send, convert, cancel */
export default function InvoiceActions({ inv, shopName, siteUrl, mailReady, kind = "sale" }: { inv: Inv; shopName: string; siteUrl: string; mailReady: boolean; kind?: DocKind }) {
  const router = useRouter();
  const [modal, setModal] = useState<"pay" | "email" | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const due = Math.max(0, inv.total - inv.paid);
  const link = `${siteUrl || (typeof window !== "undefined" ? window.location.origin : "")}/i/${inv.token}`;
  const cancelled = inv.status === "cancelled";
  const word = WORD[kind];
  const shareable = kind !== "purchase";

  const record = (channel: string, to?: string) => api(`${BASE[kind]}/${inv._id}/send`, "POST", { channel, to });

  const message = docMessage({ kind: kind === "quotation" ? "quotation" : "sale", name: inv.partyName, number: inv.number, amount: inv.total, date: inv.date, link, shop: shopName });

  /* WhatsApp: on a phone the share sheet attaches the PDF itself; on a computer WhatsApp opens with the message
     (which holds the link to the PDF), because WhatsApp's web link cannot carry a file */
  const whatsapp = async () => {
    setNote("");
    try {
      const res = await fetch(`${BASE[kind]}/${inv._id}/pdf`);
      if (res.ok) {
        const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? `${inv.number}.pdf`;
        const file = new File([await res.blob()], name, { type: "application/pdf" });
        if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: message.text, title: message.subject });
          await record("whatsapp", inv.phone || undefined);
          router.refresh();
          return;
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return; // they closed the share sheet
    }
    const d = inv.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${d ? (d.length === 10 ? "91" + d : d) : ""}?text=${encodeURIComponent(message.text)}`, "_blank", "noopener");
    await record("whatsapp", inv.phone || undefined);
    router.refresh();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setNote(`Link to this ${word} copied.`);
    } catch {
      setNote(link);
    }
    await record("link");
    router.refresh();
  };
  const print = async () => {
    if (shareable) await record("print");
    window.print();
  };
  const cancel = async () => {
    const warn = kind === "purchase" ? "The goods it added come back out of stock and it stops counting as a purchase." : kind === "quotation" ? "It will no longer be open." : "The stock goes back and it stops counting as sales.";
    if (!confirm(`Cancel ${word} ${inv.number}? ${warn}`)) return;
    const r = await api(`${BASE[kind]}/${inv._id}`, "DELETE");
    if (r.ok) router.refresh();
    else setNote(r.error);
  };
  const convert = async () => {
    if (!confirm(`Turn ${inv.number} into a sales invoice? Stock goes down when the invoice is made.`)) return;
    setBusy(true);
    const r = await api<{ invoice: { _id: string } }>(`/api/quotations/${inv._id}/convert`, "POST", { date: today() });
    setBusy(false);
    if (r.ok) {
      router.push(`/invoices/${r.data.invoice._id}`);
      router.refresh();
    } else setNote(r.error);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <h1 className="mr-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{inv.number}</h1>
      <StatusChip status={inv.status} />
      <div className="ml-auto flex flex-wrap gap-2">
        {kind === "quotation" && inv.status === "open" ? (
          <button className={btnPrimary} onClick={convert} disabled={busy}>
            {busy ? "Converting…" : "Convert to invoice"}
          </button>
        ) : null}
        {kind !== "quotation" && !cancelled && due > 0 ? (
          <button className={btnPrimary} onClick={() => setModal("pay")}>
            {kind === "purchase" ? "Pay supplier" : "Record payment"}
          </button>
        ) : null}
        <a className={btnGhost} href={`${BASE[kind]}/${inv._id}/pdf`}>
          Download PDF
        </a>
        <button className={btnGhost} onClick={print}>
          Print
        </button>
        {shareable ? (
          <>
            <button className={btnGhost} onClick={() => setModal("email")}>
              Email
            </button>
            <button className={btnGhost} onClick={whatsapp}>
              WhatsApp
            </button>
            <button className={btnGhost} onClick={copy}>
              Copy link
            </button>
          </>
        ) : null}
        {!cancelled && inv.status !== "converted" ? (
          <button className={btnDanger} onClick={cancel}>
            Cancel {word}
          </button>
        ) : null}
      </div>
      {note ? <p className="w-full rounded-xl bg-black/5 px-4 py-2 text-sm font-semibold">{note}</p> : null}

      {modal === "pay" ? <PayForm inv={inv} kind={kind} due={due} shopName={shopName} link={link} onClose={() => { setModal(null); router.refresh(); }} /> : null}
      {modal === "email" ? <EmailForm inv={inv} kind={kind} mailReady={mailReady} preview={message.text} onClose={() => setModal(null)} onSent={() => { setModal(null); setNote(`${word[0].toUpperCase()}${word.slice(1)} emailed.`); router.refresh(); }} /> : null}
    </div>
  );
}

function PayForm({ inv, kind, due, shopName, link, onClose }: { inv: Inv; kind: DocKind; due: number; shopName: string; link: string; onClose: () => void }) {
  const [saved, setSaved] = useState<{ amount: number; date: string } | null>(null);
  const [amount, setAmount] = useState(String(due));
  const [mode, setMode] = useState("cash");
  const [date, setDate] = useState(today());
  const [reference, setReference] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const out = kind === "purchase";
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await api(`${BASE[kind]}/${inv._id}/payments`, "POST", { amount, mode, date, reference });
    setBusy(false);
    if (r.ok) {
      if (out) onClose();
      else setSaved({ amount: Number(amount), date });
    } else setErr(r.error);
  };
  if (saved) {
    // the customer gets a short receipt message like the invoice one
    const msg = docMessage({ kind: "payment", name: inv.partyName, amount: saved.amount, date: saved.date, link, shop: shopName });
    const d = inv.phone.replace(/\D/g, "");
    const wa =`https://wa.me/${d ? (d.length === 10 ? "91" + d : d) : ""}?text=${encodeURIComponent(msg.text)}`;
    return (
      <Modal title="Payment saved" onClose={onClose}>
        <div className="space-y-4">
          <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">Recorded {inr(saved.amount)} for {inv.number}.</p>
          <p className="text-sm text-black/60">Send {inv.partyName} a receipt message?</p>
          <pre className="whitespace-pre-wrap rounded-2xl bg-black/[0.04] p-4 text-[13px] leading-relaxed">{msg.text}</pre>
          <div className="flex flex-wrap gap-3">
            <a className={btnPrimary} href={wa} target="_blank" rel="noreferrer">
              Send on WhatsApp
            </a>
            <button className={btnGhost} onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </Modal>
    );
  }
  return (
    <Modal title={out ? `Pay ${inv.partyName} for ${inv.number}` : `Payment for ${inv.number}`} onClose={onClose}>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <p className="text-sm text-black/60 sm:col-span-2">
          {out ? "Balance payable" : "Balance due"} <b>{inr(due)}</b>.
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

function EmailForm({ inv, kind, mailReady, preview, onClose, onSent }: { inv: Inv; kind: DocKind; mailReady: boolean; preview: string; onClose: () => void; onSent: () => void }) {
  const [to, setTo] = useState(inv.email);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await api(`${BASE[kind]}/${inv._id}/send`, "POST", { channel: "email", to });
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
        <p className="text-sm text-black/55">They get this message with the {WORD[kind]} attached as a PDF:</p>
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-2xl bg-black/[0.04] p-4 text-[13px] leading-relaxed">{preview}</pre>
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
