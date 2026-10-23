import { NextRequest, NextResponse } from "next/server";
import { bad, body, sameOrigin } from "@/lib/guard";
import { selfMark } from "@/lib/self-attendance";
import { staffOr401 } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

/** { action: "in" | "out" } — the signed-in staff member checks in or out for today */
export async function POST(req: NextRequest) {
  const a = await staffOr401();
  if ("res" in a) return a.res;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const b = await body(req);
  if (b?.action !== "in" && b?.action !== "out") return bad("Choose check in or check out.");
  const r = await selfMark(a.me.staff, b.action);
  return "error" in r ? bad(r.error, r.status) : NextResponse.json(r.record);
}
