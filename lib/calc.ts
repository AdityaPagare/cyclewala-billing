/* Invoice arithmetic, shared by the editor (live totals as you type) and the server (the numbers that are saved).
 * The server always recomputes from the quantities and rates, so a tampered request cannot change what is owed. */
import { round2 } from "@/lib/format";
import type { InvoiceLine } from "@/lib/types";

export type LineInput = {
  itemId?: string;
  name: string;
  hsn?: string;
  serial?: string;
  qty: number;
  unit: string;
  rate: number;
  discountPct: number;
  gstRate: number;
};

export type Totals = {
  lines: InvoiceLine[];
  subtotal: number; // taxable value of all lines
  discount: number; // total discount given
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  total: number;
};

/** `gst` false: no tax at all. `interState`: IGST instead of CGST + SGST. */
export function computeTotals(input: LineInput[], opts: { gst: boolean; interState: boolean }): Totals {
  let subtotal = 0;
  let discount = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  const lines: InvoiceLine[] = input.map((l) => {
    const gross = l.qty * l.rate;
    const off = gross * (l.discountPct / 100);
    const taxable = round2(gross - off);
    const tax = opts.gst ? round2(taxable * (l.gstRate / 100)) : 0;
    subtotal += taxable;
    discount += off;
    if (opts.gst) {
      if (opts.interState) igst += tax;
      else {
        cgst += round2(tax / 2);
        sgst += round2(tax - round2(tax / 2));
      }
    }
    return {
      itemId: l.itemId,
      name: l.name,
      hsn: l.hsn,
      serial: l.serial,
      qty: l.qty,
      unit: l.unit,
      rate: l.rate,
      discountPct: l.discountPct,
      gstRate: opts.gst ? l.gstRate : 0,
      taxable,
      amount: round2(taxable + tax),
    };
  });
  subtotal = round2(subtotal);
  const exact = subtotal + cgst + sgst + igst;
  const total = Math.round(exact);
  return { lines, subtotal, discount: round2(discount), cgst: round2(cgst), sgst: round2(sgst), igst: round2(igst), roundOff: round2(total - exact), total };
}
