/* The words on a printed document change with what it is: a sales invoice, a quotation or a purchase bill.
 * Both the on-screen document and the email HTML read them from here so the two never drift apart. */
import type { Invoice } from "@/lib/types";

export type DocLabels = {
  title: string;
  partyLabel: string;
  dateLabel: string;
  dueLabel: string;
  /** show "how to pay", the amount received and the balance */
  money: boolean;
  receivedLabel: string;
  balanceLabel: string;
  status: { t: string; c: string; b: string };
  footer: string;
  note: string;
};

const RED = { c: "#991b1b", b: "#fee2e2" };
const GREEN = { c: "#166534", b: "#dcfce7" };
const AMBER = { c: "#92400e", b: "#fef3c7" };

export function docLabels(inv: Invoice, gst: boolean, shopName: string): DocLabels {
  if (inv.kind === "quotation") {
    const s = inv.status === "converted" ? { t: "ACCEPTED", ...GREEN } : inv.status === "cancelled" ? { t: "CANCELLED", ...RED } : { t: "OPEN", ...AMBER };
    return {
      title: "QUOTATION",
      partyLabel: "PREPARED FOR",
      dateLabel: "Quotation date",
      dueLabel: "Valid until",
      money: false,
      receivedLabel: "",
      balanceLabel: "",
      status: s,
      footer: `Thank you for considering ${shopName}!`,
      note: "This is an estimate, not a tax invoice. Prices are valid until the date shown.",
    };
  }
  if (inv.kind === "purchase") {
    const s = inv.status === "paid" ? { t: "PAID", ...GREEN } : inv.status === "cancelled" ? { t: "CANCELLED", ...RED } : inv.status === "partial" ? { t: "PART PAID", ...AMBER } : { t: "PAYABLE", ...RED };
    return {
      title: "PURCHASE BILL",
      partyLabel: "SUPPLIER",
      dateLabel: "Bill date",
      dueLabel: "Due date",
      money: true,
      receivedLabel: "Paid",
      balanceLabel: "Balance payable",
      status: s,
      footer: `${shopName} purchase record`,
      note: "Internal purchase record.",
    };
  }
  const s = inv.status === "paid" ? { t: "PAID", ...GREEN } : inv.status === "cancelled" ? { t: "CANCELLED", ...RED } : inv.status === "partial" ? { t: "PART PAID", ...AMBER } : { t: "PAYMENT DUE", ...RED };
  return {
    title: gst ? "TAX INVOICE" : "INVOICE",
    partyLabel: "BILLED TO",
    dateLabel: "Invoice date",
    dueLabel: "Due date",
    money: true,
    receivedLabel: "Received",
    balanceLabel: "Balance due",
    status: s,
    footer: `Thank you for riding with ${shopName}!`,
    note: "This is a computer-generated invoice and needs no signature.",
  };
}
