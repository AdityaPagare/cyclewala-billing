import { NextRequest, NextResponse } from "next/server";
import { cleanInvoice } from "@/lib/clean-invoice";
import { bad, body, deny, sameOrigin } from "@/lib/guard";
import { byNewest, createInvoice, invoices } from "@/lib/invoices";

export const dynamic = "force-dynamic";

export async function GET() {
  const d = await deny();
  if (d) return d;
  return NextResponse.json((await invoices().all()).sort(byNewest));
}

export async function POST(req: NextRequest) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const b = await body(req);
  if (!b) return bad("Something went wrong - please try again.");
  const c = cleanInvoice(b);
  if ("error" in c) return bad(c.error);
  try {
    return NextResponse.json(await createInvoice(c.value), { status: 201 });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Could not save the invoice.", 400);
  }
}
