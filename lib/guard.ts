/* Helpers every API route uses: require the owner's session, read and clean the request. */
import { NextRequest, NextResponse } from "next/server";
import { isSignedIn } from "@/lib/auth";

/** a 401 response when nobody is signed in, otherwise null */
export async function deny(): Promise<NextResponse | null> {
  return (await isSignedIn()) ? null : NextResponse.json({ error: "Please sign in." }, { status: 401 });
}

/** reject a cross-site request that changes data */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser / same-origin GET-like tools
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function body(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const j = await req.json();
    return j && typeof j === "object" && !Array.isArray(j) ? (j as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
export const text = (v: unknown, max = 1000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
export function num(v: unknown, min = -1e9, max = 1e9): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
export const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v + "T00:00:00").getTime());
