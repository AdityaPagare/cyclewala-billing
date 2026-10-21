import { NextRequest, NextResponse } from "next/server";
import { bad, deny, sameOrigin } from "@/lib/guard";
import { advancesCol } from "@/lib/staff";

export const dynamic = "force-dynamic";

/** an advance that has already been (even partly) taken back from a salary stays in the books */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const { id } = await params;
  const a = await advancesCol().get(id);
  if (!a) return bad("Advance not found.", 404);
  if (a.settled > 0) return bad("Part of this advance has already been taken back from a salary, so it can't be deleted.", 409);
  await advancesCol().remove(id);
  return NextResponse.json({ ok: true });
}
