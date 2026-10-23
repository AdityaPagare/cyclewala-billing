/* Everything printed on an invoice, quotation or purchase bill, worked out once. The PDF (lib/invoice-pdf.ts) and
 * the on-screen page (components/InvoiceDocument.tsx) only paint this, so they always show the same thing.
 * The layout follows the shop's own bill: gold frame, logo and shop details on top, bill-to, item table,
 * terms on the left, totals and signature on the right. */
import { istParts } from "@/lib/ist";
import { round2 } from "@/lib/format";
import { rupeesInWords } from "@/lib/words";
import type { BusinessProfile, Invoice } from "@/lib/types";

export type Row = { no: number; name: string; serial?: string; hsn: string; qty: string; rate: string; disc: string; gst: string; total: string };
export type Total = { label: string; value: string; bold?: boolean; /** a rupee sign goes before the number */ rupee?: boolean; line?: "above" | "below" };

export type DocModel = {
  title: string;
  stamp: string;
  shop: { name: string; gstin: string; phone: string; address: string };
  facts: { k: string; v: string }[];
  partyLabel: string;
  party: { name: string; lines: { k: string; v: string }[] };
  showHsn: boolean;
  showDisc: boolean;
  showGst: boolean;
  rows: Row[];
  subtotalQty: string;
  subtotalAmount: string;
  terms: string[];
  warranty: string;
  totals: Total[];
  words: string;
  cancelled: boolean;
  notes: string;
};

