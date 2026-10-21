/* The Cycle Wala invoice as an HTML string with inline styles, for the email body (email clients ignore
 * stylesheets). It is the same design as components/InvoiceDocument.tsx — keep the two in step. */
import { day, inr } from "@/lib/format";
import type { BusinessProfile, Invoice } from "@/lib/types";

export const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const INK = "#0a0a0c";
const GREEN = "#4CAF2E";
const GREEN_DARK = "#3c8a24";
const LIME = "#67DD25";
const TINT = "#eef7ea";
const td = "padding:10px;border-bottom:1px solid #e8ece6;font-size:13px;vertical-align:top";
const th = `padding:10px;background:${TINT};color:${GREEN_DARK};font-weight:800;font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;text-align:left`;

/** `siteUrl` makes the logo an absolute address so it shows in the customer's mail app */
export function invoiceHtml(biz: BusinessProfile, inv: Invoice, siteUrl = ""): string {
  const gst = inv.gst ?? inv.cgst + inv.sgst + inv.igst > 0;
  const due = Math.max(0, inv.total - inv.paid);
  const hasCycle = inv.lines.some((l) => l.serial);
  const logo = siteUrl ? `<img src="${esc(siteUrl)}/images/logo-wordmark.png" alt="${esc(biz.name)}" width="190" style="display:block;width:190px;height:auto">` : `<span style="font-size:24px;font-weight:800;color:${LIME}">${esc(biz.name)}</span>`;
  const statusLabel = inv.status === "paid" ? ["PAID", "#166534", "#dcfce7"] : inv.status === "cancelled" ? ["CANCELLED", "#991b1b", "#fee2e2"] : inv.status === "partial" ? ["PART PAID", "#92400e", "#fef3c7"] : ["PAYMENT DUE", "#991b1b", "#fee2e2"];

  const rows = inv.lines
    .map(
      (l, i) =>
        `<tr><td style="${td}">${i + 1}</td><td style="${td};font-weight:700">${esc(l.name)}${l.serial ? `<div style="margin-top:3px;font-weight:400;font-size:11.5px;color:${GREEN_DARK}">Frame / serial no.: <b style="font-family:Consolas,Menlo,monospace;color:${INK}">${esc(l.serial)}</b></div>` : ""}</td>${gst ? `<td style="${td}">${esc(l.hsn || "")}</td>` : ""}<td style="${td};text-align:right;white-space:nowrap">${l.qty} ${esc(l.unit)}</td><td style="${td};text-align:right">${esc(inr(l.rate))}</td><td style="${td};text-align:right">${l.discountPct ? l.discountPct + "%" : "-"}</td>${gst ? `<td style="${td};text-align:right">${l.gstRate}%</td>` : ""}<td style="${td};text-align:right;font-weight:800">${esc(inr(l.amount))}</td></tr>`
    )
    .join("");
  const sum = (k: string, v: string) => `<tr><td style="padding:5px 8px;color:#4b5563">${k}</td><td style="padding:5px 8px;text-align:right">${esc(v)}</td></tr>`;
  /* a table row, not flexbox: Outlook and some mail apps ignore flexbox */
  const fact = (k: string, v: string) => `<table style="width:100%;border-collapse:collapse"><tr><td style="color:#6b7280">${k}</td><td style="font-weight:700;text-align:right">${v}</td></tr></table>`;

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#111827;background:#fff;max-width:794px;margin:0 auto;box-sizing:border-box">
<div style="background:${INK};color:#fff;padding:22px 28px;border-radius:14px 14px 0 0">
<table style="width:100%;border-collapse:collapse"><tr><td style="vertical-align:middle">${logo}</td>
<td style="vertical-align:middle;text-align:right"><div style="font-size:22px;font-weight:800;letter-spacing:.06em;color:#fff">${gst ? "TAX INVOICE" : "INVOICE"}</div><div style="font-size:15px;font-weight:700;color:${LIME};margin-top:3px">${esc(inv.number)}</div></td></tr></table>
<div style="margin-top:12px;font-size:11.5px;color:#b9bdb7;line-height:1.55">${esc(biz.address)} &nbsp;·&nbsp; ${esc(biz.phone)}${biz.email ? " · " + esc(biz.email) : ""}${gst && biz.gstin ? " · GSTIN " + esc(biz.gstin) : ""}</div></div>
<div style="height:5px;background:${GREEN}"></div>
<div style="padding:22px 28px 28px">
<table style="width:100%;border-collapse:separate;border-spacing:0"><tr>
<td style="vertical-align:top;width:55%;padding-right:14px"><div style="border:1px solid #e8ece6;border-radius:12px;padding:13px 16px;font-size:13px;line-height:1.55"><div style="font-size:10.5px;font-weight:800;letter-spacing:.1em;color:${GREEN_DARK}">BILLED TO</div><div style="font-weight:800;font-size:16px;margin-top:2px">${esc(inv.party.name)}</div>${inv.party.phone ? `<div>${esc(inv.party.phone)}</div>` : ""}${inv.party.address ? `<div style="color:#4b5563">${esc(inv.party.address)}</div>` : ""}${inv.party.gstin ? `<div>GSTIN: ${esc(inv.party.gstin)}</div>` : ""}</div></td>
<td style="vertical-align:top;width:45%"><div style="border:1px solid #e8ece6;border-radius:12px;padding:13px 16px;font-size:13px;line-height:1.7">${fact("Invoice date", esc(day(inv.date)))}${inv.dueDate ? fact("Due date", esc(day(inv.dueDate))) : ""}${fact("Status", `<span style="display:inline-block;padding:2px 9px;border-radius:99px;font-size:10.5px;font-weight:800;color:${statusLabel[1]};background:${statusLabel[2]}">${statusLabel[0]}</span>`)}</div></td></tr></table>
<table style="width:100%;border-collapse:collapse;margin-top:18px"><thead><tr><th style="${th}">#</th><th style="${th}">Item</th>${gst ? `<th style="${th}">HSN</th>` : ""}<th style="${th};text-align:right">Qty</th><th style="${th};text-align:right">Rate</th><th style="${th};text-align:right">Disc</th>${gst ? `<th style="${th};text-align:right">GST</th>` : ""}<th style="${th};text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
<table style="width:100%;border-collapse:collapse;margin-top:16px"><tr>
<td style="vertical-align:top;width:50%;padding-right:18px;font-size:12.5px;color:#4b5563;line-height:1.6">${due > 0 && inv.status !== "cancelled" ? `<div style="background:${TINT};border:1px solid ${GREEN};border-radius:12px;padding:12px 14px;margin-bottom:12px"><div style="font-weight:800;color:${GREEN_DARK};font-size:12px">HOW TO PAY</div><div style="color:${INK}">Pay <b>${esc(inr(due))}</b> at the store or on delivery${biz.upiId ? ` — or by UPI to <b>${esc(biz.upiId)}</b>` : ""}.</div></div>` : ""}${inv.notes ? `<div style="margin-bottom:10px"><b style="color:${INK}">Notes:</b> ${esc(inv.notes)}</div>` : ""}</td>
<td style="vertical-align:top;width:50%"><table style="width:100%;border-collapse:collapse;font-size:13px">${sum("Subtotal", inr(inv.subtotal))}${inv.discount > 0 ? sum("Discount given", "- " + inr(inv.discount)) : ""}${inv.cgst > 0 ? sum("CGST", inr(inv.cgst)) : ""}${inv.sgst > 0 ? sum("SGST", inr(inv.sgst)) : ""}${inv.igst > 0 ? sum("IGST", inr(inv.igst)) : ""}${inv.roundOff !== 0 ? sum("Round off", inr(inv.roundOff)) : ""}
<tr><td colspan="2" style="padding-top:8px"><table style="width:100%;border-collapse:collapse;background:${INK};border-radius:12px"><tr><td style="padding:13px 16px;color:#fff;font-weight:800;font-size:13px;letter-spacing:.08em">TOTAL</td><td style="padding:13px 16px;text-align:right;color:${LIME};font-weight:800;font-size:20px">${esc(inr(inv.total))}</td></tr></table></td></tr>${sum("Received", inr(inv.paid))}
<tr><td style="padding:6px 8px;font-weight:800;color:${due > 0 ? "#991b1b" : "#166534"}">Balance due</td><td style="padding:6px 8px;text-align:right;font-weight:800;color:${due > 0 ? "#991b1b" : "#166534"}">${esc(inr(due))}</td></tr></table></td></tr></table>
${(hasCycle && biz.warranty) || biz.terms ? `<div style="margin-top:20px;font-size:11.5px;color:#4b5563;line-height:1.6">${hasCycle && biz.warranty ? `<div style="border:1px dashed ${GREEN};border-radius:12px;padding:11px 14px;margin-bottom:10px"><b style="color:${GREEN_DARK}">WARRANTY</b> — ${esc(biz.warranty)}</div>` : ""}${biz.terms ? `<div><b style="color:${INK}">Terms:</b> ${esc(biz.terms)}</div>` : ""}</div>` : ""}
<div style="margin-top:22px;padding-top:14px;border-top:1px solid #e8ece6;text-align:center;font-size:12px;color:#6b7280"><b style="color:${GREEN_DARK}">Thank you for riding with ${esc(biz.name)}!</b>${biz.website ? " &nbsp;·&nbsp; " + esc(biz.website) : ""}<div style="margin-top:3px;font-size:10.5px;color:#9ca3af">This is a computer-generated invoice and needs no signature.</div></div>
</div></div>`;
}
