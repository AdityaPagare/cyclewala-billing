import Link from "next/link";
import { Empty, StatusChip } from "@/components/ui";
import { btnPrimary } from "@/lib/styles";
import { day, inr } from "@/lib/format";
import { byNewest, invoices } from "@/lib/invoices";

export const metadata = { title: "Sales invoices — Cycle Wala Billing" };

const FILTERS = [
  ["all", "All"],
  ["unpaid", "Unpaid"],
  ["partial", "Part paid"],
  ["paid", "Paid"],
  ["cancelled", "Cancelled"],
] as const;

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status = "all", q = "" } = await searchParams;
  const all = (await invoices().all()).filter((i) => i.kind === "sale").sort(byNewest);
  const s = q.trim().toLowerCase();
  const list = all.filter((i) => (status === "all" || i.status === status) && (!s || `${i.number} ${i.party.name} ${i.party.phone ?? ""}`.toLowerCase().includes(s)));
  const live = all.filter((i) => i.status !== "cancelled");
  const billed = live.reduce((n, i) => n + i.total, 0);
  const due = live.reduce((n, i) => n + (i.total - i.paid), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Sales invoices</h1>
          <p className="text-black/60">
            {live.length} invoices · billed <b>{inr(billed)}</b> · pending <b className="text-[#b3261e]">{inr(due)}</b>
          </p>
        </div>
        <Link href="/invoices/new" className={`${btnPrimary} ml-auto`}>
          + New invoice
        </Link>
      </div>

      <form className="flex flex-wrap gap-3" action="/invoices">
        <input name="q" defaultValue={q} placeholder="Search invoice number or customer" className="w-full max-w-sm rounded-xl border border-black/15 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-[#4CAF2E]" />
        <input type="hidden" name="status" value={status} />
        <button className="rounded-full bg-[#0a0a0c] px-5 py-2.5 text-sm font-bold text-white">Search</button>
      </form>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([k, label]) => (
          <Link key={k} href={`/invoices?status=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`rounded-full px-4 py-2 text-sm font-bold ${status === k ? "bg-[#0a0a0c] text-white" : "bg-white ring-1 ring-black/10 hover:bg-black/5"}`}>
            {label}
          </Link>
        ))}
      </div>

      {all.length === 0 ? (
        <Empty title="No invoices yet" note="Create your first sales invoice. You can print it, send it by email or WhatsApp, and record payments against it.">
          <Link href="/invoices/new" className={btnPrimary}>
            Create an invoice
          </Link>
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-black/[0.03] text-xs uppercase tracking-wider text-black/55">
              <tr>
                <th className="px-5 py-3">Invoice</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3 text-right">Due</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <tr key={i._id} className="border-t border-black/5 hover:bg-black/[0.02]">
                  <td className="px-5 py-3 font-bold">
                    <Link href={`/invoices/${i._id}`} className="hover:text-[#3c8a24]">
                      {i.number}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{day(i.date)}</td>
                  <td className="px-3 py-3">{i.party.name}</td>
                  <td className="px-3 py-3 text-right font-bold">{inr(i.total)}</td>
                  <td className="px-3 py-3 text-right">{i.status === "cancelled" ? "-" : inr(i.total - i.paid)}</td>
                  <td className="px-5 py-3">
                    <StatusChip status={i.status} />
                  </td>
                </tr>
              ))}
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-black/50">
                    No invoices match.
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
