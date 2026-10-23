/* The reports. Each one is built as plain rows and columns so the screen, the print view and the CSV download
 * all show exactly the same numbers. Money is in rupees; the date range is inclusive ("YYYY-MM-DD"). */
import { round2 } from "@/lib/format";
import { invoices, items, parties, partyBalances, purchases } from "@/lib/invoices";
import { daysInMonth, isMonth } from "@/lib/payroll";
import { payrollCol, payrollForMonth } from "@/lib/staff";
import type { Invoice } from "@/lib/types";

export type ColKind = "text" | "money" | "num" | "date";
export type Col = { label: string; kind: ColKind; /** add this column up in a totals row */ sum?: boolean };
export type Cell = string | number;
export type Report = {
  id: string;
  title: string;
  /** how the report is bounded: a date range, one month, or "today" */
  scope: "range" | "month" | "now";
  cols: Col[];
  rows: Cell[][];
  summary: { label: string; value: number; kind: "money" | "num"; tone?: "good" | "bad" }[];
  note?: string;
};

export const REPORTS: { id: string; label: string; blurb: string; scope: Report["scope"] }[] = [
  { id: "sales", label: "Daily sales", blurb: "What you billed and collected, day by day.", scope: "range" },
  { id: "items", label: "Sales by item", blurb: "Which cycles and parts sell, with profit on each.", scope: "range" },
  { id: "brands", label: "Sales by brand", blurb: "Sales and profit for each brand.", scope: "range" },
  { id: "parties", label: "Sales by customer", blurb: "Who buys the most, and who still owes you.", scope: "range" },
  { id: "profit", label: "Profit estimate", blurb: "Sales less the cost of what you sold, and salaries paid.", scope: "range" },
  { id: "outstanding", label: "Receivables & payables", blurb: "Who owes you and whom you owe, right now.", scope: "now" },
  { id: "gst", label: "GST summary", blurb: "Tax on sales and purchases, laid out like GSTR-1 for your CA.", scope: "range" },
  { id: "stock", label: "Stock value", blurb: "What is on the shelf and what it is worth. Low stock is flagged.", scope: "now" },
  { id: "staff", label: "Attendance & payroll", blurb: "Days worked and salary for every staff member in a month.", scope: "month" },
];

export const reportMeta = (id: string) => REPORTS.find((r) => r.id === id);

const inRange = (d: string, from: string, to: string) => d >= from && d <= to;
const sum = (a: number[]) => round2(a.reduce((n, x) => n + x, 0));

async function salesIn(from: string, to: string): Promise<Invoice[]> {
  return (await invoices().all()).filter((i) => i.kind === "sale" && i.status !== "cancelled" && inRange(i.date, from, to));
}

