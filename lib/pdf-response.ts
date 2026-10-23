/* Serve an invoice / quotation / purchase bill as a PDF file. */
import { NextResponse } from "next/server";
import { pdfName } from "@/lib/doc-model";
import { invoicePdf } from "@/lib/invoice-pdf";
import { getBusiness } from "@/lib/settings";
import type { Invoice } from "@/lib/types";

/** `download` makes the browser save it; otherwise it opens in the browser's PDF viewer */
export async function pdfResponse(inv: Invoice, download = true): Promise<NextResponse> {
  const bytes = await invoicePdf(await getBusiness(), inv);
  const name = pdfName(inv);
  // headers must be plain ASCII, so a Hindi name gets a fallback plus the proper UTF-8 form
  const ascii = name.replace(/[^ -~]/g, "_").replace(/"/g, "");
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}