/** 5000 -> "5,000", 1234.5 -> "1,234.50" (Indian digit grouping) */
export function num(n: number): string {
  const v = round2(n);
  return v.toLocaleString("en-IN", { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
}

/** "2026-10-20" + a created-at time -> "20/10/2026 9:01 PM" (Indian time) */
export function dateTime(day: string, createdAt?: string): string {
  const [y, m, d] = day.split("-");
  const base = `${d}/${m}/${y}`;
  if (!createdAt) return base;
  const t = istParts(new Date(createdAt));
  if (Number.isNaN(t.hour)) return base;
  return `${base} ${t.hour % 12 || 12}:${t.time.slice(3)} ${t.hour < 12 ? "AM" : "PM"}`;
}
const dateOnly = (day: string) => dateTime(day);

export function buildDoc(biz: BusinessProfile, inv: Invoice): DocModel {
  const kind = inv.kind ?? "sale";
  const gst = inv.gst ?? inv.cgst + inv.sgst + inv.igst > 0;
  const due = Math.max(0, round2(inv.total - inv.paid));
  const showDisc = inv.lines.some((l) => l.discountPct > 0);
  const showHsn = gst;

  const title = kind === "quotation" ? "QUOTATION" : kind === "purchase" ? "PURCHASE BILL" : gst ? "TAX INVOICE" : "BILL OF SUPPLY";
  const stamp = kind === "quotation" ? "ESTIMATE" : kind === "purchase" ? "INTERNAL" : "ORIGINAL";

  const facts =
    kind === "quotation"
      ? [{ k: "Quotation No.", v: inv.number }, { k: "Date", v: dateTime(inv.date, inv.createdAt) }, ...(inv.dueDate ? [{ k: "Valid until", v: dateOnly(inv.dueDate) }] : [])]
      : kind === "purchase"
        ? [{ k: "Bill No.", v: inv.number }, { k: "Bill Date", v: dateTime(inv.date, inv.createdAt) }, ...(inv.supplierBillNo ? [{ k: "Supplier Bill No.", v: inv.supplierBillNo }] : []), ...(inv.dueDate ? [{ k: "Due Date", v: dateOnly(inv.dueDate) }] : [])]
        : [{ k: "Invoice No.", v: inv.number }, { k: "Invoice Date", v: dateTime(inv.date, inv.createdAt) }, ...(inv.dueDate ? [{ k: "Due Date", v: dateOnly(inv.dueDate) }] : [])];

  const partyLines: { k: string; v: string }[] = [];
  if (inv.party.phone) partyLines.push({ k: "Mobile", v: inv.party.phone });
  if (inv.party.gstin) partyLines.push({ k: "GSTIN", v: inv.party.gstin });
  if (inv.party.address) partyLines.push({ k: "Address", v: inv.party.address });
  if (biz.state && kind !== "purchase") partyLines.push({ k: "Place of Supply", v: biz.state });

  const rows: Row[] = inv.lines.map((l, i) => ({
    no: i + 1,
    name: l.name,
    serial: l.serial,
    hsn: l.hsn ?? "",
    qty: `${num(l.qty)} ${l.unit.toUpperCase()}`,
    rate: num(l.rate),
    disc: l.discountPct ? `${num(l.discountPct)}%` : "",
    gst: gst ? `${num(l.gstRate)}%` : "",
    total: num(l.amount),
  }));
  const qty = inv.lines.reduce((n, l) => n + l.qty, 0);

  const totals: Total[] = [];
  if (inv.discount > 0) totals.push({ label: "Discount", value: `- ₹ ${num(inv.discount)}` });
  if (gst) {
    totals.push({ label: "Taxable Amount", value: num(inv.subtotal - inv.discount), rupee: true });
    if (inv.cgst > 0) totals.push({ label: "CGST", value: num(inv.cgst), rupee: true });
    if (inv.sgst > 0) totals.push({ label: "SGST", value: num(inv.sgst), rupee: true });
    if (inv.igst > 0) totals.push({ label: "IGST", value: num(inv.igst), rupee: true });
  }
  if (inv.roundOff !== 0) totals.push({ label: "Round Off", value: num(inv.roundOff), rupee: true });
  totals.push({ label: "Total Amount", value: num(inv.total), bold: true, rupee: true, line: "above" });
  if (kind !== "quotation") {
    totals.push({ label: kind === "purchase" ? "Paid Amount" : "Received Amount", value: num(inv.paid), rupee: true, line: "above" });
    totals.push({ label: "Balance", value: num(due), bold: true, rupee: true });
    if (kind === "sale" && inv.previousBalance !== undefined) {
      totals.push({ label: "Previous Balance", value: num(inv.previousBalance), rupee: true, line: "above" });
      totals.push({ label: "Current Balance", value: num(round2(inv.previousBalance + (inv.status === "cancelled" ? 0 : due))), rupee: true });
    }
  }

  return {
    title,
    stamp,
    shop: { name: biz.name, gstin: biz.gstin ?? "", phone: biz.phone, address: biz.address },
    facts,
    partyLabel: kind === "purchase" ? "Supplier" : kind === "quotation" ? "Quotation For" : "Bill To",
    party: { name: inv.party.name, lines: partyLines },
    showHsn,
    showDisc,
    showGst: gst,
    rows,
    subtotalQty: num(qty),
    subtotalAmount: num(inv.lines.reduce((n, l) => n + l.amount, 0)),
    terms: kind === "purchase" ? [] : (biz.terms ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean),
    warranty: kind !== "purchase" && inv.lines.some((l) => l.serial) ? biz.warranty ?? "" : "",
    totals,
    words: rupeesInWords(inv.total),
    cancelled: inv.status === "cancelled",
    notes: inv.notes ?? "",
  };
}

/** SHASHANK_JOSHI_Sales_Invoice_6098.pdf */
export function pdfName(inv: Invoice): string {
  const who = inv.party.name.trim().toUpperCase().replace(/[^A-Z0-9ऀ-ॿ]+/g, "_").replace(/^_+|_+$/g, "") || "CUSTOMER";
  const what = inv.kind === "quotation" ? "Quotation" : inv.kind === "purchase" ? "Purchase_Bill" : "Sales_Invoice";
  const no = inv.number.replace(/[^A-Za-z0-9]+/g, "").replace(/^[A-Za-z]+(?=\d)/, "") || inv.number.replace(/[^A-Za-z0-9]+/g, "");
  return `${who}_${what}_${no}.pdf`;
}
