import Link from "next/link";
import { notFound } from "next/navigation";
import PrintButton from "@/components/PrintButton";
import { Empty } from "@/components/ui";
import { day, inr, today } from "@/lib/format";
import { REPORTS, buildReport, presets, rangeOf, reportMeta, type Cell, type Col } from "@/lib/reports";
import { btnGhost } from "@/lib/styles";

export const metadata = { title: "Reports — Cycle Wala Billing" };

const money = (n: number) => (n < 0 ? "-" + inr(-n) : inr(n));
const show = (c: Col, v: Cell) => (typeof v === "number" ? (c.kind === "money" ? money(v) : String(v)) : c.kind === "date" ? day(v) : v);

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ r?: string; from?: string; to?: string; month?: string }> }) {
  const sp = await searchParams;
  const id = sp.r || "sales";
  const meta = reportMeta(id);
  if (!meta) notFound();
  const now = today();
  const range = rangeOf(sp, now);
  const report = await buildReport(id, range);
  if (!report) notFound();

  const qs = (p: Record<string, string>) => new URLSearchParams({ r: id, ...p }).toString();
  const csv = `/api/reports/${id}?${meta.scope === "month" ? `month=${range.from.slice(0, 7)}` : new URLSearchParams({ from: range.from, to: range.to }).toString()}`;
  const totals = report.cols.some((c) => c.sum) && report.rows.length ? report.cols.map((c, i) => (i === 0 ? "Total" : c.sum ? report.rows.reduce((n, row) => n + Number(row[i] || 0), 0) : "")) : null;

  return (
    <div className="space-y-6">
      <div className="no-print">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Reports</h1>
        <p className="text-black/60">Know how the shop is doing. Every report can be printed or downloaded for Excel.</p>
      </div>

      <div className="no-print flex flex-wrap gap-2">
        {REPORTS.map((r) => (
          <Link key={r.id} href={`/reports?${qs(r.scope === "month" ? { month: range.from.slice(0, 7) } : r.scope === "range" ? { from: range.from, to: range.to } : {})}`} className={`rounded-full px-4 py-2 text-sm font-bold ${r.id === id ? "bg-[#0a0a0c] text-white" : "bg-white ring-1 ring-black/10 hover:bg-black/5"}`}>
            {r.label}
          </Link>
        ))}
      </div>

      <section className="no-print flex flex-wrap items-end gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold">{report.title}</h2>
          <p className="text-sm text-black/55">{meta.blurb}</p>
        </div>
        {meta.scope === "range" ? (
          <form action="/reports" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="r" value={id} />
            <label className="text-xs font-bold text-black/55">
              From
              <input type="date" name="from" defaultValue={range.from} className="mt-1 block rounded-xl border border-black/15 bg-white px-3 py-2 text-sm font-normal text-black outline-none focus:border-[#4CAF2E]" />
            </label>
            <label className="text-xs font-bold text-black/55">
              To
              <input type="date" name="to" defaultValue={range.to} className="mt-1 block rounded-xl border border-black/15 bg-white px-3 py-2 text-sm font-normal text-black outline-none focus:border-[#4CAF2E]" />
            </label>
            <button className="rounded-full bg-[#0a0a0c] px-5 py-2.5 text-sm font-bold text-white">Show</button>
          </form>
        ) : null}
        {meta.scope === "month" ? (
          <form action="/reports" className="flex items-end gap-3">
            <input type="hidden" name="r" value={id} />
            <label className="text-xs font-bold text-black/55">
              Month
              <input type="month" name="month" defaultValue={range.from.slice(0, 7)} className="mt-1 block rounded-xl border border-black/15 bg-white px-3 py-2 text-sm font-normal text-black outline-none focus:border-[#4CAF2E]" />
            </label>
            <button className="rounded-full bg-[#0a0a0c] px-5 py-2.5 text-sm font-bold text-white">Show</button>
          </form>
        ) : null}
        <div className="flex gap-2">
          <a href={csv} className={btnGhost}>
            Download CSV
          </a>
          <PrintButton label="Print" />
        </div>
        {meta.scope === "range" ? (
          <div className="flex w-full flex-wrap gap-2">
            {presets(now).map((p) => (
              <Link key={p.key} href={`/reports?${qs({ from: p.from, to: p.to })}`} className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${range.from === p.from && range.to === p.to ? "bg-[#4CAF2E] text-white" : "bg-black/5 hover:bg-black/10"}`}>
                {p.label}
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <div className="hidden print:block">
        <h1 className="text-2xl font-extrabold">{report.title}</h1>
        <p className="text-sm text-black/60">{meta.scope === "range" ? `${day(range.from)} to ${day(range.to)}` : meta.scope === "month" ? range.from.slice(0, 7) : `As on ${day(now)}`}</p>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {report.summary.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-sm font-semibold text-black/55">{s.label}</p>
            <p className={`mt-2 text-2xl font-extrabold tracking-tight ${s.tone === "good" ? "text-[#3c8a24]" : s.tone === "bad" ? "text-[#b3261e]" : "text-[#0a0a0c]"}`}>{s.kind === "money" ? money(s.value) : s.value}</p>
          </div>
        ))}
      </section>

      {report.rows.length === 0 ? (
        <Empty title="Nothing to show" note="There is no data for this report in the chosen period." />
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-black/5 print:rounded-none print:shadow-none print:ring-0">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-black/[0.03] text-xs uppercase tracking-wider text-black/55">
              <tr>
                {report.cols.map((c, i) => (
                  <th key={i} className={`px-4 py-3 ${c.kind === "money" || c.kind === "num" ? "text-right" : ""}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row, r) => (
                <tr key={r} className="border-t border-black/5">
                  {row.map((v, i) => (
                    <td key={i} className={`px-4 py-3 ${report.cols[i].kind === "money" || report.cols[i].kind === "num" ? "text-right tabular-nums" : ""} ${i === 0 ? "font-semibold" : ""}`}>
                      {show(report.cols[i], v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {totals ? (
              <tfoot>
                <tr className="border-t-2 border-black/15 bg-black/[0.03] font-extrabold">
                  {totals.map((v, i) => (
                    <td key={i} className={`px-4 py-3 ${report.cols[i].kind === "money" || report.cols[i].kind === "num" ? "text-right tabular-nums" : ""}`}>
                      {typeof v === "number" ? show(report.cols[i], Math.round(v * 100) / 100) : v}
                    </td>
                  ))}
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      )}
      {report.note ? <p className="text-sm text-black/55">{report.note}</p> : null}
    </div>
  );
}
