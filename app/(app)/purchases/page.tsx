import Link from "next/link";
import { Empty, StatusChip } from "@/components/ui";
import { day, inr } from "@/lib/format";
import { byNewest, purchases } from "@/lib/invoices";
import { btnPrimary } from "@/lib/styles";

export const metadata = { title: "Purchases — Cycle Wala Billing" };

const FILTERS = [
  ["all", "All"],
  ["unpaid", "Unpaid"],
  ["partial", "Part paid"],
  ["paid", "Paid"],
  ["cancelled", "Cancelled"],
] as const;

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status = "all", q = "" } = await searchParams;
  const all = (await purchases().all()).sort(byNewest);
  const s = q.trim().toLowerCase();
  const list = all.filter((i) => (status === "all" || i.status === status) && (!s || `${i.number} ${i.supplierBillNo ?? ""} ${i.party.name}`.toLowerCase().includes(s)));
  const live = all.filter((i) => i.status !== "cancelled");
  const bought = live.reduce((n, i) => n + i.total, 0);
  const owe = live.reduce((n, i) => n + (i.total - i.paid), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Purchases</h1>
          <p className="text-black/60">
            {live.length} bills · bought <b>{inr(bought)}</b> · to pay suppliers <b className="text-[#b3261e]">{inr(owe)}</b>
          </p>
        </div>
        <Link href="/purchases/new" className={`${btnPrimary} ml-auto`}>
          + New purchase bill
        </Link>
      </div>

      <form className="flex flex-wrap gap-3" action="/purchases">
        <input name="q" defaultValue={q} placeholder="Search bill number or supplier" className="w-full max-w-sm rounded-xl border border-black/15 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-[#4CAF2E]" />
        <input type="hidden" name="status" value={status} />
        <button className="rounded-full bg-[#0a0a0c] px-5 py-2.5 text-sm font-bold text-white">Search</button>
      </form>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([k, label]) => (
          <Link key={k} href={`/purchases?status=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`rounded-full px-4 py-2 text-sm font-bold ${status === k ? "bg-[#0a0a0c] text-white" : "bg-white ring-1 ring-black/10 hover:bg-black/5"}`}>
            {label}
          </Link>
        ))}
      </div>

      {all.length === 0 ? (
        <Empty title="No purchase bills yet" note="When you buy stock from a supplier, enter the bill here. Your stock goes up and the supplier shows under what you owe.">
          <Link href="/purchases/new" className={btnPrimary}>
            Add a purchase bill
          </Link>
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-black/[0.03] text-xs uppercase tracking-wider text-black/55">
              <tr>
                <th className="px-5 py-3">Bill</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Supplier</th>
                <th className="px-3 py-3">Their bill no.</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3 text-right">To pay</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <tr key={i._id} className="border-t border-black/5 hover:bg-black/[0.02]">
                  <td className="px-5 py-3 font-bold">
                    <Link href={`/purchases/${i._id}`} className="hover:text-[#3c8a24]">
                      {i.number}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{day(i.date)}</td>
                  <td className="px-3 py-3">{i.party.name}</td>
                  <td className="px-3 py-3">{i.supplierBillNo || "-"}</td>
                  <td className="px-3 py-3 text-right font-bold">{inr(i.total)}</td>
                  <td className="px-3 py-3 text-right">{i.status === "cancelled" ? "-" : inr(i.total - i.paid)}</td>
                  <td className="px-5 py-3">
                    <StatusChip status={i.status} />
                  </td>
                </tr>
              ))}
              {list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-black/50">
                    No bills match.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
