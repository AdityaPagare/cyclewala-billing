/* The app's sections: one list drives the sidebar, the module pages and the roadmap badges. */

export type Phase = 1 | 2 | 3;

export type Section = {
  slug: string;
  label: string;
  icon: string;
  /** one line under the page title */
  blurb: string;
  phase: Phase;
  /** what the finished module does */
  features: string[];
};

export const PHASES: Record<Phase, string> = {
  1: "Phase 1 — Billing core",
  2: "Phase 2 — Staff & attendance",
  3: "Phase 3 — Purchases, quotations & reports",
};

export const SECTIONS: Section[] = [
  {
    slug: "parties",
    label: "Parties",
    icon: "users",
    blurb: "Customers and suppliers, with a ledger for each.",
    phase: 1,
    features: [
      "Add customers and suppliers with phone, email, GSTIN and address",
      "Party-wise ledger: every invoice and payment in date order, with the running balance",
      "Opening balance and an optional credit limit per party",
      "Outstanding amount shown on every party, with one-tap reminders",
    ],
  },
  {
    slug: "items",
    label: "Items & stock",
    icon: "box",
    blurb: "Cycles, spare parts, accessories and services.",
    phase: 1,
    features: [
      "Items with category, unit, sale and purchase price, HSN and GST rate",
      "Live stock that goes down on every sale and up on every purchase",
      "Low-stock alerts and a reorder list",
      "Services (labour) that have no stock; barcode / SKU search",
    ],
  },
  {
    slug: "invoices",
    label: "Sales invoices",
    icon: "receipt",
    blurb: "Create a bill in under a minute, then send it.",
    phase: 1,
    features: [
      "Pick a party, add items, discount per line, GST (CGST/SGST/IGST) worked out for you",
      "Automatic invoice numbers (INV-0001…), invoice date and due date",
      "Print on A4, A5 or a thermal receipt; save as PDF",
      "Send to the customer by email, WhatsApp or SMS with a public invoice link",
      "Status: unpaid, partly paid, paid — updated as payments come in",
    ],
  },
  {
    slug: "payments",
    label: "Payments",
    icon: "rupee",
    blurb: "Money in and out, matched to invoices.",
    phase: 1,
    features: [
      "Record payment-in against one or many invoices; cash, UPI, card, bank or cheque",
      "Part payments and advances",
      "Outstanding / overdue list with WhatsApp and SMS reminders (UPI payment link)",
      "Payment-out to suppliers",
    ],
  },
  {
    slug: "staff",
    label: "Staff",
    icon: "badge",
    blurb: "Your team and how each person is paid.",
    phase: 2,
    features: [
      "Add staff with role, phone, joining date and salary (monthly, daily or hourly)",
      "Mark someone inactive without losing their history",
      "Advances and deductions recorded against the person",
    ],
  },
  {
    slug: "attendance",
    label: "Attendance",
    icon: "calendar",
    blurb: "Mark the day's attendance in one screen.",
    phase: 2,
    features: [
      "One screen for today: present, absent, half-day, leave, week-off and holiday for everyone",
      "In and out time, late minutes and overtime hours",
      "Month calendar per person and a month summary for the whole team",
      "Edit past days; attendance feeds payroll directly",
    ],
  },
  {
    slug: "payroll",
    label: "Payroll",
    icon: "wallet",
    blurb: "Turn attendance into salary slips.",
    phase: 2,
    features: [
      "Salary worked out from attendance: present, half-days, leave, absent and overtime",
      "Add bonus, subtract advances and deductions",
      "Printable salary slip per person; mark as paid with the mode",
      "Month-end payroll report",
    ],
  },
  {
    slug: "quotations",
    label: "Quotations",
    icon: "file",
    blurb: "Send an estimate, convert it to an invoice with one click.",
    phase: 3,
    features: ["Same editor as invoices", "Validity date and terms", "Convert an accepted quotation into a sales invoice"],
  },
  {
    slug: "purchases",
    label: "Purchases",
    icon: "truck",
    blurb: "Bills from suppliers that add to your stock.",
    phase: 3,
    features: ["Purchase bills with GST input credit", "Stock goes up when a bill is saved", "Payables and supplier ledger"],
  },
  {
    slug: "reports",
    label: "Reports",
    icon: "chart",
    blurb: "Know how the shop is doing.",
    phase: 3,
    features: [
      "Daily sales, sales by item and by party, profit",
      "Outstanding receivables and payables",
      "GST summary (GSTR-1 style) you can hand to your CA, and Excel/CSV export",
      "Stock value and low-stock report; attendance and payroll reports",
    ],
  },
  {
    slug: "settings",
    label: "Settings",
    icon: "gear",
    blurb: "Business profile, invoice look and sharing.",
    phase: 1,
    features: [
      "Shop name, logo, address, GSTIN and UPI id",
      "Invoice prefix and numbering, terms and notes",
      "Invoice themes and print size",
      "Email and WhatsApp sharing set-up; users and roles",
    ],
  },
];

export const bySlug = (slug: string) => SECTIONS.find((s) => s.slug === slug);
