/* Quotations (estimates) and purchase bills (what we buy from suppliers). They are Invoice documents in their own
 * collections, so they never mix with the sales books. */
import { randomBytes } from "crypto";
import { computeTotals } from "@/lib/calc";
import { round2 } from "@/lib/format";
import { createInvoice, items, parties, payments, purchases, quotations, type InvoiceInput } from "@/lib/invoices";
import { getBusiness, saveBusiness } from "@/lib/settings";
import type { Invoice, InvoiceKind, InvoiceStatus, Payment, PaymentMode } from "@/lib/types";

type Base = Omit<InvoiceInput, "paidNow" | "paidMode">;

async function build(kind: InvoiceKind, number: string, status: InvoiceStatus, input: Base, extra: Partial<Invoice> = {}): Promise<Omit<Invoice, "_id">> {
  const biz = await getBusiness();
  const party = input.partyId ? await parties().get(input.partyId) : null;
  if (input.partyId && !party) throw new Error("That party no longer exists.");
  const t = computeTotals(input.lines, { gst: biz.gstEnabled, interState: biz.gstEnabled && input.interState });
  return {
    shareToken: randomBytes(18).toString("base64url"),
    kind,
    number,
    date: input.date,
    dueDate: input.dueDate,
    partyId: party?._id,
    party: party ? { name: party.name, phone: party.phone, email: party.email, gstin: party.gstin, address: party.address } : { name: input.walkInName?.trim() || (kind === "purchase" ? "Supplier" : "Customer") },
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
    status,
    notes: input.notes,
    shares: [],
    createdAt: new Date().toISOString(),
    ...extra,
  };
}

const pad = (n: number) => String(n).padStart(4, "0");

/* ---------------- quotations ---------------- */

export async function createQuotation(input: Base): Promise<Invoice> {
  const biz = await getBusiness();
  const n = biz.nextQuotationNumber ?? 1;
  await saveBusiness({ nextQuotationNumber: n + 1 });
  return quotations().insert(await build("quotation", `QT-${pad(n)}`, "open", input));
}

/** turn an open quotation into a real sales invoice (stock goes down then, not before) */
export async function convertQuotation(id: string, date: string): Promise<{ invoice: Invoice; quotation: Invoice }> {
  const q = await quotations().get(id);
  if (!q) throw new Error("Quotation not found.");
  if (q.status === "converted") throw new Error("This quotation has already been turned into an invoice.");
  if (q.status === "cancelled") throw new Error("This quotation is cancelled.");
  const invoice = await createInvoice({
    partyId: q.partyId,
    walkInName: q.partyId ? undefined : q.party.name,
    date,
    interState: q.interState,
    notes: q.notes,
    lines: q.lines.map((l) => ({ itemId: l.itemId, name: l.name, hsn: l.hsn, serial: l.serial, qty: l.qty, unit: l.unit, rate: l.rate, discountPct: l.discountPct, gstRate: l.gstRate })),
  });
  const quotation = (await quotations().update(id, { status: "converted", convertedTo: invoice._id }))!;
  return { invoice, quotation };
}

export async function cancelQuotation(id: string): Promise<Invoice | null> {
  const q = await quotations().get(id);
  if (!q || q.status === "converted") return q;
  return quotations().update(id, { status: "cancelled" });
}

/* ---------------- purchase bills ---------------- */

export async function createPurchase(input: Base & { supplierBillNo?: string; paidNow?: number; paidMode?: PaymentMode }): Promise<Invoice> {
  const biz = await getBusiness();
  const n = biz.nextPurchaseNumber ?? 1;
  await saveBusiness({ nextPurchaseNumber: n + 1 });
  const bill = await purchases().insert(await build("purchase", `PB-${pad(n)}`, "unpaid", input, { supplierBillNo: input.supplierBillNo }));
  // stock comes in for goods; the item remembers the latest buying price
  for (const l of bill.lines) {
    if (!l.itemId) continue;
    const it = await items().get(l.itemId);
    if (it && !it.isService) await items().update(it._id, { stock: round2(it.stock + l.qty), purchasePrice: l.rate });
  }
  if (input.paidNow && input.paidNow > 0) {
    return (await recordPurchasePayment({ purchaseId: bill._id, amount: Math.min(input.paidNow, bill.total), mode: input.paidMode ?? "cash", date: input.date })).purchase!;
  }
  return bill;
}

export async function cancelPurchase(id: string): Promise<Invoice | null> {
  const b = await purchases().get(id);
  if (!b || b.status === "cancelled") return b;
  for (const l of b.lines) {
    if (!l.itemId) continue;
    const it = await items().get(l.itemId);
    if (it && !it.isService) await items().update(it._id, { stock: round2(it.stock - l.qty) });
  }
  return purchases().update(id, { status: "cancelled" });
}

const statusFor = (total: number, paid: number): InvoiceStatus => (paid <= 0 ? "unpaid" : paid + 0.005 >= total ? "paid" : "partial");

/** money paid to a supplier: against one bill, or (with only a partyId) their oldest unpaid bills first, the rest as an advance */
export async function recordPurchasePayment(p: { purchaseId?: string; partyId?: string; amount: number; mode: PaymentMode; date: string; reference?: string; note?: string }): Promise<{ payments: Payment[]; purchase?: Invoice }> {
  const made: Payment[] = [];
  const now = new Date().toISOString();
  const add = (extra: Partial<Payment> & { amount: number }) => payments().insert({ direction: "out", mode: p.mode, date: p.date, reference: p.reference, note: p.note, createdAt: now, ...extra } as Omit<Payment, "_id">);

  if (p.purchaseId) {
    const b = await purchases().get(p.purchaseId);
    if (!b) throw new Error("Purchase bill not found.");
    if (b.status === "cancelled") throw new Error("This bill is cancelled.");
    const amt = round2(Math.min(p.amount, b.total - b.paid));
    if (amt <= 0) throw new Error("This bill is already paid.");
    made.push(await add({ invoiceId: b._id, partyId: b.partyId, amount: amt }));
    const paid = round2(b.paid + amt);
    return { payments: made, purchase: (await purchases().update(b._id, { paid, status: statusFor(b.total, paid) })) ?? b };
  }

  if (!p.partyId) throw new Error("Choose a supplier or a bill.");
  let left = round2(p.amount);
  const open = (await purchases().all()).filter((b) => b.partyId === p.partyId && b.status !== "cancelled" && b.status !== "paid").sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  for (const b of open) {
    if (left <= 0) break;
    const amt = round2(Math.min(left, b.total - b.paid));
    made.push(await add({ invoiceId: b._id, partyId: p.partyId, amount: amt }));
    const paid = round2(b.paid + amt);
    await purchases().update(b._id, { paid, status: statusFor(b.total, paid) });
    left = round2(left - amt);
  }
  if (left > 0) made.push(await add({ partyId: p.partyId, amount: left, note: p.note || "Advance / opening balance" }));
  return { payments: made };
}
