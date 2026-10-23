import DocPage from "@/components/DocPage";

export const metadata = { title: "Invoice — Cycle Wala Billing" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  return <DocPage kind="sale" id={(await params).id} />;
}
