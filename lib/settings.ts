import { col } from "@/lib/store";
import type { BusinessProfile } from "@/lib/types";

const DEFAULTS: BusinessProfile = {
  _id: "business",
  name: "Cyclewala",
  phone: "9209673730",
  email: "cyclewalastore@gmail.com",
  address: "CYCLEWALA PAITHAN GATE , CHHATRAPATI SAMBHAJI NAGAR , MAHARASHTRA, 431001",
  gstin: "27BWDPT0658R1ZO",
  state: "Maharashtra",
  gstEnabled: false,
  invoicePrefix: "INV-",
  nextInvoiceNumber: 1,
  invoiceTheme: "classic",
  upiId: "",
  terms: [
    "1. Goods once sold will not be taken back or exchanged",
    "2) Please check the fitting of the product or defects if any before leaving the store.",
    "3) No Replacement No gaurantee No Warranty Claims there after (Specially Gear Parts & Battery",
    "4. Only cycle frame warranty",
    "5. No warranty on plastic items , tube , tyres , not a single nut bolt .etc",
  ].join("\n"),
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
