import { NextRequest } from "next/server";
import { sendDocument } from "@/lib/send-doc";

export const dynamic = "force-dynamic";

/** email the invoice, or note that it was shared by WhatsApp / a link (those are opened on the owner's side) */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return sendDocument(req, (await params).id, "invoices");
}
