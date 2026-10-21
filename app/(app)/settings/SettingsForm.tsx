"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorNote, Field, api, btnPrimary, inputCls } from "@/components/ui";
import type { BusinessProfile } from "@/lib/types";

export default function SettingsForm({ biz, mailReady }: { biz: BusinessProfile; mailReady: boolean }) {
  const router = useRouter();
  const [f, setF] = useState({
    name: biz.name,
    phone: biz.phone,
    email: biz.email ?? "",
    address: biz.address,
    gstEnabled: biz.gstEnabled,
    gstin: biz.gstin ?? "",
    invoicePrefix: biz.invoicePrefix,
    nextInvoiceNumber: String(biz.nextInvoiceNumber),
    upiId: biz.upiId ?? "",
    terms: biz.terms ?? "",
    warranty: biz.warranty ?? "",
    website: biz.website ?? "",
  });
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setSaved(false);
    const r = await api("/api/settings", "PUT", f);
    setBusy(false);
    if (r.ok) {
      setSaved(true);
      router.refresh();
    } else setErr(r.error);
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <section className="grid gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:grid-cols-2 sm:p-7">
        <h2 className="text-lg font-extrabold sm:col-span-2">Shop details</h2>
        <Field label="Shop name *">
          <input className={inputCls} value={f.name} onChange={set("name")} required />
        </Field>
        <Field label="Phone">
          <input className={inputCls} value={f.phone} onChange={set("phone")} />
        </Field>
        <Field label="Email" hint="Customers can reply to invoices here.">
          <input className={inputCls} type="email" value={f.email} onChange={set("email")} />
        </Field>
        <Field label="UPI id" hint="Printed on unpaid invoices.">
          <input className={inputCls} value={f.upiId} onChange={set("upiId")} placeholder="name@bank" />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <textarea className={inputCls} rows={2} value={f.address} onChange={set("address")} />
        </Field>
      </section>

      <section className="grid gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:grid-cols-2 sm:p-7">
        <h2 className="text-lg font-extrabold sm:col-span-2">Invoices</h2>
        <label className="flex items-start gap-3 text-sm font-bold sm:col-span-2">
          <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[#4CAF2E]" checked={f.gstEnabled} onChange={(e) => setF({ ...f, gstEnabled: e.target.checked })} />
          <span>
            My shop is GST-registered
            <span className="block text-xs font-normal text-black/55">Invoices become Tax Invoices with CGST/SGST/IGST, GSTIN and HSN. Leave off for plain bills.</span>
          </span>
        </label>
        {f.gstEnabled ? (
          <Field label="GSTIN *" className="sm:col-span-2">
            <input className={inputCls} value={f.gstin} onChange={set("gstin")} placeholder="27ABCDE1234F1Z5" />
          </Field>
        ) : null}
        <Field label="Invoice prefix">
          <input className={inputCls} value={f.invoicePrefix} onChange={set("invoicePrefix")} placeholder="INV-" />
        </Field>
        <Field label="Next invoice number" hint="The next bill is numbered with this.">
          <input className={inputCls} inputMode="numeric" value={f.nextInvoiceNumber} onChange={set("nextInvoiceNumber")} />
        </Field>
        <Field label="Website (printed in the footer)">
          <input className={inputCls} value={f.website} onChange={set("website")} placeholder="cyclewala.shop" />
        </Field>
        <Field label="Warranty text (printed when an invoice has a frame number)" className="sm:col-span-2">
          <textarea className={inputCls} rows={3} value={f.warranty} onChange={set("warranty")} />
        </Field>
        <Field label="Terms & thank-you note" className="sm:col-span-2">
          <textarea className={inputCls} rows={3} value={f.terms} onChange={set("terms")} />
        </Field>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-7">
        <h2 className="text-lg font-extrabold">Sending invoices</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <b>Email:</b>{" "}
            {mailReady ? <span className="font-semibold text-[#3c8a24]">ready</span> : <span className="font-semibold text-[#b3261e]">not set up</span>} — needs <code className="rounded bg-black/5 px-1">SMTP_USER</code> and{" "}
            <code className="rounded bg-black/5 px-1">SMTP_PASS</code> (a Gmail App password) in the server settings.
          </li>
          <li>
            <b>WhatsApp:</b> opens WhatsApp with the invoice link ready to send — nothing to set up.
          </li>
          <li>
            <b>Link &amp; print:</b> every invoice has a public link and a print / save-as-PDF view.
          </li>
        </ul>
      </section>

      <ErrorNote text={err} />
      {saved ? <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">Saved.</p> : null}
      <button className={btnPrimary} disabled={busy}>
        {busy ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
