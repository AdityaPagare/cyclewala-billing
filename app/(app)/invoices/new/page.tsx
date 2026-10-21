import { byNewest, items, parties } from "@/lib/invoices";
import { getBusiness } from "@/lib/settings";
import InvoiceEditor from "./InvoiceEditor";

export const metadata = { title: "New invoice — Cycle Wala Billing" };

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ party?: string }> }) {
  const [ps, its, biz, sp] = await Promise.all([parties().all(), items().all(), getBusiness(), searchParams]);
  return <InvoiceEditor parties={ps.sort(byNewest)} items={its.sort((a, b) => a.name.localeCompare(b.name))} gstOn={biz.gstEnabled} startParty={sp.party} />;
}
