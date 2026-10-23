import { NextRequest, NextResponse } from "next/server";
import { cleanUsername, loginsCol, makeStaffSession, newHash, passwordMatches, setStaffCookie } from "@/lib/staff-auth";
import { staffCol } from "@/lib/staff";

export const dynamic = "force-dynamic";

/* a brake on password guessing: 8 wrong tries per phone/address and username in 15 minutes */
const tries = new Map<string, { n: number; until: number }>();
const WRONG = "That username or password is not right.";
// something to compare against when the username does not exist, so the response time is the same either way
const DUMMY = { _id: "-", username: "-", ...newHash("not-a-real-password"), createdAt: "" };

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => null)) as { username?: unknown; password?: unknown } | null;
  const username = cleanUsername(b?.username).slice(0, 60);
  const password = typeof b?.password === "string" ? b.password.slice(0, 200) : "";
  const key = `${req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"}|${username}`;
  const t = tries.get(key);
  if (t && t.n >= 8 && t.until > Date.now()) return NextResponse.json({ error: "Too many attempts. Wait a few minutes and try again." }, { status: 429 });

  const login = username ? (await loginsCol().all()).find((l) => l.username === username) : undefined;
  const ok = passwordMatches(login ?? DUMMY, password) && !!login;
  const staff = ok ? await staffCol().get(login!._id) : null;
  if (!ok || !staff) {
    tries.set(key, { n: (t && t.until > Date.now() ? t.n : 0) + 1, until: Date.now() + 15 * 60_000 });
    return NextResponse.json({ error: WRONG }, { status: 401 });
  }
  if (!staff.active) return NextResponse.json({ error: "Your account is switched off. Please talk to the owner." }, { status: 403 });
  const session = makeStaffSession(login!);
  if (!session) return NextResponse.json({ error: "Sign-in is not configured on the server." }, { status: 503 });

  tries.delete(key);
  await loginsCol().update(login!._id, { lastLogin: new Date().toISOString() });
  const res = NextResponse.json({ ok: true });
  setStaffCookie(res, session);
  return res;
}
