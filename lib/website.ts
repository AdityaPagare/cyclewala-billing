/* The shop website's own catalogue (cyclewala.shop/api/products), read live so the billing app always offers the
 * brands and models that are on the site right now. Nothing is hard-coded: add a brand on the website and it
 * appears in the dropdowns here within a few minutes.
 *
 *   SHOP_SITE_URL   the website's address (default https://cyclewala.shop)
 */
import type { Item } from "@/lib/types";

export type WebModel = { slug: string; brand: string; model: string; category: string; price: number | null; sizes: string };
export type WebBrand = { name: string; count: number };

const TTL = 5 * 60_000;
let cache: { at: number; list: WebModel[] } | null = null;

export const siteUrl = () => (process.env.SHOP_SITE_URL || "https://cyclewala.shop").replace(/\/$/, "");

/** the website's product category -> the heading used in the billing app */
export const CATEGORY_LABEL: Record<string, string> = { kids: "Kids' Cycles", mtb: "Mountain Cycles", hybrid: "City & Hybrid", ebike: "E-Bikes" };

export async function websiteCatalogue(): Promise<{ ok: boolean; list: WebModel[]; error?: string }> {
  if (cache && Date.now() - cache.at < TTL) return { ok: true, list: cache.list };
  try {
    const res = await fetch(`${siteUrl()}/api/products`, { cache: "no-store", signal: AbortSignal.timeout(10_000), headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`the website answered ${res.status}`);
    const raw = (await res.json()) as unknown;
    if (!Array.isArray(raw)) throw new Error("the website sent something unexpected");
    const list: WebModel[] = [];
    for (const p of raw as Record<string, unknown>[]) {
      if (typeof p?.brand !== "string" || typeof p?.model !== "string" || typeof p?.slug !== "string") continue;
      list.push({ slug: p.slug, brand: p.brand.trim(), model: p.model.trim(), category: typeof p.category === "string" ? p.category : "", price: typeof p.price === "number" ? p.price : null, sizes: typeof p.sizes === "string" ? p.sizes : "" });
    }
    cache = { at: Date.now(), list };
    return { ok: true, list };
  } catch (e) {
    // keep serving the last good copy if the site is briefly unreachable
    if (cache) return { ok: true, list: cache.list };
    return { ok: false, list: [], error: e instanceof Error ? e.message : "could not reach the website" };
  }
}

/** every brand with how many cycles it has, A-Z; brands already used on items are included even if the site is unreachable */
export function brandList(web: WebModel[], items: Pick<Item, "brand">[]): WebBrand[] {
  const m = new Map<string, WebBrand>();
  const add = (name: string, n: number) => {
    const key = name.trim().toLowerCase();
    if (!key) return;
    const cur = m.get(key);
    if (cur) cur.count += n;
    else m.set(key, { name: name.trim(), count: n });
  };
  for (const w of web) add(w.brand, 1);
  for (const i of items) if (i.brand && !m.has(i.brand.trim().toLowerCase())) add(i.brand, 0);
  return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
}
