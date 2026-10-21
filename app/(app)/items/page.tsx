import { byNewest, items } from "@/lib/invoices";
import { getBusiness } from "@/lib/settings";
import { brandList, websiteCatalogue } from "@/lib/website";
import ItemsView from "./ItemsView";

export const metadata = { title: "Items & stock — Cycle Wala Billing" };

export default async function ItemsPage() {
  const [list, biz, web] = await Promise.all([items().all(), getBusiness(), websiteCatalogue()]);
  return <ItemsView items={list.sort(byNewest)} gstOn={biz.gstEnabled} brands={brandList(web.list, list)} models={web.list} websiteError={web.ok ? "" : web.error ?? "unreachable"} />;
}
