import { NextRequest } from "next/server";
import { sendDocument } from "@/lib/send-doc";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return sendDocument(req, (await params).id, "quotations");
}
