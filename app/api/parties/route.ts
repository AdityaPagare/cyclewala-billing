import { NextRequest, NextResponse } from "next/server";
import { cleanParty } from "@/lib/clean";
import { bad, body, deny, sameOrigin } from "@/lib/guard";
import { byNewest, parties, partyBalances } from "@/lib/invoices";

export const dynamic = "force-dynamic";

/** the editable fields of a party, cleaned; an error message when something is wrong */
export async function GET() {
  const d = await deny();
  if (d) return d;
  const [list, bal] = await Promise.all([parties().all(), partyBalances()]);
  return NextResponse.json(list.sort(byNewest).map((p) => ({ ...p, balance: bal.get(p._id) ?? 0 })));
}

export async function POST(req: NextRequest) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const b = await body(req);
  if (!b) return bad("Something went wrong — please try again.");
  const c = cleanParty(b);
  if ("error" in c) return bad(c.error);
  const row = await parties().insert({ ...(c.value as object), createdAt: new Date().toISOString() } as never);
  return NextResponse.json(row, { status: 201 });
}
