import { NextRequest, NextResponse } from "next/server";
import { invoices, quotations } from "@/lib/invoices";
import { pdfResponse } from "@/lib/pdf-response";

export const dynamic = "force-dynamic";

/* The customer's PDF, opened from the link in their message. The long random token is the key; no sign-in. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const [sales, quotes] = await Promise.all([invoices().all(), quotations().all()]);
  const doc = [...sales, ...quotes].find((i) => i.shareToken === token);
  return doc ? pdfResponse(doc, req.nextUrl.searchParams.get("view") !== "1") : NextResponse.json({ error: "Not found." }, { status: 404 });
}
