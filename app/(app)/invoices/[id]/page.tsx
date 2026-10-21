import Link from "next/link";
import { notFound } from "next/navigation";
import InvoiceDocument from "@/components/InvoiceDocument";
import { day, inr } from "@/lib/format";
import { invoices, payments } from "@/lib/invoices";
import { mailConfigured } from "@/lib/mail";
import { getBusiness } from "@/lib/settings";
import InvoiceActions from "./InvoiceActions";

export const metadata = { title: "Invoice — Cycle Wala Billing" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await invoices().get(id);
  if (!inv) notFound();
  const [biz, pays] = await Promise.all([getBusiness(), payments().all()]);
  const mine = pays.filter((p) => p.invoiceId === inv._id).sort((a, b) => a.date.localeCompare(b.date));
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

  return (
    <div className="space-y-6">
      <div className="no-print">
        <Link href="/invoices" className="text-sm font-semibold text-black/55 hover:text-[#3c8a24]">
          ← All invoices
        </Link>
        <div className="mt-3">
          <InvoiceActions
            inv={{ _id: inv._id, number: inv.number, status: inv.status, total: inv.total, paid: inv.paid, token: inv.shareToken, partyName: inv.party.name, phone: inv.party.phone ?? "", email: inv.party.email ?? "" }}
            shopName={biz.name}
            siteUrl={base}
            mailReady={mailConfigured()}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-black/5 print:overflow-visible print:rounded-none print:shadow-none print:ring-0">
        <InvoiceDocument biz={biz} inv={inv} />
      </div>

      <div className="no-print grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="text-lg font-extrabold">Payments</h2>
          {mine.length === 0 ? (
            <p className="mt-2 text-sm text-black/55">Nothing received yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-black/5 text-sm">
              {mine.map((p) => (
                <li key={p._id} className="flex justify-between py-2.5">
                  <span>
                    {day(p.date)} · <span className="capitalize">{p.mode}</span>
                    {p.reference ? <span className="text-black/50"> · {p.reference}</span> : null}
                  </span>
                  <b className="text-[#3c8a24]">{inr(p.amount)}</b>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="text-lg font-extrabold">Sent to the customer</h2>
          {inv.shares.length === 0 ? (
            <p className="mt-2 text-sm text-black/55">Not sent yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-black/5 text-sm">
              {[...inv.shares].reverse().map((s, i) => (
                <li key={i} className="flex justify-between py-2.5">
                  <span className="capitalize">{s.channel}{s.to ? <span className="text-black/50"> · {s.to}</span> : null}</span>
                  <span className="text-black/50">{day(s.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
