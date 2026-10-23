import DocPage from "@/components/DocPage";

export const metadata = { title: "Quotation — Cycle Wala Billing" };

export default async function QuotationPage({ params }: { params: Promise<{ id: string }> }) {
  return <DocPage kind="quotation" id={(await params).id} />;
}
