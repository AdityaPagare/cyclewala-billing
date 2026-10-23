/* Cleaning an invoice or a payment that the forms send. Returns the clean fields or a message the user can read. */
import { isDay, num, str, text } from "@/lib/guard";
import type { InvoiceInput } from "@/lib/invoices";
import type { PaymentMode } from "@/lib/types";

const MODES: PaymentMode[] = ["cash", "upi", "card", "bank", "cheque"];
export const cleanMode = (v: unknown): PaymentMode => (MODES.includes(v as PaymentMode) ? (v as PaymentMode) : "cash");

export function cleanInvoice(b: Record<string, unknown>): { value: InvoiceInput } | { error: string } {
  if (!Array.isArray(b.lines) || b.lines.length === 0) return { error: "Add at least one item to the invoice." };
  if (b.lines.length > 100) return { error: "An invoice can have up to 100 lines." };
  const lines: InvoiceInput["lines"] = [];
  for (const [i, raw] of b.lines.entries()) {
    const l = (raw ?? {}) as Record<string, unknown>;
    const name = str(l.name, 160);
    const qty = num(l.qty, 0.001, 1e6);
    const rate = num(l.rate, 0, 1e8);
    const discountPct = num(l.discountPct ?? 0, 0, 100);
    const gstRate = num(l.gstRate ?? 0, 0, 100);
    if (!name || qty === null || rate === null || discountPct === null || gstRate === null) {
      return { error: `Line ${i + 1}: check the name, quantity, rate and discount.` };
    }
    lines.push({ itemId: str(l.itemId, 60) || undefined, name, hsn: str(l.hsn, 20) || undefined, serial: str(l.serial, 60) || undefined, qty, unit: str(l.unit, 12) || "pcs", rate, discountPct, gstRate });
  }
  const date = isDay(b.date) ? b.date : null;
  if (!date) return { error: "Choose the date." };
  if (b.dueDate && !isDay(b.dueDate)) return { error: "The due date is not valid." };
  const paidNow = b.paidNow === "" || b.paidNow == null ? 0 : num(b.paidNow, 0, 1e9);
  if (paidNow === null) return { error: "Amount received must be a number." };
  return {
    value: {
      partyId: str(b.partyId, 60) || undefined,
      walkInName: str(b.walkInName, 120) || undefined,
      date,
      dueDate: b.dueDate ? String(b.dueDate) : undefined,
      interState: b.interState === true,
      lines,
      notes: text(b.notes, 500) || undefined,
      paidNow,
      paidMode: cleanMode(b.paidMode),
    },
  };
}
