import { byNewest, parties, partyBalances } from "@/lib/invoices";
import PartiesView from "./PartiesView";

export const metadata = { title: "Parties — Cycle Wala Billing" };

export default async function PartiesPage() {
  const [list, bal] = await Promise.all([parties().all(), partyBalances()]);
  return <PartiesView parties={list.sort(byNewest).map((p) => ({ ...p, balance: bal.get(p._id) ?? 0 }))} />;
}
