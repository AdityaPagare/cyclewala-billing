import { NextRequest, NextResponse } from "next/server";
import { cleanMode } from "@/lib/clean-invoice";
import { bad, body, deny, isDay, num, sameOrigin, str } from "@/lib/guard";
import { recordPayment, today } from "@/lib/invoices";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const b = await body(req);
  const amount = num(b?.amount, 0.01, 1e9);
  if (!b || amount === null) return bad("Enter the amount received.");
  try {
    const r = await recordPayment({
      invoiceId: (await params).id,
      amount,
      mode: cleanMode(b.mode),
      date: isDay(b.date) ? b.date : today(),
      reference: str(b.reference, 80) || undefined,
    });
    return NextResponse.json(r, { status: 201 });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Could not record the payment.");
  }
}
