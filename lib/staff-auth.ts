/* Staff sign-in. The owner makes a username and password for each person; they sign in on /staff-login and can
 * only mark and see their OWN attendance. This session is separate from the owner's: it never opens the owner's
 * pages or APIs, and the owner's session never counts here.
 *
 * Passwords are kept as scrypt hashes with a random salt. The cookie holds `staffId.version.expiry.signature`;
 * `version` comes from the password hash, so changing or removing a password signs that person out everywhere. */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sessionSecret } from "@/lib/auth";
import { col } from "@/lib/store";
import { staffCol } from "@/lib/staff";
import type { StaffLogin, StaffMember } from "@/lib/types";

export const STAFF_COOKIE = "cwb_staff";
export const STAFF_SESSION_MS = 14 * 24 * 60 * 60 * 1000; // staying signed in on a phone is the point

export const loginsCol = () => col<StaffLogin>("staff_logins");

const hashOf = (password: string, salt: string) => scryptSync(password, salt, 64).toString("hex");

export function newHash(password: string): { salt: string; hash: string } {
  const salt = randomBytes(16).toString("hex");
  return { salt, hash: hashOf(password, salt) };
}

export function passwordMatches(l: StaffLogin, password: string): boolean {
  const a = Buffer.from(hashOf(password, l.salt), "hex");
  const b = Buffer.from(l.hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ---- rules for a username and a password ---- */

export const USERNAME = /^[a-z0-9][a-z0-9._-]{2,29}$/;
export const cleanUsername = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : "");
export function passwordProblem(p: unknown): string {
  if (typeof p !== "string" || p.length < 6) return "The password needs at least 6 characters.";
  if (p.length > 60) return "The password is too long (60 characters at most).";
  return "";
}

/** create or replace someone's login; returns a message when something is wrong */
export async function saveLogin(staffId: string, usernameIn: unknown, password: string): Promise<{ error: string } | { login: StaffLogin }> {
  const username = cleanUsername(usernameIn);
  if (!USERNAME.test(username)) return { error: "The username needs 3-30 letters, numbers, dots or dashes (no spaces)." };
  const bad = passwordProblem(password);
  if (bad) return { error: bad };
  if (!(await staffCol().get(staffId))) return { error: "Staff member not found." };
  const taken = (await loginsCol().all()).find((l) => l.username === username && l._id !== staffId);
  if (taken) return { error: "That username is already used by someone else. Try another." };
  const h = newHash(password);
  const prev = await loginsCol().get(staffId);
  const row = prev ? await loginsCol().update(staffId, { username, ...h }) : await loginsCol().insert({ _id: staffId, username, ...h, createdAt: new Date().toISOString() });
  return { login: row! };
}

/* ---- the session ---- */

const ver = (l: StaffLogin) => l.hash.slice(0, 12);
const sign = (key: string, staffId: string, v: string, expiry: number) => createHmac("sha256", key).update(`staff|${staffId}|${v}|${expiry}`).digest("hex");
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function makeStaffSession(l: StaffLogin): { value: string; maxAge: number } | null {
  const key = sessionSecret();
  if (!key) return null;
  const expiry = Date.now() + STAFF_SESSION_MS;
  return { value: `${l._id}.${ver(l)}.${expiry}.${sign(key, l._id, ver(l), expiry)}`, maxAge: STAFF_SESSION_MS / 1000 };
}

export function setStaffCookie(res: NextResponse, s: { value: string; maxAge: number }) {
  res.cookies.set(STAFF_COOKIE, s.value, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: s.maxAge });
}

/** the signed-in staff member (active, with a login that has not been changed since), or null */
export async function currentStaff(): Promise<{ staff: StaffMember; login: StaffLogin } | null> {
  const key = sessionSecret();
  const raw = (await cookies()).get(STAFF_COOKIE)?.value;
  if (!key || !raw) return null;
  const [id, v, expiryText, sig] = raw.split(".");
  const expiry = Number(expiryText);
  if (!id || !v || !sig || !Number.isFinite(expiry) || expiry < Date.now()) return null;
  if (!same(sig, sign(key, id, v, expiry))) return null;
  const [login, staff] = await Promise.all([loginsCol().get(id), staffCol().get(id)]);
  if (!login || !staff || !staff.active || ver(login) !== v) return null;
  return { staff, login };
}

/** for the /api/me routes: the signed-in staff member, or a 401 response */
export async function staffOr401(): Promise<{ me: { staff: StaffMember; login: StaffLogin } } | { res: NextResponse }> {
  const me = await currentStaff();
  return me ? { me } : { res: NextResponse.json({ error: "Please sign in." }, { status: 401 }) };
}
