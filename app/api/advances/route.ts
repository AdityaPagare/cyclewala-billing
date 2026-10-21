import { NextRequest, NextResponse } from "next/server";
import { bad, body, deny, isDay, num, sameOrigin, str } from "@/lib/guard";
import { today } from "@/lib/format";
import { advancesCol, staffCol } from "@/lib/staff";

export const dynamic = "force-dynamic";

/** an advance given to a staff member; it is taken back from their next salary */
export async function POST(req: NextRequest) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const b = await body(req);
  const amount = num(b?.amount, 1, 1e7);
  const staffId = str(b?.staffId, 80);
  if (!b || amount === null) return bad("Enter the advance amount.");
  if (!staffId || !(await staffCol().get(staffId))) return bad("Choose a staff member.");
  const row = await advancesCol().insert({ staffId, amount, settled: 0, date: isDay(b.date) ? b.date : today(), note: str(b.note, 200) || undefined, createdAt: new Date().toISOString() } as never);
  return NextResponse.json(row, { status: 201 });
}
