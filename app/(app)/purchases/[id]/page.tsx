import DocPage from "@/components/DocPage";

export const metadata = { title: "Purchase bill — Cycle Wala Billing" };

export default async function PurchasePage({ params }: { params: Promise<{ id: string }> }) {
  return <DocPage kind="purchase" id={(await params).id} />;
}
