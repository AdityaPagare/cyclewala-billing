import { NextRequest, NextResponse } from "next/server";
import { bad, body, deny, sameOrigin } from "@/lib/guard";
import { invoices, parties } from "@/lib/invoices";
import { cleanParty } from "@/lib/clean";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const b = await body(req);
  if (!b) return bad("Something went wrong — please try again.");
  const c = cleanParty(b);
  if ("error" in c) return bad(c.error);
  const row = await parties().update((await params).id, c.value as never);
  return row ? NextResponse.json(row) : bad("Party not found.", 404);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const { id } = await params;
  if ((await invoices().all()).some((i) => i.partyId === id)) return bad("This party has invoices, so it can't be deleted.", 409);
  return (await parties().remove(id)) ? NextResponse.json({ ok: true }) : bad("Party not found.", 404);
}
