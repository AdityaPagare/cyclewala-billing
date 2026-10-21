import { NextRequest, NextResponse } from "next/server";
import { cleanItem } from "@/lib/clean";
import { bad, body, deny, sameOrigin } from "@/lib/guard";
import { byNewest, items } from "@/lib/invoices";

export const dynamic = "force-dynamic";

export async function GET() {
  const d = await deny();
  if (d) return d;
  return NextResponse.json((await items().all()).sort(byNewest));
}

export async function POST(req: NextRequest) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const b = await body(req);
  if (!b) return bad("Something went wrong — please try again.");
  const c = cleanItem(b);
  if ("error" in c) return bad(c.error);
  const row = await items().insert({ ...(c.value as object), createdAt: new Date().toISOString() } as never);
  return NextResponse.json(row, { status: 201 });
}
