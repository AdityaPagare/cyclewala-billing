"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { Empty, ErrorNote, Field, Modal, api, btnDanger, btnGhost, btnPrimary, inputCls } from "@/components/ui";
import { inr } from "@/lib/format";
import type { Item } from "@/lib/types";
import { CATEGORY_LABEL, type WebBrand, type WebModel } from "@/lib/website";

const EMPTY = { name: "", brand: "", category: "", unit: "pcs", salePrice: "", purchasePrice: "", gstRate: "0", hsn: "", sku: "", barcode: "", stock: "", lowStockAt: "", isService: false };

export default function ItemsView({ items, gstOn, brands, models, websiteError }: { items: Item[]; gstOn: boolean; brands: WebBrand[]; models: WebModel[]; websiteError: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [low, setLow] = useState(false);
  const [brand, setBrand] = useState("");
  const [edit, setEdit] = useState<Item | "new" | null>(null);

  const isLow = (i: Item) => !i.isService && i.lowStockAt !== undefined && i.stock <= i.lowStockAt;
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((i) => (!s || `${i.name} ${i.brand ?? ""} ${i.sku ?? ""} ${i.barcode ?? ""} ${i.category}`.toLowerCase().includes(s)) && (!low || isLow(i)) && (!brand || (brand === "__none" ? !i.brand : i.brand?.toLowerCase() === brand.toLowerCase())));
  }, [items, q, low, brand]);
  const lowCount = items.filter(isLow).length;
  const stockValue = items.reduce((n, i) => n + (i.isService ? 0 : Math.max(0, i.stock) * (i.purchasePrice ?? i.salePrice)), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Items &amp; stock</h1>
          <p className="text-black/60">
            {items.length} items · stock value <b>{inr(stockValue)}</b>
          </p>
        </div>
        <button className={`${btnPrimary} ml-auto`} onClick={() => setEdit("new")}>
          <Icon name="plus" className="h-4 w-4" /> Add item
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input className={`${inputCls} max-w-sm`} placeholder="Search name, SKU, barcode or category" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search items" />
        <select className={`${inputCls} max-w-[13rem]`} value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Filter by brand">
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
            </option>
          ))}
          <option value="__none">No brand</option>
        </select>
        <button onClick={() => setLow(!low)} className={`rounded-full px-4 py-2 text-sm font-bold ${low ? "bg-red-600 text-white" : "bg-white ring-1 ring-black/10 hover:bg-black/5"}`}>
          Low stock {lowCount ? `(${lowCount})` : ""}
        </button>
      </div>

      {items.length === 0 ? (
        <Empty title="No items yet" note="Add the cycles, spare parts, accessories and services you sell. Stock goes down automatically on every sale.">
          <button className={btnPrimary} onClick={() => setEdit("new")}>
            Add your first item
          </button>
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-black/[0.03] text-xs uppercase tracking-wider text-black/55">
              <tr>
                <th className="px-5 py-3">Item</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3 text-right">Sale price</th>
                <th className="px-3 py-3 text-right">Stock</th>
                <th className="px-5 py-3 text-right" />
              </tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <tr key={i._id} className="border-t border-black/5">
                  <td className="px-5 py-3 font-bold">
                    {i.brand && !i.name.toLowerCase().startsWith(i.brand.toLowerCase()) ? <span className="mr-2 rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-black/55">{i.brand}</span> : null}
                    {i.name}
                    {i.sku ? <span className="ml-2 text-xs font-normal text-black/45">{i.sku}</span> : null}
                  </td>
                  <td className="px-3 py-3">{i.category}</td>
                  <td className="px-3 py-3 text-right">
                    {inr(i.salePrice)}
                    {gstOn && i.gstRate ? <span className="ml-1 text-xs text-black/45">+{i.gstRate}%</span> : null}
                  </td>
                  <td className={`px-3 py-3 text-right font-extrabold ${isLow(i) ? "text-[#b3261e]" : ""}`}>{i.isService ? <span className="font-semibold text-black/40">service</span> : `${i.stock} ${i.unit}`}</td>
                  <td className="px-5 py-3 text-right">
                    <button className={btnGhost} onClick={() => setEdit(i)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-black/50">
                    No items match.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {edit ? <ItemForm item={edit === "new" ? null : edit} gstOn={gstOn} brands={brands} models={models} websiteError={websiteError} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); router.refresh(); }} /> : null}
    </div>
  );
}

