import { NextRequest, NextResponse } from "next/server";
import { cleanAttendance, STATUSES } from "@/lib/clean-staff";
import { bad, body, deny, isDay, sameOrigin, str } from "@/lib/guard";
import { isMonth } from "@/lib/payroll";
import { attendanceCol, attendanceForMonth, saveAttendance, staffCol } from "@/lib/staff";
import type { AttendanceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

/** ?date=YYYY-MM-DD for one day, ?month=YYYY-MM for a whole month */
export async function GET(req: NextRequest) {
  const d = await deny();
  if (d) return d;
  const date = req.nextUrl.searchParams.get("date");
  const month = req.nextUrl.searchParams.get("month");
  if (isDay(date)) return NextResponse.json((await attendanceCol().all()).filter((r) => r.date === date));
  if (isMonth(month)) return NextResponse.json(await attendanceForMonth(month));
  return bad("Give a date or a month.");
}

/** mark one person for one day, or (with { date, status, all: true }) everyone active who is not marked yet */
export async function POST(req: NextRequest) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const b = await body(req);
  if (!b) return bad("Something went wrong - please try again.");

  if (b.all === true) {
    if (!isDay(b.date) || !STATUSES.includes(b.status as AttendanceStatus)) return bad("Choose a date and a status.");
    const date = b.date as string;
    const status = b.status as AttendanceStatus;
    const [staff, marked] = await Promise.all([staffCol().all(), attendanceCol().all()]);
    const have = new Set(marked.filter((r) => r.date === date).map((r) => r.staffId));
    const todo = staff.filter((s) => s.active && s.joinedOn <= date && !have.has(s._id));
    for (const s of todo) await saveAttendance({ staffId: s._id, date, status });
    return NextResponse.json({ marked: todo.length });
  }

  const c = cleanAttendance(b);
  if ("error" in c) return bad(c.error);
  if (!(await staffCol().get(c.value.staffId))) return bad("Staff member not found.", 404);
  return NextResponse.json(await saveAttendance(c.value));
}

/** clear a day's mark: { staffId, date } */
export async function DELETE(req: NextRequest) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const b = await body(req);
  const staffId = str(b?.staffId, 80);
  if (!b || !staffId || !isDay(b.date)) return bad("Choose a person and a date.");
  await attendanceCol().remove(`${staffId}_${b.date}`);
  return NextResponse.json({ ok: true });
}
