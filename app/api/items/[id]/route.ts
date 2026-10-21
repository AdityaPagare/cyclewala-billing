import { NextRequest, NextResponse } from "next/server";
import { bad, body, deny, sameOrigin } from "@/lib/guard";
import { invoices, items } from "@/lib/invoices";
import { cleanItem } from "@/lib/clean";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const b = await body(req);
  if (!b) return bad("Something went wrong — please try again.");
  const c = cleanItem(b);
  if ("error" in c) return bad(c.error);
  const row = await items().update((await params).id, c.value as never);
  return row ? NextResponse.json(row) : bad("Item not found.", 404);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const { id } = await params;
  if ((await invoices().all()).some((i) => i.lines.some((l) => l.itemId === id))) return bad("This item is on invoices, so it can't be deleted. Set its stock to 0 instead.", 409);
  return (await items().remove(id)) ? NextResponse.json({ ok: true }) : bad("Item not found.", 404);
}
