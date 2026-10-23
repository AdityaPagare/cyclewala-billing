import { NextRequest, NextResponse } from "next/server";
import { cleanInvoice } from "@/lib/clean-invoice";
import { createPurchase } from "@/lib/docs";
import { bad, body, deny, sameOrigin, str } from "@/lib/guard";
import { byNewest, purchases } from "@/lib/invoices";

export const dynamic = "force-dynamic";

export async function GET() {
  const d = await deny();
  if (d) return d;
  return NextResponse.json((await purchases().all()).sort(byNewest));
}

/** a bill from a supplier: stock goes up, the supplier is owed the total less what is paid now */
export async function POST(req: NextRequest) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const b = await body(req);
  if (!b) return bad("Something went wrong - please try again.");
  const c = cleanInvoice(b);
  if ("error" in c) return bad(c.error);
  if (!c.value.partyId && !c.value.walkInName) return bad("Choose the supplier.");
  try {
    return NextResponse.json(await createPurchase({ ...c.value, supplierBillNo: str(b.supplierBillNo, 60) || undefined }), { status: 201 });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Could not save the purchase bill.");
  }
}
