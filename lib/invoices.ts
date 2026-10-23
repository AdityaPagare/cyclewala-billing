/* Invoice and payment logic: numbering, stock, paid/unpaid status, and the party ledger. */
import { randomBytes } from "crypto";
import { computeTotals, type LineInput } from "@/lib/calc";
import { round2, today } from "@/lib/format";
import { getBusiness, saveBusiness } from "@/lib/settings";
import { col } from "@/lib/store";
import type { Invoice, InvoiceStatus, Item, Party, Payment, PaymentMode } from "@/lib/types";

export const invoices = () => col<Invoice>("invoices");
export const payments = () => col<Payment>("payments");
export const parties = () => col<Party>("parties");
export const items = () => col<Item>("items");

export const byNewest = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt);

const statusFor = (total: number, paid: number): InvoiceStatus => (paid <= 0 ? "unpaid" : paid + 0.005 >= total ? "paid" : "partial");

export type InvoiceInput = {
  partyId?: string;
  walkInName?: string;
  date: string;
  dueDate?: string;
  interState: boolean;
  lines: LineInput[];
  notes?: string;
  /** amount received at the counter right now */
  paidNow?: number;
  paidMode?: PaymentMode;
};

export async function createInvoice(input: InvoiceInput): Promise<Invoice> {
  const biz = await getBusiness();
  const party = input.partyId ? await parties().get(input.partyId) : null;
  if (input.partyId && !party) throw new Error("That party no longer exists.");
  const t = computeTotals(input.lines, { gst: biz.gstEnabled, interState: biz.gstEnabled && input.interState });
  const previousBalance = party ? (await partyBalances()).get(party._id) ?? 0 : undefined;

  // numbering: prefix + counter, advanced once per invoice
  const n = biz.nextInvoiceNumber;
  const number = `${biz.invoicePrefix}${String(n).padStart(4, "0")}`;
  await saveBusiness({ nextInvoiceNumber: n + 1 });

  const now = new Date().toISOString();
  const inv = await invoices().insert({
    shareToken: randomBytes(18).toString("base64url"),
    kind: "sale",
    number,
    date: input.date,
    dueDate: input.dueDate,
    partyId: party?._id,
    party: party
      ? { name: party.name, phone: party.phone, email: party.email, gstin: party.gstin, address: party.address }
      : { name: input.walkInName?.trim() || "Walk-in customer" },
    gst: biz.gstEnabled,
    interState: biz.gstEnabled && input.interState,
    lines: t.lines,
    subtotal: t.subtotal,
    discount: t.discount,
    cgst: t.cgst,
    sgst: t.sgst,
    igst: t.igst,
    roundOff: t.roundOff,
    total: t.total,
    paid: 0,
    status: "unpaid",
    notes: input.notes,
    previousBalance,
    shares: [],
    createdAt: now,
  });

  // stock goes down for goods (not services)
  for (const l of t.lines) {
    if (!l.itemId) continue;
    const it = await items().get(l.itemId);
    if (it && !it.isService) await items().update(it._id, { stock: round2(it.stock - l.qty) });
  }

  if (input.paidNow && input.paidNow > 0) {
    return (await recordPayment({ invoiceId: inv._id, amount: Math.min(input.paidNow, inv.total), mode: input.paidMode ?? "cash", date: input.date })).invoice!;
  }
  return inv;
}

export async function cancelInvoice(id: string): Promise<Invoice | null> {
  const inv = await invoices().get(id);
  if (!inv || inv.status === "cancelled") return inv;
  for (const l of inv.lines) {
    if (!l.itemId) continue;
    const it = await items().get(l.itemId);
    if (it && !it.isService) await items().update(it._id, { stock: round2(it.stock + l.qty) });
  }
  return invoices().update(id, { status: "cancelled" });
}

/** Record money received (or paid out). With an invoiceId it settles that invoice; with only a partyId it settles
 *  that party's oldest unpaid invoices first and keeps any rest as an advance. */
