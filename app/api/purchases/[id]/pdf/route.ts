import { NextRequest } from "next/server";
import { bad, deny } from "@/lib/guard";
import { purchases } from "@/lib/invoices";
import { pdfResponse } from "@/lib/pdf-response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const d = await deny();
  if (d) return d;
  const b = await purchases().get((await params).id);
  return b ? pdfResponse(b, req.nextUrl.searchParams.get("view") !== "1") : bad("Purchase bill not found.", 404);
}
