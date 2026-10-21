import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, makeSession, verifyLogin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/* a small in-memory brake on password guessing: 8 wrong tries per address per 15 minutes */
const tries = new Map<string, { n: number; until: number }>();
const clientKey = (req: NextRequest) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

export async function POST(request: NextRequest) {
  const key = clientKey(request);
  const t = tries.get(key);
  if (t && t.n >= 8 && t.until > Date.now()) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.slice(0, 200) : "";
  const password = typeof body?.password === "string" ? body.password.slice(0, 300) : "";

  if (!verifyLogin(email, password)) {
    tries.set(key, { n: (t && t.until > Date.now() ? t.n : 0) + 1, until: Date.now() + 15 * 60_000 });
    return NextResponse.json({ error: "That email or password is not right." }, { status: 401 });
  }
  const session = makeSession();
  if (!session) return NextResponse.json({ error: "Sign-in is not configured on the server." }, { status: 503 });

  tries.delete(key);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: session.maxAge,
  });
  return res;
}
