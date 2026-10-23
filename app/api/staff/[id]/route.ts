import { NextRequest, NextResponse } from "next/server";
import { cleanStaff } from "@/lib/clean-staff";
import { bad, body, deny, sameOrigin } from "@/lib/guard";
import { advancesCol, attendanceCol, payrollCol, staffCol } from "@/lib/staff";
import { loginsCol } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const b = await body(req);
  if (!b) return bad("Something went wrong - please try again.");
  const c = cleanStaff(b);
  if ("error" in c) return bad(c.error);
  const row = await staffCol().update((await params).id, c.value as never);
  return row ? NextResponse.json(row) : bad("Staff member not found.", 404);
}

/** someone with attendance, advances or salary history is made inactive instead of deleted */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const { id } = await params;
  const [att, adv, pay] = await Promise.all([attendanceCol().all(), advancesCol().all(), payrollCol().all()]);
  if (att.some((r) => r.staffId === id) || adv.some((a) => a.staffId === id) || pay.some((p) => p.staffId === id)) {
    return bad("This person has attendance or salary records, so they can't be deleted. Mark them inactive instead.", 409);
  }
  await loginsCol().remove(id);
  return (await staffCol().remove(id)) ? NextResponse.json({ ok: true }) : bad("Staff member not found.", 404);
}
