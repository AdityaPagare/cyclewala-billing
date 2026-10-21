import { NextRequest, NextResponse } from "next/server";
import { bad, deny, sameOrigin } from "@/lib/guard";
import { cancelInvoice, invoices } from "@/lib/invoices";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const d = await deny();
  if (d) return d;
  const inv = await invoices().get((await params).id);
  return inv ? NextResponse.json(inv) : bad("Invoice not found.", 404);
}

/** "delete" cancels the invoice and puts the stock back; the number stays in the books */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const inv = await cancelInvoice((await params).id);
  return inv ? NextResponse.json(inv) : bad("Invoice not found.", 404);
}
