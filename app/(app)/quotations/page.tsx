import Link from "next/link";
import { Empty, StatusChip } from "@/components/ui";
import { day, inr } from "@/lib/format";
import { byNewest, quotations } from "@/lib/invoices";
import { btnPrimary } from "@/lib/styles";

export const metadata = { title: "Quotations — Cycle Wala Billing" };

const FILTERS = [
  ["all", "All"],
  ["open", "Open"],
  ["converted", "Invoiced"],
  ["cancelled", "Cancelled"],
] as const;

export default async function QuotationsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status = "all", q = "" } = await searchParams;
  const all = (await quotations().all()).sort(byNewest);
  const s = q.trim().toLowerCase();
  const list = all.filter((i) => (status === "all" || i.status === status) && (!s || `${i.number} ${i.party.name} ${i.party.phone ?? ""}`.toLowerCase().includes(s)));
  const open = all.filter((i) => i.status === "open");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Quotations</h1>
          <p className="text-black/60">
            {open.length} open · worth <b>{inr(open.reduce((n, i) => n + i.total, 0))}</b>. Send an estimate, then turn it into an invoice with one click.
          </p>
        </div>
        <Link href="/quotations/new" className={`${btnPrimary} ml-auto`}>
          + New quotation
        </Link>
      </div>

      <form className="flex flex-wrap gap-3" action="/quotations">
        <input name="q" defaultValue={q} placeholder="Search quotation number or customer" className="w-full max-w-sm rounded-xl border border-black/15 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-[#4CAF2E]" />
        <input type="hidden" name="status" value={status} />
        <button className="rounded-full bg-[#0a0a0c] px-5 py-2.5 text-sm font-bold text-white">Search</button>
      </form>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([k, label]) => (
          <Link key={k} href={`/quotations?status=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`rounded-full px-4 py-2 text-sm font-bold ${status === k ? "bg-[#0a0a0c] text-white" : "bg-white ring-1 ring-black/10 hover:bg-black/5"}`}>
            {label}
          </Link>
        ))}
      </div>

      {all.length === 0 ? (
        <Empty title="No quotations yet" note="Make an estimate for a customer. When they say yes, convert it to an invoice and the stock goes down.">
          <Link href="/quotations/new" className={btnPrimary}>
            Create a quotation
          </Link>
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-black/[0.03] text-xs uppercase tracking-wider text-black/55">
              <tr>
                <th className="px-5 py-3">Quotation</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Valid until</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <tr key={i._id} className="border-t border-black/5 hover:bg-black/[0.02]">
                  <td className="px-5 py-3 font-bold">
                    <Link href={`/quotations/${i._id}`} className="hover:text-[#3c8a24]">
                      {i.number}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{day(i.date)}</td>
                  <td className="px-3 py-3">{i.party.name}</td>
                  <td className="px-3 py-3">{i.dueDate ? day(i.dueDate) : "-"}</td>
                  <td className="px-3 py-3 text-right font-bold">{inr(i.total)}</td>
                  <td className="px-5 py-3">
                    <StatusChip status={i.status} />
                  </td>
                </tr>
              ))}
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-black/50">
                    No quotations match.
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
