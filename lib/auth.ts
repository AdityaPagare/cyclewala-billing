/* Owner sign-in: email + password from the environment, then a signed, HttpOnly session cookie.
 *
 * The cookie holds `expiry.signature` — never the password. It is signed with SESSION_SECRET, so changing
 * ADMIN_PASSWORD or SESSION_SECRET signs everyone out. Everything fails CLOSED in production: without ADMIN_EMAIL,
 * ADMIN_PASSWORD (10+ characters) and SESSION_SECRET nobody can sign in.
 *
 * Staff logins with roles (cashier, manager) come in a later phase — see docs/ROADMAP.md.
 */
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "cwb_session";
export const SESSION_MS = 12 * 60 * 60 * 1000;

/* Local development only (ignored when NODE_ENV is "production"). */
const DEV = { email: "owner@cyclewala.local", password: "cyclewala-dev", secret: "dev-only-session-secret-change-me" };

function credentials() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (process.env.NODE_ENV !== "production") {
    return email && password ? { email, password } : { email: DEV.email, password: DEV.password };
  }
  if (!email || !password || password.length < 10) return null;
  return { email, password };
}

function secret(): string | null {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  return process.env.NODE_ENV !== "production" ? DEV.secret : null;
}

/** the key sessions are signed with (null when it is not configured in production) */
export const sessionSecret = secret;

const digest = (s: string) => createHash("sha256").update(s).digest();
const same = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

export function verifyLogin(email: string, password: string): boolean {
  const c = credentials();
  if (!c) return false;
  // evaluate both so the response time does not reveal which one was wrong
  const e = same(email.trim().toLowerCase(), c.email.toLowerCase());
  const p = same(password, c.password);
  return e && p;
}

const sign = (expiry: number, key: string) => createHmac("sha256", key).update(`session|${expiry}`).digest("hex");

export function makeSession(): { value: string; maxAge: number } | null {
  const key = secret();
  if (!key) return null;
  const expiry = Date.now() + SESSION_MS;
  return { value: `${expiry}.${sign(expiry, key)}`, maxAge: SESSION_MS / 1000 };
}

export function sessionValid(value: string | undefined): boolean {
  const key = secret();
  if (!key || !value) return false;
  const [expiryText, sig] = value.split(".");
  const expiry = Number(expiryText);
  if (!sig || !Number.isFinite(expiry) || expiry < Date.now()) return false;
  return same(sig, sign(expiry, key));
}

/** true when the request carries a valid session cookie (server components, route handlers) */
export async function isSignedIn(): Promise<boolean> {
  return sessionValid((await cookies()).get(SESSION_COOKIE)?.value);
}
