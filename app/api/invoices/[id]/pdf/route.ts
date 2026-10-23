import { NextRequest } from "next/server";
import { bad, deny } from "@/lib/guard";
import { invoices } from "@/lib/invoices";
import { pdfResponse } from "@/lib/pdf-response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const d = await deny();
  if (d) return d;
  const inv = await invoices().get((await params).id);
  return inv ? pdfResponse(inv, req.nextUrl.searchParams.get("view") !== "1") : bad("Invoice not found.", 404);
}
