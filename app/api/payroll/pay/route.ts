import { NextRequest, NextResponse } from "next/server";
import { cleanMode } from "@/lib/clean-invoice";
import { today } from "@/lib/format";
import { bad, body, deny, isDay, sameOrigin, str } from "@/lib/guard";
import { isMonth } from "@/lib/payroll";
import { markPaid } from "@/lib/staff";

export const dynamic = "force-dynamic";

/** mark a person's salary for the month as paid (this also takes the advances back) */
export async function POST(req: NextRequest) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const b = await body(req);
  if (!b || !isMonth(b.month)) return bad("Choose a month.");
  const entry = await markPaid(str(b.staffId, 80), b.month, cleanMode(b.mode), isDay(b.date) ? b.date : today());
  return entry ? NextResponse.json(entry) : bad("That salary is already paid, or the person was not found.", 409);
}
