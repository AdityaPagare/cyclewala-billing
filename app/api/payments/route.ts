import { NextRequest, NextResponse } from "next/server";
import { cleanMode } from "@/lib/clean-invoice";
import { recordPurchasePayment } from "@/lib/docs";
import { bad, body, deny, isDay, num, sameOrigin, str } from "@/lib/guard";
import { byNewest, payments, recordPayment, today } from "@/lib/invoices";

export const dynamic = "force-dynamic";

export async function GET() {
  const d = await deny();
  if (d) return d;
  return NextResponse.json((await payments().all()).sort(byNewest));
}

/** money received from a party (it settles their oldest unpaid invoices first), or with direction "out" money paid to a supplier */
export async function POST(req: NextRequest) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const b = await body(req);
  const out = b?.direction === "out";
  const amount = num(b?.amount, 0.01, 1e9);
  const partyId = str(b?.partyId, 60);
  if (!b || amount === null) return bad(out ? "Enter the amount paid." : "Enter the amount received.");
  if (!partyId) return bad(out ? "Choose who you paid." : "Choose who paid.");
  try {
    const r = await (out ? recordPurchasePayment : recordPayment)({
      partyId,
      amount,
      mode: cleanMode(b.mode),
      date: isDay(b.date) ? b.date : today(),
      reference: str(b.reference, 80) || undefined,
      note: str(b.note, 200) || undefined,
    });
    return NextResponse.json(r, { status: 201 });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Could not record the payment.");
  }
}