export async function buildReport(id: string, o: { from: string; to: string }): Promise<Report | null> {
  const { from, to } = o;
  switch (id) {
    case "sales": {
      const list = await salesIn(from, to);
      const byDay = new Map<string, Invoice[]>();
      for (const i of list) byDay.set(i.date, [...(byDay.get(i.date) ?? []), i]);
      const rows = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([d, l]) => [d, l.length, sum(l.map((i) => i.subtotal - i.discount)), sum(l.map((i) => i.cgst + i.sgst + i.igst)), sum(l.map((i) => i.total)), sum(l.map((i) => i.paid)), sum(l.map((i) => i.total - i.paid))] as Cell[]);
      const total = sum(list.map((i) => i.total));
      return {
        id,
        title: "Daily sales",
        scope: "range",
        cols: [
          { label: "Date", kind: "date" },
          { label: "Invoices", kind: "num", sum: true },
          { label: "Before tax", kind: "money", sum: true },
          { label: "Tax", kind: "money", sum: true },
          { label: "Billed", kind: "money", sum: true },
          { label: "Collected", kind: "money", sum: true },
          { label: "Pending", kind: "money", sum: true },
        ],
        rows,
        summary: [
          { label: "Billed", value: total, kind: "money" },
          { label: "Invoices", value: list.length, kind: "num" },
          { label: "Average bill", value: list.length ? round2(total / list.length) : 0, kind: "money" },
          { label: "Collected", value: sum(list.map((i) => i.paid)), kind: "money", tone: "good" },
          { label: "Pending", value: sum(list.map((i) => i.total - i.paid)), kind: "money", tone: "bad" },
        ],
      };
    }

    case "items":
    case "brands": {
      const [list, its] = await Promise.all([salesIn(from, to), items().all()]);
      const byId = new Map(its.map((i) => [i._id, i]));
      type Agg = { name: string; brand: string; qty: number; sales: number; cost: number };
      const agg = new Map<string, Agg>();
      for (const inv of list) {
        for (const l of inv.lines) {
          const it = l.itemId ? byId.get(l.itemId) : undefined;
          const brand = it?.brand || "Other";
          const key = id === "brands" ? brand : l.itemId || `name:${l.name}`;
          const a = agg.get(key) ?? { name: id === "brands" ? brand : l.name, brand, qty: 0, sales: 0, cost: 0 };
          a.qty += l.qty;
          a.sales += l.taxable;
          a.cost += l.qty * (it?.purchasePrice ?? 0);
          agg.set(key, a);
        }
      }
      const out = [...agg.values()].sort((a, b) => b.sales - a.sales);
      const rows = out.map((a) => (id === "brands" ? [a.name, round2(a.qty), round2(a.sales), round2(a.cost), round2(a.sales - a.cost)] : [a.name, a.brand, round2(a.qty), round2(a.sales), round2(a.cost), round2(a.sales - a.cost)]) as Cell[]);
      const cols: Col[] =
        id === "brands"
          ? [{ label: "Brand", kind: "text" }, { label: "Qty sold", kind: "num", sum: true }, { label: "Sales", kind: "money", sum: true }, { label: "Cost", kind: "money", sum: true }, { label: "Profit", kind: "money", sum: true }]
          : [{ label: "Item", kind: "text" }, { label: "Brand", kind: "text" }, { label: "Qty sold", kind: "num", sum: true }, { label: "Sales", kind: "money", sum: true }, { label: "Cost", kind: "money", sum: true }, { label: "Profit", kind: "money", sum: true }];
      const sales = sum(out.map((a) => a.sales));
      const cost = sum(out.map((a) => a.cost));
      return {
        id,
        title: id === "brands" ? "Sales by brand" : "Sales by item",
        scope: "range",
        cols,
        rows,
        summary: [
          { label: "Sales (before tax)", value: sales, kind: "money" },
          { label: "Cost of goods", value: cost, kind: "money" },
          { label: "Profit", value: round2(sales - cost), kind: "money", tone: "good" },
        ],
        note: "Cost uses each item's buying price from Items (it updates when you enter a purchase bill). Items without a buying price count as zero cost, so their profit looks higher than it is.",
      };
    }

    case "parties": {
      const [list, bal] = await Promise.all([salesIn(from, to), partyBalances()]);
      const m = new Map<string, { name: string; n: number; billed: number; paid: number; pid?: string }>();
      for (const i of list) {
        const k = i.partyId ?? `walk:${i.party.name}`;
        const a = m.get(k) ?? { name: i.party.name, n: 0, billed: 0, paid: 0, pid: i.partyId };
        a.n += 1;
        a.billed += i.total;
        a.paid += i.paid;
        m.set(k, a);
      }
      const out = [...m.values()].sort((a, b) => b.billed - a.billed);
      return {
        id,
        title: "Sales by customer",
        scope: "range",
        cols: [{ label: "Customer", kind: "text" }, { label: "Invoices", kind: "num", sum: true }, { label: "Billed", kind: "money", sum: true }, { label: "Paid on these", kind: "money", sum: true }, { label: "Owes you now", kind: "money" }],
        rows: out.map((a) => [a.name, a.n, round2(a.billed), round2(a.paid), a.pid ? Math.max(0, bal.get(a.pid) ?? 0) : 0] as Cell[]),
        summary: [
          { label: "Customers", value: out.length, kind: "num" },
          { label: "Billed", value: sum(out.map((a) => a.billed)), kind: "money" },
        ],
        note: "\"Owes you now\" is the customer's full balance today, not only these invoices.",
      };
    }

    case "profit": {
      const [list, its, buys, payroll] = await Promise.all([salesIn(from, to), items().all(), purchases().all(), payrollCol().all()]);
      const byId = new Map(its.map((i) => [i._id, i]));
      let cost = 0;
      let unknown = 0;
      for (const i of list) {
        for (const l of i.lines) {
          const p = l.itemId ? byId.get(l.itemId)?.purchasePrice : undefined;
          if (p) cost += l.qty * p;
          else unknown += 1;
        }
      }
      const sales = sum(list.map((i) => i.subtotal - i.discount));
      cost = round2(cost);
      const gross = round2(sales - cost);
      const bought = sum(buys.filter((b) => b.status !== "cancelled" && inRange(b.date, from, to)).map((b) => b.total));
      const wages = sum(payroll.filter((p) => p.paid && p.paidOn && inRange(p.paidOn, from, to)).map((p) => p.net));
      const rows: Cell[][] = [
        ["Sales (before tax)", sales],
        ["Cost of what you sold", -cost],
        ["Gross profit", gross],
        ["Salaries paid in this period", -wages],
        ["Profit after salaries", round2(gross - wages)],
        ["Stock bought in this period (for information)", bought],
      ];
      return {
        id,
        title: "Profit estimate",
        scope: "range",
        cols: [{ label: "", kind: "text" }, { label: "Amount", kind: "money" }],
        rows,
        summary: [
          { label: "Gross profit", value: gross, kind: "money", tone: gross >= 0 ? "good" : "bad" },
          { label: "After salaries", value: round2(gross - wages), kind: "money", tone: gross - wages >= 0 ? "good" : "bad" },
        ],
        note: `An estimate: the cost of goods uses each item's latest buying price.${unknown ? ` ${unknown} sold line${unknown === 1 ? " has" : "s have"} no buying price, so ${unknown === 1 ? "its" : "their"} cost is counted as zero.` : ""} Other shop expenses (rent, electricity) are not recorded here.`,
      };
    }

    case "outstanding": {
      const [ps, bal] = await Promise.all([parties().all(), partyBalances()]);
      const rows: Cell[][] = [];
      let collect = 0;
      let pay = 0;
      for (const p of ps.sort((a, b) => a.name.localeCompare(b.name))) {
        const b = bal.get(p._id) ?? 0;
        if (b > 0) {
          collect += b;
          rows.push([p.name, p.phone, "To collect", b]);
        } else if (b < 0) {
          pay += -b;
          rows.push([p.name, p.phone, "To pay", -b]);
        }
      }
      rows.sort((a, b) => String(a[2]).localeCompare(String(b[2])) || Number(b[3]) - Number(a[3]));
      return {
        id,
        title: "Receivables & payables",
        scope: "now",
        cols: [{ label: "Party", kind: "text" }, { label: "Phone", kind: "text" }, { label: "Type", kind: "text" }, { label: "Amount", kind: "money" }],
        rows,
        summary: [
          { label: "To collect", value: round2(collect), kind: "money", tone: "bad" },
          { label: "To pay", value: round2(pay), kind: "money", tone: "bad" },
          { label: "Net", value: round2(collect - pay), kind: "money", tone: collect - pay >= 0 ? "good" : "bad" },
        ],
      };
    }

    case "gst": {
      const [sales, buys, parts] = await Promise.all([salesIn(from, to), purchases().all(), parties().all()]);
      const gstin = new Map(parts.map((p) => [p._id, p.gstin ?? ""]));
      const taxed = (i: Invoice) => (i.gst ?? i.cgst + i.sgst + i.igst > 0) === true;
      const out = sales.filter(taxed);
      const inn = buys.filter((b) => b.status !== "cancelled" && inRange(b.date, from, to) && taxed(b));
      const row = (type: string, i: Invoice): Cell[] => [type, i.date, i.number, i.party.name, i.party.gstin || (i.partyId ? gstin.get(i.partyId) ?? "" : ""), round2(i.subtotal - i.discount), i.cgst, i.sgst, i.igst, i.total];
      const rows = [...out.map((i) => row("Sale", i)), ...inn.map((i) => row("Purchase", i))].sort((a, b) => String(a[1]).localeCompare(String(b[1])));
      const outTax = sum(out.map((i) => i.cgst + i.sgst + i.igst));
      const inTax = sum(inn.map((i) => i.cgst + i.sgst + i.igst));
      return {
        id,
        title: "GST summary",
        scope: "range",
        cols: [
          { label: "Type", kind: "text" },
          { label: "Date", kind: "date" },
          { label: "Number", kind: "text" },
          { label: "Party", kind: "text" },
          { label: "GSTIN", kind: "text" },
          { label: "Taxable value", kind: "money", sum: true },
          { label: "CGST", kind: "money", sum: true },
          { label: "SGST", kind: "money", sum: true },
          { label: "IGST", kind: "money", sum: true },
          { label: "Total", kind: "money", sum: true },
        ],
        rows,
        summary: [
          { label: "Tax on sales (output)", value: outTax, kind: "money" },
          { label: "Tax on purchases (input credit)", value: inTax, kind: "money" },
          { label: "Net GST to pay", value: round2(outTax - inTax), kind: "money", tone: outTax - inTax <= 0 ? "good" : "bad" },
        ],
        note: rows.length === 0 ? "No GST invoices in this period. Turn GST on in Settings to charge CGST/SGST/IGST on new invoices." : "Only documents made while GST was switched on are listed.",
      };
    }

    case "stock": {
      const its = (await items().all()).filter((i) => !i.isService).sort((a, b) => a.name.localeCompare(b.name));
      const rows = its.map((i) => [i.name, i.brand || "", i.stock, i.purchasePrice ?? 0, round2(i.stock * (i.purchasePrice ?? 0)), i.salePrice, round2(i.stock * i.salePrice), i.lowStockAt !== undefined && i.stock <= i.lowStockAt ? "Low" : ""] as Cell[]);
      const cost = sum(its.map((i) => i.stock * (i.purchasePrice ?? 0)));
      const retail = sum(its.map((i) => i.stock * i.salePrice));
      return {
        id,
        title: "Stock value",
        scope: "now",
        cols: [
          { label: "Item", kind: "text" },
          { label: "Brand", kind: "text" },
          { label: "In stock", kind: "num", sum: true },
          { label: "Buying price", kind: "money" },
          { label: "Value at cost", kind: "money", sum: true },
          { label: "Selling price", kind: "money" },
          { label: "Value at selling price", kind: "money", sum: true },
          { label: "Alert", kind: "text" },
        ],
        rows,
        summary: [
          { label: "Stock at cost", value: cost, kind: "money" },
          { label: "Stock at selling price", value: retail, kind: "money" },
          { label: "Low-stock items", value: its.filter((i) => i.lowStockAt !== undefined && i.stock <= i.lowStockAt).length, kind: "num", tone: "bad" },
        ],
      };
    }

    case "staff": {
      const month = isMonth(from.slice(0, 7)) ? from.slice(0, 7) : to.slice(0, 7);
      if (!isMonth(month)) return null;
      const list = await payrollForMonth(month);
      const rows = list.map(({ staff, entry: e }) => [staff.name, staff.role, e.presentDays, e.halfDays, e.leaveDays, e.absentDays + e.unmarkedDays, e.payableDays, e.overtimeHours, e.net, e.paid ? "Paid" : "Not paid"] as Cell[]);
      return {
        id,
        title: `Attendance & payroll — ${month}`,
        scope: "month",
        cols: [
          { label: "Name", kind: "text" },
          { label: "Role", kind: "text" },
          { label: "Present", kind: "num", sum: true },
          { label: "Half days", kind: "num", sum: true },
          { label: "Leave", kind: "num", sum: true },
          { label: "Absent / unmarked", kind: "num", sum: true },
          { label: "Payable days", kind: "num" },
          { label: "Overtime hrs", kind: "num", sum: true },
          { label: "Net pay", kind: "money", sum: true },
          { label: "Status", kind: "text" },
        ],
        rows,
        summary: [
          { label: "Staff", value: list.length, kind: "num" },
          { label: "Total net pay", value: sum(list.map((r) => r.entry.net)), kind: "money" },
          { label: "Still to pay", value: sum(list.filter((r) => !r.entry.paid).map((r) => r.entry.net)), kind: "money", tone: "bad" },
        ],
        note: `${daysInMonth(month)} days in the month. Pay is worked out from the attendance marked for each day.`,
      };
    }
  }
  return null;
}

