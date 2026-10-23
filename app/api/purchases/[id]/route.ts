import { NextRequest, NextResponse } from "next/server";
import { cancelPurchase } from "@/lib/docs";
import { bad, deny, sameOrigin } from "@/lib/guard";
import { purchases } from "@/lib/invoices";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const d = await deny();
  if (d) return d;
  const b = await purchases().get((await params).id);
  return b ? NextResponse.json(b) : bad("Purchase bill not found.", 404);
}

/** cancel a bill: the stock it added is taken back out */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const b = await cancelPurchase((await params).id);
  return b ? NextResponse.json(b) : bad("Purchase bill not found.", 404);
}
