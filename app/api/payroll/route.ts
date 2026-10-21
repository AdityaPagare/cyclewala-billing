import { NextRequest, NextResponse } from "next/server";
import { bad, body, deny, num, sameOrigin, str } from "@/lib/guard";
import { isMonth } from "@/lib/payroll";
import { payrollForMonth, saveAdjustments } from "@/lib/staff";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const d = await deny();
  if (d) return d;
  const month = req.nextUrl.searchParams.get("month");
  if (!isMonth(month)) return bad("Choose a month.");
  return NextResponse.json(await payrollForMonth(month));
}

/** save a person's bonus and deductions for the month; the pay itself is always worked out from attendance */
export async function POST(req: NextRequest) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const b = await body(req);
  if (!b) return bad("Something went wrong - please try again.");
  const month = b.month;
  const bonus = b.bonus === "" || b.bonus == null ? 0 : num(b.bonus, 0, 1e7);
  const deductions = b.deductions === "" || b.deductions == null ? 0 : num(b.deductions, 0, 1e7);
  if (!isMonth(month) || bonus === null || deductions === null) return bad("Bonus and deductions must be numbers.");
  const entry = await saveAdjustments(str(b.staffId, 80), month, bonus, deductions);
  return entry ? NextResponse.json(entry) : bad("That salary is already paid, or the person was not found.", 409);
}
