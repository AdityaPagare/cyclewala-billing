import { NextRequest } from "next/server";
import { bad, deny } from "@/lib/guard";
import { quotations } from "@/lib/invoices";
import { pdfResponse } from "@/lib/pdf-response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const d = await deny();
  if (d) return d;
  const q = await quotations().get((await params).id);
  return q ? pdfResponse(q, req.nextUrl.searchParams.get("view") !== "1") : bad("Quotation not found.", 404);
}
