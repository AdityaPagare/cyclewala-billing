import Link from "next/link";
import Icon from "@/components/Icon";
import { StatusChip } from "@/components/ui";
import { dbConfigured } from "@/lib/db";
import { day, inr, today } from "@/lib/format";
import { byNewest, invoices, items, partyBalances } from "@/lib/invoices";
import { PHASES, SECTIONS } from "@/lib/nav";
import { attendanceCol, staffCol } from "@/lib/staff";

export const metadata = { title: "Dashboard — Cycle Wala Billing" };

export default async function Dashboard() {
  const [invs, its, bal, staff, marks] = await Promise.all([invoices().all(), items().all(), partyBalances(), staffCol().all(), attendanceCol().all()]);
  const team = staff.filter((s) => s.active);
  const todayMarks = marks.filter((r) => r.date === today());
  const presentToday = todayMarks.filter((r) => r.status === "present" || r.status === "half-day").length;
  const notMarked = team.filter((s) => !todayMarks.some((r) => r.staffId === s._id)).length;
  const live = invs.filter((i) => i.kind === "sale" && i.status !== "cancelled");
  const toCollect = [...bal.values()].reduce((n, b) => n + Math.max(0, b), 0);
  const todays = live.filter((i) => i.date === today());
  const low = its.filter((i) => !i.isService && i.lowStockAt !== undefined && i.stock <= i.lowStockAt);
  const recent = [...invs].filter((i) => i.kind === "sale").sort(byNewest).slice(0, 6);

  const cards = [
    { label: "To collect", value: inr(toCollect), note: "Unpaid from customers", tone: "text-[#b3261e]" },
    { label: "Today's sales", value: inr(todays.reduce((n, i) => n + i.total, 0)), note: `${todays.length} invoice${todays.length === 1 ? "" : "s"} today`, tone: "text-[#3c8a24]" },
    { label: "Staff present", value: `${presentToday} / ${team.length}`, note: team.length === 0 ? "Add your staff" : notMarked ? `${notMarked} not marked yet` : "Everyone marked", tone: "text-[#0a0a0c]" },
    { label: "Low stock", value: String(low.length), note: low.length ? "Items to reorder" : "All stocked up", tone: low.length ? "text-[#b3261e]" : "text-[#0a0a0c]" },
  ];
  const quick = [
    { href: "/invoices/new", label: "Create invoice", icon: "receipt" },
    { href: "/parties", label: "Add party", icon: "users" },
    { href: "/items", label: "Add item", icon: "box" },
    { href: "/payments", label: "Record payment", icon: "rupee" },
    { href: "/attendance", label: "Mark attendance", icon: "calendar" },
    { href: "/payroll", label: "Run payroll", icon: "wallet" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Welcome back</h1>
        <p className="mt-1 text-black/60">Billing, staff attendance and payroll for Cycle Wala, in one place.</p>
      </div>

      {!dbConfigured() && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Saving to files on this computer.</strong> Add <code className="rounded bg-white/70 px-1">MONGODB_URI</code> to the server settings to store everything in MongoDB — see the README.
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-sm font-semibold text-black/55">{c.label}</p>
            <p className={`mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl ${c.tone}`}>{c.value}</p>
            <p className="mt-1 text-xs text-black/45">{c.note}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-extrabold">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {quick.map((q) => (
            <Link key={q.href} href={q.href} className="group flex flex-col items-start gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-[#4CAF2E]">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#4CAF2E]/12 text-[#3c8a24] group-hover:bg-[#4CAF2E] group-hover:text-white">
                <Icon name={q.icon} />
              </span>
              <span className="text-sm font-bold">{q.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">Recent invoices</h2>
            <Link href="/invoices" className="text-sm font-bold text-[#3c8a24]">
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-3 text-sm text-black/55">No invoices yet. Create your first one.</p>
          ) : (
            <ul className="mt-3 divide-y divide-black/5">
              {recent.map((i) => (
                <li key={i._id}>
                  <Link href={`/invoices/${i._id}`} className="flex items-center gap-3 py-3 hover:text-[#3c8a24]">
                    <span className="min-w-0 flex-1">
                      <b className="block truncate">{i.party.name}</b>
                      <span className="text-xs text-black/50">
                        {i.number} · {day(i.date)}
                      </span>
                    </span>
                    <StatusChip status={i.status} />
                    <b>{inr(i.total)}</b>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">Low stock</h2>
            <Link href="/items" className="text-sm font-bold text-[#3c8a24]">
              All items
            </Link>
          </div>
          {low.length === 0 ? (
            <p className="mt-3 text-sm text-black/55">Nothing is running low. Set a warning level on an item to be told when to reorder.</p>
          ) : (
            <ul className="mt-3 divide-y divide-black/5">
              {low.slice(0, 6).map((i) => (
                <li key={i._id} className="flex justify-between py-3 text-sm">
                  <b>{i.name}</b>
                  <span className="font-extrabold text-[#b3261e]">
                    {i.stock} {i.unit} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-extrabold">Build plan</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {([1, 2, 3] as const).map((p) => (
            <div key={p} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <p className="text-sm font-extrabold text-[#3c8a24]">{PHASES[p]}</p>
              <ul className="mt-3 space-y-2">
                {SECTIONS.filter((s) => s.phase === p).map((s) => (
                  <li key={s.slug}>
                    <Link href={`/${s.slug}`} className="flex items-start gap-2 text-sm font-semibold hover:text-[#3c8a24]">
                      <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-black/25" />
                      <span>
                        {s.label}
                        <span className="block text-xs font-normal text-black/50">{s.blurb}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