/* ---------------- CSV ---------------- */

const csvCell = (v: Cell) => {
  if (typeof v === "number") return String(v);
  let s = String(v);
  // stop spreadsheets running text that starts like a formula
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function reportCsv(r: Report): string {
  const lines = [r.cols.map((c) => csvCell(c.label)).join(",")];
  for (const row of r.rows) lines.push(row.map(csvCell).join(","));
  if (r.cols.some((c) => c.sum) && r.rows.length) {
    lines.push(r.cols.map((c, i) => (i === 0 ? "Total" : c.sum ? csvCell(round2(r.rows.reduce((n, row) => n + Number(row[i] || 0), 0))) : "")).join(","));
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/* ---------------- date ranges ---------------- */

const pad2 = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** the quick ranges offered above a report */
export function presets(nowIso: string): { key: string; label: string; from: string; to: string }[] {
  const [y, m] = nowIso.split("-").map(Number);
  const last = new Date(y, m - 1, 0); // last day of the previous month
  const fy = m >= 4 ? y : y - 1;
  return [
    { key: "today", label: "Today", from: nowIso, to: nowIso },
    { key: "month", label: "This month", from: `${y}-${pad2(m)}-01`, to: nowIso },
    { key: "last", label: "Last month", from: `${last.getFullYear()}-${pad2(last.getMonth() + 1)}-01`, to: ymd(last) },
    { key: "fy", label: "This financial year", from: `${fy}-04-01`, to: nowIso },
    { key: "all", label: "All time", from: "2000-01-01", to: nowIso },
  ];
}

/** the from/to a report page or download asked for, falling back to this month */
export function rangeOf(p: { from?: string; to?: string; month?: string }, nowIso: string): { from: string; to: string } {
  if (p.month && isMonth(p.month)) return { from: `${p.month}-01`, to: `${p.month}-${pad2(daysInMonth(p.month))}` };
  const ok = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v + "T00:00:00").getTime());
  const def = presets(nowIso)[1];
  const from = ok(p.from) ? p.from! : def.from;
  const to = ok(p.to) ? p.to! : def.to;
  return from <= to ? { from, to } : { from: to, to: from };
}
