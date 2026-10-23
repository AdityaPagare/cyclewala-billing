/* Sending an invoice or a quotation to the customer: email it with the PDF attached, or record that it went out
 * by WhatsApp / link / print (WhatsApp is opened on the owner's side, with the same message). */
import { NextRequest, NextResponse } from "next/server";
import { pdfName } from "@/lib/doc-model";
import { bad, body, deny, sameOrigin, str } from "@/lib/guard";
import { invoicePdf } from "@/lib/invoice-pdf";
import { invoices, quotations } from "@/lib/invoices";
import { mailConfigured, sendMail } from "@/lib/mail";
import { docMessage } from "@/lib/messages";
import { getBusiness } from "@/lib/settings";

const base = (req: NextRequest) => (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).replace(/\/$/, "");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** the message as simple HTML: paragraphs, with the link clickable */
const html = (text: string) =>
  `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#111827">${text
    .split("\n\n")
    .map((p) => `<p style="margin:0 0 14px">${esc(p).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#3c8a24;font-weight:700">$1</a>').replace(/\n/g, "<br>")}</p>`)
    .join("")}</div>`;

export async function sendDocument(req: NextRequest, id: string, which: "invoices" | "quotations"): Promise<NextResponse> {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const b = await body(req);
  const channel: "email" | "whatsapp" | "sms" | "print" | "link" = b?.channel === "email" ? "email" : b?.channel === "whatsapp" ? "whatsapp" : b?.channel === "sms" ? "sms" : b?.channel === "print" ? "print" : "link";
  const col = which === "invoices" ? invoices() : quotations();
  const doc = await col.get(id);
  if (!doc) return bad("Document not found.", 404);
  const biz = await getBusiness();
  const link = `${base(req)}/i/${doc.shareToken}`;
  let to = str(b?.to, 200);

  if (channel === "email") {
    to = to || doc.party.email || "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return bad("Enter a valid email address to send to.");
    if (!mailConfigured()) return bad("Email is not set up yet. Add SMTP_USER and SMTP_PASS (a Gmail App password) in the server settings.", 503);
    const msg = docMessage({ kind: doc.kind === "quotation" ? "quotation" : "sale", name: doc.party.name, number: doc.number, amount: doc.total, date: doc.date, link, shop: biz.name });
    try {
      const pdf = await invoicePdf(biz, doc);
      await sendMail({ to, subject: msg.subject, html: html(msg.text), text: msg.text, fromName: biz.name, replyTo: biz.email, attachments: [{ filename: pdfName(doc), content: pdf, contentType: "application/pdf" }] });
    } catch (e) {
      return bad(e instanceof Error ? e.message : "The email could not be sent.", 502);
    }
  }

  const shares = [...doc.shares, { channel, at: new Date().toISOString(), to: to || undefined }];
  const updated = await col.update(doc._id, { shares });
  return NextResponse.json({ ok: true, link, invoice: updated });
}
