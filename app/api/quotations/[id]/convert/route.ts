import { NextRequest, NextResponse } from "next/server";
import { convertQuotation } from "@/lib/docs";
import { today } from "@/lib/format";
import { bad, body, deny, isDay, sameOrigin } from "@/lib/guard";

export const dynamic = "force-dynamic";

/** turn the quotation into a sales invoice */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const b = await body(req);
  try {
    const r = await convertQuotation((await params).id, b && isDay(b.date) ? b.date : today());
    return NextResponse.json(r, { status: 201 });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Could not convert the quotation.", 409);
  }
}
