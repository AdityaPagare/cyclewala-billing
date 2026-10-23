import type { Metadata } from "next";
import { notFound } from "next/navigation";
import InvoiceDocument from "@/components/InvoiceDocument";
import { invoices, quotations } from "@/lib/invoices";
import { getBusiness } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";

/* The customer's own copy of an invoice, opened from the link in their email or WhatsApp message.
   No sign-in: the long random token in the address is the key. Never indexed by search engines. */
export const metadata: Metadata = { title: "Your document", robots: { index: false, follow: false } };

export default async function PublicInvoice({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) notFound();
  const [sales, quotes] = await Promise.all([invoices().all(), quotations().all()]);
  const inv = [...sales, ...quotes].find((i) => i.shareToken === token);
  if (!inv) notFound();
  const biz = await getBusiness();
  return (
    <main className="min-h-screen bg-[#f3f5f2] px-3 py-6 sm:py-10 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-4 flex max-w-[794px] items-center justify-between gap-3">
        <p className="text-sm font-bold text-black/60">{inv.kind === "quotation" ? "Quotation" : "Invoice"} from {biz.name}</p>
        <div className="flex gap-2">
          <a href={`/i/${token}/pdf`} className="rounded-full bg-[#4CAF2E] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#3c8a24]">
            Download PDF
          </a>
          <PrintButton label="Print" />
        </div>
      </div>
      <div className="mx-auto max-w-[794px] overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5 print:overflow-visible print:rounded-none print:shadow-none print:ring-0">
        <InvoiceDocument biz={biz} inv={inv} />
      </div>
    </main>
  );
}
