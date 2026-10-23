import { NextRequest, NextResponse } from "next/server";
import { bad, body, deny, sameOrigin } from "@/lib/guard";
import { loginsCol, saveLogin } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

/** the owner gives a staff member a username and password (or resets them): { username, password } */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const b = await body(req);
  if (!b) return bad("Something went wrong - please try again.");
  const r = await saveLogin((await params).id, b.username, typeof b.password === "string" ? b.password : "");
  return "error" in r ? bad(r.error, r.error.includes("not found") ? 404 : 400) : NextResponse.json({ username: r.login.username });
}

/** switch the staff member's login off */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const d = await deny();
  if (d) return d;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  return (await loginsCol().remove((await params).id)) ? NextResponse.json({ ok: true }) : bad("There was no login to remove.", 404);
}
