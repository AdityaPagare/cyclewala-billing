/* Cleaning what the forms send before it is saved. Each returns the clean fields or a message the user can read. */
import { num, str, text } from "@/lib/guard";

const GST = [0, 5, 12, 18, 28];

export function cleanParty(b: Record<string, unknown>): { value: Record<string, unknown> } | { error: string } {
  const name = str(b.name, 120);
  if (!name) return { error: "Please enter a name." };
  const phone = str(b.phone, 20);
  if (phone && !/^[0-9+()\-\s]{6,20}$/.test(phone)) return { error: "That phone number does not look right." };
  const email = str(b.email, 200).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email address does not look right." };
  const kind = b.kind === "supplier" || b.kind === "both" ? b.kind : "customer";
  const opening = b.openingBalance === "" || b.openingBalance === undefined ? 0 : num(b.openingBalance, -1e8, 1e8);
  if (opening === null) return { error: "Opening balance must be a number." };
  const credit = b.creditLimit === "" || b.creditLimit == null ? undefined : num(b.creditLimit, 0, 1e9);
  if (credit === null) return { error: "Credit limit must be a number." };
  return {
    value: {
      name,
      phone,
      email: email || undefined,
      gstin: str(b.gstin, 20).toUpperCase() || undefined,
      address: text(b.address, 400) || undefined,
      kind,
      openingBalance: opening,
      creditLimit: credit,
    },
  };
}

export function cleanItem(b: Record<string, unknown>): { value: Record<string, unknown> } | { error: string } {
  const name = str(b.name, 160);
  if (!name) return { error: "Please enter the item name." };
  const salePrice = num(b.salePrice, 0, 1e8);
  if (salePrice === null) return { error: "Enter a sale price (0 or more)." };
  const purchasePrice = b.purchasePrice === "" || b.purchasePrice == null ? undefined : num(b.purchasePrice, 0, 1e8);
  if (purchasePrice === null) return { error: "Purchase price must be a number." };
  const isService = b.isService === true;
  const stock = isService || b.stock === "" || b.stock == null ? 0 : num(b.stock, -1e7, 1e7);
  if (stock === null) return { error: "Stock must be a number." };
  const lowStockAt = b.lowStockAt === "" || b.lowStockAt == null ? undefined : num(b.lowStockAt, 0, 1e7);
  if (lowStockAt === null) return { error: "Low-stock level must be a number." };
  const gstRate = num(b.gstRate ?? 0, 0, 100);
  if (gstRate === null || !GST.includes(gstRate)) return { error: "Choose a GST rate of 0, 5, 12, 18 or 28%." };
  return {
    value: {
      name,
      brand: str(b.brand, 60) || undefined,
      sku: str(b.sku, 60) || undefined,
      barcode: str(b.barcode, 60) || undefined,
      hsn: str(b.hsn, 20) || undefined,
      category: str(b.category, 60) || "General",
      unit: str(b.unit, 12) || "pcs",
      salePrice,
      purchasePrice,
      gstRate,
      stock,
      lowStockAt: isService ? undefined : lowStockAt,
      isService,
    },
  };
}
