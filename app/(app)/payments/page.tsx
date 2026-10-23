import Link from "next/link";
import { Empty } from "@/components/ui";
import { day, inr } from "@/lib/format";
import { byNewest, invoices, parties, partyBalances, payments, purchases } from "@/lib/invoices";
import { btnGhost } from "@/lib/styles";

export const metadata = { title: "Payments — Cycle Wala Billing" };

export default async function PaymentsPage() {
  const [pays, invs, buys, ps, bal] = await Promise.all([payments().all(), invoices().all(), purchases().all(), parties().all(), partyBalances()]);
  const name = new Map(ps.map((p) => [p._id, p.name]));
  const num = new Map([...invs, ...buys].map((i) => [i._id, i.number]));
  const received = pays.filter((p) => p.direction === "in").reduce((n, p) => n + p.amount, 0);
  const paidOut = pays.filter((p) => p.direction === "out").reduce((n, p) => n + p.amount, 0);
  const owing = ps.map((p) => ({ p, b: bal.get(p._id) ?? 0 })).filter((x) => x.b > 0).sort((a, b) => b.b - a.b);
  const payable = ps.map((p) => ({ p, b: bal.get(p._id) ?? 0 })).filter((x) => x.b < 0).sort((a, b) => a.b - b.b);
  const toCollect = owing.reduce((n, x) => n + x.b, 0);
  const toPay = payable.reduce((n, x) => n - x.b, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Payments</h1>
        <p className="text-black/60">
          Received <b className="text-[#3c8a24]">{inr(received)}</b> · still to collect <b className="text-[#b3261e]">{inr(toCollect)}</b> · paid to suppliers <b>{inr(paidOut)}</b> · still to pay <b className="text-[#b3261e]">{inr(toPay)}</b>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="text-lg font-extrabold">To collect</h2>
          {owing.length === 0 ? (
            <p className="mt-2 text-sm text-black/55">Nobody owes you anything right now.</p>
          ) : (
            <ul className="mt-3 divide-y divide-black/5">
              {owing.map(({ p, b }) => {
                const d = p.phone.replace(/\D/g, "");
                const wa = d ? `https://wa.me/${d.length === 10 ? "91" + d : d}?text=${encodeURIComponent(`Hi ${p.name}, a gentle reminder: ${inr(b)} is pending at Cycle Wala. Thank you!`)}` : "";
                return (
                  <li key={p._id} className="flex flex-wrap items-center gap-3 py-3">
                    <Link href={`/parties/${p._id}`} className="font-bold hover:text-[#3c8a24]">
                      {p.name}
                    </Link>
                    <span className="text-sm text-black/50">{p.phone}</span>
                    <b className="ml-auto text-[#b3261e]">{inr(b)}</b>
                    {wa ? (
                      <a className={btnGhost} href={wa} target="_blank" rel="noreferrer">
                        WhatsApp reminder
                      </a>
                    ) : null}
                    <Link className={btnGhost} href={`/parties/${p._id}`}>
                      Receive
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="text-lg font-extrabold">To pay (suppliers)</h2>
          {payable.length === 0 ? (
            <p className="mt-2 text-sm text-black/55">You don&apos;t owe any supplier right now.</p>
          ) : (
            <ul className="mt-3 divide-y divide-black/5">
              {payable.map(({ p, b }) => (
                <li key={p._id} className="flex flex-wrap items-center gap-3 py-3">
                  <Link href={`/parties/${p._id}`} className="font-bold hover:text-[#3c8a24]">
                    {p.name}
                  </Link>
                  <span className="text-sm text-black/50">{p.phone}</span>
                  <b className="ml-auto text-[#b3261e]">{inr(-b)}</b>
                  <Link className={btnGhost} href={`/parties/${p._id}`}>
                    Pay
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-extrabold">All payments</h2>
        {pays.length === 0 ? (
          <Empty title="No payments yet" note="Payments you record against invoices and purchase bills show up here." />
        ) : (
          <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-black/[0.03] text-xs uppercase tracking-wider text-black/55">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-3 py-3">Party</th>
                  <th className="px-3 py-3">Bill</th>
                  <th className="px-3 py-3">Mode</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {[...pays].sort(byNewest).map((p) => (
                  <tr key={p._id} className="border-t border-black/5">
                    <td className="px-5 py-3">{day(p.date)}</td>
                    <td className="px-3 py-3 font-semibold">{(p.partyId && name.get(p.partyId)) || "Walk-in"}</td>
                    <td className="px-3 py-3">{p.invoiceId ? num.get(p.invoiceId) : <span className="text-black/45">{p.note || "Advance"}</span>}</td>
                    <td className="px-3 py-3 capitalize">{p.mode}</td>
                    <td className="px-3 py-3">{p.direction === "out" ? "Paid out" : "Received"}</td>
                    <td className={`px-5 py-3 text-right font-bold ${p.direction === "out" ? "text-[#b3261e]" : "text-[#3c8a24]"}`}>
                      {p.direction === "out" ? "- " : ""}
                      {inr(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
