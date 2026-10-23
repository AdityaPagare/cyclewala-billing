/* One page for an invoice, a quotation or a purchase bill: the action buttons, the document itself, then its
 * payments and (for things sent to a customer) when it was sent. */
import Link from "next/link";
import { notFound } from "next/navigation";
import InvoiceActions, { type DocKind } from "@/app/(app)/invoices/[id]/InvoiceActions";
import InvoiceDocument from "@/components/InvoiceDocument";
import { day, inr } from "@/lib/format";
import { invoices, payments, purchases, quotations } from "@/lib/invoices";
import { mailConfigured } from "@/lib/mail";
import { getBusiness } from "@/lib/settings";

const META: Record<DocKind, { back: string; backLabel: string }> = {
  sale: { back: "/invoices", backLabel: "← All invoices" },
  quotation: { back: "/quotations", backLabel: "← All quotations" },
  purchase: { back: "/purchases", backLabel: "← All purchase bills" },
};

export default async function DocPage({ kind, id }: { kind: DocKind; id: string }) {
  const col = kind === "sale" ? invoices() : kind === "quotation" ? quotations() : purchases();
  const inv = await col.get(id);
  if (!inv) notFound();
  const [biz, pays] = await Promise.all([getBusiness(), kind === "quotation" ? Promise.resolve([]) : payments().all()]);
  const mine = pays.filter((p) => p.invoiceId === inv._id).sort((a, b) => a.date.localeCompare(b.date));
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const m = META[kind];

  return (
    <div className="space-y-6">
      <div className="no-print">
        <Link href={m.back} className="text-sm font-semibold text-black/55 hover:text-[#3c8a24]">
          {m.backLabel}
        </Link>
        <div className="mt-3">
          <InvoiceActions
            kind={kind}
            inv={{ _id: inv._id, number: inv.number, status: inv.status, total: inv.total, paid: inv.paid, token: inv.shareToken, partyName: inv.party.name, phone: inv.party.phone ?? "", email: inv.party.email ?? "", date: inv.date }}
            shopName={biz.name}
            siteUrl={base}
            mailReady={mailConfigured()}
          />
        </div>
        {kind === "quotation" && inv.convertedTo ? (
          <p className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">
            This quotation became a sales invoice.{" "}
            <Link href={`/invoices/${inv.convertedTo}`} className="underline">
              Open the invoice
            </Link>
          </p>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-black/5 print:overflow-visible print:rounded-none print:shadow-none print:ring-0">
        <InvoiceDocument biz={biz} inv={inv} />
      </div>

      <div className="no-print grid gap-6 lg:grid-cols-2">
        {kind !== "quotation" ? (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h2 className="text-lg font-extrabold">{kind === "purchase" ? "Payments made" : "Payments"}</h2>
            {mine.length === 0 ? (
              <p className="mt-2 text-sm text-black/55">{kind === "purchase" ? "Nothing paid yet." : "Nothing received yet."}</p>
            ) : (
              <ul className="mt-3 divide-y divide-black/5 text-sm">
                {mine.map((p) => (
                  <li key={p._id} className="flex justify-between py-2.5">
                    <span>
                      {day(p.date)} · <span className="capitalize">{p.mode}</span>
                      {p.reference ? <span className="text-black/50"> · {p.reference}</span> : null}
                    </span>
                    <b className={kind === "purchase" ? "text-[#b3261e]" : "text-[#3c8a24]"}>{inr(p.amount)}</b>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
        {kind !== "purchase" ? (
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h2 className="text-lg font-extrabold">Sent to the customer</h2>
            {inv.shares.length === 0 ? (
              <p className="mt-2 text-sm text-black/55">Not sent yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-black/5 text-sm">
                {[...inv.shares].reverse().map((s, i) => (
                  <li key={i} className="flex justify-between py-2.5">
                    <span className="capitalize">
                      {s.channel}
                      {s.to ? <span className="text-black/50"> · {s.to}</span> : null}
                    </span>
                    <span className="text-black/50">{day(s.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
