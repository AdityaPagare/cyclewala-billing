import { col } from "@/lib/store";
import type { BusinessProfile } from "@/lib/types";

const DEFAULTS: BusinessProfile = {
  _id: "business",
  name: "Cycle Wala",
  phone: "+91 92096 73730",
  email: "cyclewalastore@gmail.com",
  address: "Kranti Chowk, Paithan Gate, Nirala Bazar, Chhatrapati Sambhajinagar, Maharashtra",
  gstin: "",
  gstEnabled: false,
  invoicePrefix: "INV-",
  nextInvoiceNumber: 1,
  invoiceTheme: "classic",
  upiId: "",
  terms: "Goods once sold will not be taken back. Thank you for shopping with Cycle Wala!",
  warranty: "Frame and manufacturing defects are covered by the brand warranty on the date of purchase. Keep this invoice and the frame number safe for any claim. Tyres, tubes, chains, brake pads and accessories are not covered.",
  website: "cyclewala.shop",
};

const settings = () => col<BusinessProfile>("business");

export async function getBusiness(): Promise<BusinessProfile> {
  const saved = await settings().get("business");
  return { ...DEFAULTS, ...(saved ?? {}), _id: "business" };
}

export async function saveBusiness(patch: Partial<BusinessProfile>): Promise<BusinessProfile> {
  const current = await getBusiness();
  const next = { ...current, ...patch, _id: "business" } as BusinessProfile;
  if (!(await settings().get("business"))) await settings().insert(next);
  else await settings().update("business", next);
  return next;
}