function ItemForm({ item, gstOn, brands, models, websiteError, onClose, onSaved }: { item: Item | null; gstOn: boolean; brands: WebBrand[]; models: WebModel[]; websiteError: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState(
    item
      ? { name: item.name, brand: item.brand ?? "", category: item.category, unit: item.unit, salePrice: String(item.salePrice), purchasePrice: item.purchasePrice !== undefined ? String(item.purchasePrice) : "", gstRate: String(item.gstRate), hsn: item.hsn ?? "", sku: item.sku ?? "", barcode: item.barcode ?? "", stock: String(item.stock), lowStockAt: item.lowStockAt !== undefined ? String(item.lowStockAt) : "", isService: !!item.isService }
      : EMPTY
  );
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  // brand: one of the website's brands, or "Other" to type a new one
  const known = brands.some((b) => b.name.toLowerCase() === f.brand.toLowerCase());
  const [other, setOther] = useState(!!f.brand && !known);
  const [modelSlug, setModelSlug] = useState("");
  const brandModels = useMemo(() => models.filter((m) => m.brand.toLowerCase() === f.brand.toLowerCase()).sort((a, b) => a.model.localeCompare(b.model)), [models, f.brand]);
  const pickBrand = (v: string) => {
    setModelSlug("");
    if (v === "__other") {
      setOther(true);
      setF({ ...f, brand: "" });
    } else {
      setOther(false);
      setF({ ...f, brand: v });
    }
  };
  // fill the form from the website's entry for this model
  const pickModel = (slug: string) => {
    setModelSlug(slug);
    const m = models.find((x) => x.slug === slug);
    if (!m) return;
    setF({ ...f, brand: m.brand, name: `${m.brand} ${m.model}`, category: CATEGORY_LABEL[m.category] ?? f.category, salePrice: m.price !== null ? String(m.price) : f.salePrice, sku: m.slug });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = item ? await api(`/api/items/${item._id}`, "PUT", f) : await api("/api/items", "POST", f);
    setBusy(false);
    if (r.ok) onSaved();
    else setErr(r.error);
  };
  const remove = async () => {
    if (!item || !confirm(`Delete ${item.name}?`)) return;
    const r = await api(`/api/items/${item._id}`, "DELETE");
    if (r.ok) onSaved();
    else setErr(r.error);
  };

  return (
    <Modal title={item ? "Edit item" : "Add item"} onClose={onClose} wide>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Brand" hint={websiteError ? "Couldn't reach the website just now, so only brands you've already used are listed." : "The list comes live from the website — new brands appear here by themselves."}>
          <select className={inputCls} value={other ? "__other" : f.brand} onChange={(e) => pickBrand(e.target.value)}>
            <option value="">No brand</option>
            {brands.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name}
                {b.count ? ` (${b.count})` : ""}
              </option>
            ))}
            <option value="__other">Other — type a new brand…</option>
          </select>
          {other ? <input className={`${inputCls} mt-2`} value={f.brand} onChange={set("brand")} placeholder="Brand name" autoFocus /> : null}
        </Field>
        {brandModels.length > 0 && !item ? (
          <Field label={`Pick a ${f.brand} model from the website`} hint="Fills the name, category and price for you.">
            <select className={inputCls} value={modelSlug} onChange={(e) => pickModel(e.target.value)}>
              <option value="">Choose a model (optional)…</option>
              {brandModels.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.model}
                  {m.price !== null ? ` — ₹${m.price.toLocaleString("en-IN")}` : ""}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <div className="hidden sm:block" />
        )}
        <Field label="Item name *" className="sm:col-span-2">
          <input className={inputCls} value={f.name} onChange={set("name")} autoFocus required placeholder="e.g. Hero Sprint 26T MTB" />
        </Field>
        <Field label="Category">
          <input className={inputCls} value={f.category} onChange={set("category")} placeholder="Cycles, Spare parts, Accessories…" />
        </Field>
        <Field label="Unit">
          <input className={inputCls} value={f.unit} onChange={set("unit")} />
        </Field>
        <Field label="Sale price (₹) *">
          <input className={inputCls} inputMode="decimal" value={f.salePrice} onChange={set("salePrice")} required />
        </Field>
        <Field label="Purchase price (₹)">
          <input className={inputCls} inputMode="decimal" value={f.purchasePrice} onChange={set("purchasePrice")} />
        </Field>
        {gstOn ? (
          <>
            <Field label="GST rate">
              <select className={inputCls} value={f.gstRate} onChange={set("gstRate")}>
                {[0, 5, 12, 18, 28].map((g) => (
                  <option key={g} value={g}>
                    {g}%
                  </option>
                ))}
              </select>
            </Field>
            <Field label="HSN code">
              <input className={inputCls} value={f.hsn} onChange={set("hsn")} />
            </Field>
          </>
        ) : null}
        <label className="flex items-center gap-3 text-sm font-bold sm:col-span-2">
          <input type="checkbox" className="h-5 w-5 accent-[#4CAF2E]" checked={f.isService} onChange={(e) => setF({ ...f, isService: e.target.checked })} />
          This is a service (labour) — it has no stock
        </label>
        {!f.isService ? (
          <>
            <Field label="Stock in hand">
              <input className={inputCls} inputMode="decimal" value={f.stock} onChange={set("stock")} />
            </Field>
            <Field label="Warn me at or below" hint="Shows a low-stock alert.">
              <input className={inputCls} inputMode="decimal" value={f.lowStockAt} onChange={set("lowStockAt")} />
            </Field>
            <Field label="SKU">
              <input className={inputCls} value={f.sku} onChange={set("sku")} />
            </Field>
            <Field label="Barcode">
              <input className={inputCls} value={f.barcode} onChange={set("barcode")} />
            </Field>
          </>
        ) : null}
        <div className="sm:col-span-2">
          <ErrorNote text={err} />
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button className={btnPrimary} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
          {item ? (
            <button type="button" className={`${btnDanger} ml-auto`} onClick={remove}>
              Delete
            </button>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