export async function recordPayment(p: {
  invoiceId?: string;
  partyId?: string;
  amount: number;
  mode: PaymentMode;
  date: string;
  reference?: string;
  note?: string;
}): Promise<{ payments: Payment[]; invoice?: Invoice }> {
  const made: Payment[] = [];
  const now = new Date().toISOString();
  const add = (extra: Partial<Payment> & { amount: number }) =>
    payments().insert({ direction: "in", mode: p.mode, date: p.date, reference: p.reference, note: p.note, createdAt: now, ...extra } as Omit<Payment, "_id">);

  if (p.invoiceId) {
    const inv = await invoices().get(p.invoiceId);
    if (!inv) throw new Error("Invoice not found.");
    if (inv.status === "cancelled") throw new Error("This invoice is cancelled.");
    const due = round2(inv.total - inv.paid);
    const amt = round2(Math.min(p.amount, due));
    if (amt <= 0) throw new Error("This invoice is already paid.");
    made.push(await add({ invoiceId: inv._id, partyId: inv.partyId, amount: amt }));
    const paid = round2(inv.paid + amt);
    const updated = await invoices().update(inv._id, { paid, status: statusFor(inv.total, paid) });
    return { payments: made, invoice: updated ?? inv };
  }

  if (!p.partyId) throw new Error("Choose a party or an invoice.");
  let left = round2(p.amount);
  const open = (await invoices().all())
    .filter((i) => i.partyId === p.partyId && i.kind === "sale" && i.status !== "cancelled" && i.status !== "paid")
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  for (const inv of open) {
    if (left <= 0) break;
    const amt = round2(Math.min(left, inv.total - inv.paid));
    if (amt <= 0) continue;
    made.push(await add({ invoiceId: inv._id, partyId: p.partyId, amount: amt }));
    const paid = round2(inv.paid + amt);
    await invoices().update(inv._id, { paid, status: statusFor(inv.total, paid) });
    left = round2(left - amt);
  }
  if (left > 0) made.push(await add({ partyId: p.partyId, amount: left, note: p.note || "Advance / opening balance" }));
  return { payments: made };
}

export const quotations = () => col<Invoice>("quotations");
export const purchases = () => col<Invoice>("purchases");

/** What a party owes us (+) or what we owe them (-): opening balance + our sales - their payments to us
 *  - our purchases from them + our payments to them. */
export async function partyBalances(): Promise<Map<string, number>> {
  const [ps, invs, pays, buys] = await Promise.all([parties().all(), invoices().all(), payments().all(), purchases().all()]);
  const bal = new Map<string, number>(ps.map((p) => [p._id, p.openingBalance]));
  const add = (id: string | undefined, by: number) => id && bal.set(id, round2((bal.get(id) ?? 0) + by));
  for (const i of invs) if (i.kind === "sale" && i.status !== "cancelled") add(i.partyId, i.total);
  for (const b of buys) if (b.status !== "cancelled") add(b.partyId, -b.total);
  for (const p of pays) add(p.partyId, p.direction === "in" ? -p.amount : p.amount);
  return bal;
}

export type LedgerRow = { date: string; at: string; label: string; ref: string; debit: number; credit: number; balance: number };

/** debit = "you gave" (a sale on credit, or money you paid out); credit = "you got" (money received, or goods you bought) */
export async function ledgerFor(partyId: string): Promise<{ party: Party; rows: LedgerRow[]; balance: number } | null> {
  const party = await parties().get(partyId);
  if (!party) return null;
  const [invs, pays, buys] = await Promise.all([invoices().all(), payments().all(), purchases().all()]);
  const raw: Omit<LedgerRow, "balance">[] = [];
  for (const i of invs) if (i.partyId === partyId && i.kind === "sale" && i.status !== "cancelled") raw.push({ date: i.date, at: i.createdAt, label: "Sales invoice", ref: i.number, debit: i.total, credit: 0 });
  for (const b of buys) if (b.partyId === partyId && b.status !== "cancelled") raw.push({ date: b.date, at: b.createdAt, label: "Purchase bill", ref: b.supplierBillNo ? `${b.number} (bill ${b.supplierBillNo})` : b.number, debit: 0, credit: b.total });
  for (const p of pays) {
    if (p.partyId !== partyId) continue;
    if (p.direction === "in") raw.push({ date: p.date, at: p.createdAt, label: `Payment received (${p.mode})`, ref: p.reference || "", debit: 0, credit: p.amount });
    else raw.push({ date: p.date, at: p.createdAt, label: `Payment made (${p.mode})`, ref: p.reference || "", debit: p.amount, credit: 0 });
  }
  raw.sort((a, b) => a.date.localeCompare(b.date) || a.at.localeCompare(b.at));
  let bal = party.openingBalance;
  const rows = raw.map((r) => ({ ...r, balance: (bal = round2(bal + r.debit - r.credit)) }));
  return { party, rows, balance: bal };
}

export { today };
