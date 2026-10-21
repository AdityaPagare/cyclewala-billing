import { NextRequest, NextResponse } from "next/server";
import { bad, body, deny, sameOrigin, str } from "@/lib/guard";
import { inr } from "@/lib/format";
import { esc as escapeHtml, invoiceHtml } from "@/lib/invoice-html";
import { invoices } from "@/lib/invoices";
import { mailConfigured, sendMail } from "@/lib/mail";
import { getBusiness } from "@/lib/settings";

export const dynamic = "force-dynamic";

const base = (req: NextRequest) => (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).replace(/\/$/, "");

/** email the invoice, or note that it was shared by WhatsApp / a link (those are opened on the owner's side) */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const b = await body(req);
  const channel: "email" | "whatsapp" | "sms" | "print" | "link" = b?.channel === "email" ? "email" : b?.channel === "whatsapp" ? "whatsapp" : b?.channel === "sms" ? "sms" : b?.channel === "print" ? "print" : "link";
  const inv = await invoices().get((await params).id);
  if (!inv) return bad("Invoice not found.", 404);
  const biz = await getBusiness();
  const link = `${base(req)}/i/${inv.shareToken}`;
  let to = str(b?.to, 200);

  if (channel === "email") {
    to = to || inv.party.email || "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return bad("Enter a valid email address to send to.");
    if (!mailConfigured()) return bad("Email is not set up yet. Add SMTP_USER and SMTP_PASS (a Gmail App password) in the server settings.", 503);
    const due = inv.total - inv.paid;
    const doc = invoiceHtml(biz, inv, base(req));
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:794px;margin:0 auto">
      <p style="font-size:15px">Hi ${escapeHtml(inv.party.name)},</p>
      <p style="font-size:14px">Thank you for shopping at <b>${escapeHtml(biz.name)}</b>. Your invoice <b>${escapeHtml(inv.number)}</b> for <b>${escapeHtml(inr(inv.total))}</b> is below${due > 0 ? ` (balance due ${escapeHtml(inr(due))})` : ""}.</p>
      <p style="font-size:14px"><a href="${link}" style="color:#3c8a24;font-weight:700">View or print this invoice online</a></p>
      ${doc}</div>`;
    const text = `Hi ${inv.party.name},\n\nYour invoice ${inv.number} from ${biz.name} for ${inr(inv.total)}${due > 0 ? ` (balance due ${inr(due)})` : ""}.\nView or print it: ${link}\n\nThank you!`;
    try {
      await sendMail({ to, subject: `Invoice ${inv.number} from ${biz.name}`, html, text, fromName: biz.name, replyTo: biz.email });
    } catch (e) {
      return bad(e instanceof Error ? e.message : "The email could not be sent.", 502);
    }
  }

  const shares = [...inv.shares, { channel, at: new Date().toISOString(), to: to || undefined }];
  const updated = await invoices().update(inv._id, { shares });
  return NextResponse.json({ ok: true, link, invoice: updated });
}

