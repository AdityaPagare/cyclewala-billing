import { NextRequest, NextResponse } from "next/server";
import { bad, body, sameOrigin } from "@/lib/guard";
import { loginsCol, makeStaffSession, newHash, passwordMatches, passwordProblem, setStaffCookie } from "@/lib/staff-auth";
import { staffOr401 } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

/** { current, next } — change your own password; your other phones are signed out, this one stays in */
export async function POST(req: NextRequest) {
  const a = await staffOr401();
  if ("res" in a) return a.res;
  if (!sameOrigin(req)) return bad("Request blocked.", 403);
  const b = await body(req);
  const current = typeof b?.current === "string" ? b.current : "";
  if (!passwordMatches(a.me.login, current)) return bad("Your current password is not right.", 401);
  const problem = passwordProblem(b?.next);
  if (problem) return bad(problem);
  const login = await loginsCol().update(a.me.login._id, newHash(b!.next as string));
  const session = login && makeStaffSession(login);
  if (!session) return bad("Could not save the new password.", 500);
  const res = NextResponse.json({ ok: true });
  setStaffCookie(res, session);
  return res;
}
