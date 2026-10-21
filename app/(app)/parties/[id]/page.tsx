import Link from "next/link";
import { notFound } from "next/navigation";
import { day, inr } from "@/lib/format";
import { ledgerFor } from "@/lib/invoices";
import LedgerActions from "./LedgerActions";

export const metadata = { title: "Party ledger — Cycle Wala Billing" };

export default async function LedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const l = await ledgerFor((await params).id);
  if (!l) notFound();
  const { party, rows, balance } = l;

  return (
    <div className="space-y-6">
      <Link href="/parties" className="text-sm font-semibold text-black/55 hover:text-[#3c8a24]">
        ← All parties
      </Link>
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{party.name}</h1>
          <p className="text-black/60">
            {[party.phone, party.email, party.gstin ? `GSTIN ${party.gstin}` : ""].filter(Boolean).join(" · ") || "No contact details"}
          </p>
        </div>
        <div className="ml-auto rounded-2xl bg-white px-6 py-4 text-right shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-bold uppercase tracking-wider text-black/50">{balance > 0 ? "They owe you" : balance < 0 ? "Advance with you" : "Settled"}</p>
          <p className={`text-3xl font-extrabold ${balance > 0 ? "text-[#b3261e]" : "text-[#3c8a24]"}`}>{inr(Math.abs(balance))}</p>
        </div>
      </div>

      <LedgerActions party={{ _id: party._id, name: party.name, phone: party.phone, balance }} />

      <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-black/[0.03] text-xs uppercase tracking-wider text-black/55">
            <tr>
              <th className="px-5 py-3">Date</th>
              <th className="px-3 py-3">Details</th>
              <th className="px-3 py-3 text-right">Billed</th>
              <th className="px-3 py-3 text-right">Received</th>
              <th className="px-5 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {party.openingBalance !== 0 ? (
              <tr className="border-t border-black/5">
                <td className="px-5 py-3 text-black/50">—</td>
                <td className="px-3 py-3 font-semibold">Opening balance</td>
                <td className="px-3 py-3 text-right" />
                <td className="px-3 py-3 text-right" />
                <td className="px-5 py-3 text-right font-bold">{inr(party.openingBalance)}</td>
              </tr>
            ) : null}
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-black/5">
                <td className="px-5 py-3">{day(r.date)}</td>
                <td className="px-3 py-3">
                  <span className="font-semibold">{r.label}</span>
                  {r.ref ? <span className="ml-2 text-black/50">{r.ref}</span> : null}
                </td>
                <td className="px-3 py-3 text-right">{r.debit ? inr(r.debit) : ""}</td>
                <td className="px-3 py-3 text-right text-[#3c8a24]">{r.credit ? inr(r.credit) : ""}</td>
                <td className="px-5 py-3 text-right font-bold">{inr(r.balance)}</td>
              </tr>
            ))}
            {rows.length === 0 && party.openingBalance === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-black/50">
                  No invoices or payments yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
