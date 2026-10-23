import { byNewest, items, parties } from "@/lib/invoices";
import { getBusiness } from "@/lib/settings";
import InvoiceEditor from "../../invoices/new/InvoiceEditor";

export const metadata = { title: "New purchase bill — Cycle Wala Billing" };

export default async function NewPurchasePage({ searchParams }: { searchParams: Promise<{ party?: string }> }) {
  const [ps, its, biz, sp] = await Promise.all([parties().all(), items().all(), getBusiness(), searchParams]);
  return <InvoiceEditor mode="purchase" parties={ps.sort(byNewest)} items={its.sort((a, b) => a.name.localeCompare(b.name))} gstOn={biz.gstEnabled} startParty={sp.party} />;
}
