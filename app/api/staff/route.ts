import { NextRequest, NextResponse } from "next/server";
import { cleanStaff } from "@/lib/clean-staff";
import { bad, body, deny, sameOrigin } from "@/lib/guard";
import { staffCol } from "@/lib/staff";

export const dynamic = "force-dynamic";

export async function GET() {
  const d = await deny();
  if (d) return d;
  return NextResponse.json((await staffCol().all()).sort((a, b) => a.name.localeCompare(b.name)));
}

export async function POST(req: NextRequest) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const b = await body(req);
  if (!b) return bad("Something went wrong - please try again.");
  const c = cleanStaff(b);
  if ("error" in c) return bad(c.error);
  return NextResponse.json(await staffCol().insert({ ...c.value, createdAt: new Date().toISOString() } as never), { status: 201 });
}
