import { NextRequest, NextResponse } from "next/server";
import { bad, body, deny, num, sameOrigin, str, text } from "@/lib/guard";
import { getBusiness, saveBusiness } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const d = await deny();
  if (d) return d;
  return NextResponse.json(await getBusiness());
}

export async function PUT(req: NextRequest) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const b = await body(req);
  if (!b) return bad("Something went wrong - please try again.");
  const name = str(b.name, 120);
  if (!name) return bad("Please enter the shop name.");
  const prefix = str(b.invoicePrefix, 12);
  const next = num(b.nextInvoiceNumber, 1, 1e8);
  if (next === null) return bad("Next invoice number must be a whole number.");
  const gstin = str(b.gstin, 20).toUpperCase();
  if (b.gstEnabled === true && !gstin) return bad("Enter your GSTIN to turn GST on.");
  const email = str(b.email, 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("That email address does not look right.");
  const saved = await saveBusiness({
    name,
    phone: str(b.phone, 30),
    email: email || undefined,
    address: text(b.address, 400),
    gstin: gstin || undefined,
    gstEnabled: b.gstEnabled === true,
    invoicePrefix: prefix,
    nextInvoiceNumber: Math.floor(next),
    upiId: str(b.upiId, 80) || undefined,
    terms: text(b.terms, 1200) || undefined,
    warranty: text(b.warranty, 800) || undefined,
    website: str(b.website, 80) || undefined,
    state: str(b.state, 60) || undefined,
  });
  return NextResponse.json(saved);
}
