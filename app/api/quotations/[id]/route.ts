import { NextRequest, NextResponse } from "next/server";
import { cancelQuotation } from "@/lib/docs";
import { bad, deny, sameOrigin } from "@/lib/guard";
import { quotations } from "@/lib/invoices";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const d = await deny();
  if (d) return d;
  const q = await quotations().get((await params).id);
  return q ? NextResponse.json(q) : bad("Quotation not found.", 404);
}

/** cancel a quotation (one that became an invoice stays as it is) */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const q = await cancelQuotation((await params).id);
  return q ? NextResponse.json(q) : bad("Quotation not found.", 404);
}
