/* The shop's data, as MongoDB documents. These shapes are the contract every module is built on:
 * parties and items feed invoices; invoices and payments feed the ledgers and reports; staff and attendance
 * feed payroll. Money is kept in rupees as numbers with two decimals; dates are ISO strings ("2026-10-21" for a
 * day, a full ISO time for a moment). */

export type Id = string;

export type BusinessProfile = {
  _id: string; // always "business"
  name: string;
  phone: string;
  email?: string;
  address: string;
  gstin?: string;
  /** show GST (CGST/SGST/IGST), GSTIN and HSN on invoices */
  gstEnabled: boolean;
  logoUrl?: string;
  /** invoice numbers look like INV-0001: prefix + zero-padded counter */
  invoicePrefix: string;
  nextInvoiceNumber: number;
  /** quotations are numbered QT-0001, purchase bills PB-0001 */
  nextQuotationNumber?: number;
  nextPurchaseNumber?: number;
  /** print theme: "classic" | "modern" | "thermal" */
  invoiceTheme: string;
  upiId?: string;
  terms?: string;
  /** printed in the warranty box on every invoice */
  warranty?: string;
  website?: string;
  /** printed as "Place of Supply" on the bill */
  state?: string;
};

/* ---- parties ---- */
export type Party = {
  _id: Id;
  name: string;
  phone: string;
  email?: string;
  gstin?: string;
  address?: string;
  kind: "customer" | "supplier" | "both";
  /** + they owe us, - we owe them */
  openingBalance: number;
  creditLimit?: number;
  createdAt: string;
};

/* ---- items ---- */
export type Item = {
  _id: Id;
  name: string;
  /** from the website's brand list (or typed in) */
  brand?: string;
  sku?: string;
  barcode?: string;
  hsn?: string;
  category: string;
  unit: string;
  salePrice: number;
  purchasePrice?: number;
  /** GST % on this item (0, 5, 12, 18, 28) */
  gstRate: number;
  stock: number;
  /** raise a low-stock alert at or below this */
  lowStockAt?: number;
  /** a service (labour) has no stock */
  isService?: boolean;
  createdAt: string;
};

/* ---- invoices ---- */
export type InvoiceKind = "sale" | "quotation" | "purchase" | "sale-return";
/** sales and purchase bills: unpaid / partial / paid / cancelled. Quotations: open / converted / cancelled. */
export type InvoiceStatus = "draft" | "open" | "converted" | "unpaid" | "partial" | "paid" | "cancelled";

export type InvoiceLine = {
  itemId?: Id;
  name: string;
  hsn?: string;
  /** frame / serial number of the cycle sold (for warranty) */
  serial?: string;
  qty: number;
  unit: string;
  rate: number;
  discountPct: number;
  gstRate: number;
  /** qty x rate less discount, before tax */
  taxable: number;
  amount: number;
};

export type Invoice = {
  _id: Id;
  /** random string in the public link /i/<token>, so a customer can open their invoice without signing in */
  shareToken: string;
  kind: InvoiceKind;
  number: string;
  date: string;
  dueDate?: string;
  partyId?: Id;
  /** kept on the invoice so it never changes if the party is edited later */
  party: { name: string; phone?: string; email?: string; gstin?: string; address?: string };
  /** this was issued as a GST tax invoice (decided when it was made, so later settings changes do not alter old bills) */
  gst?: boolean;
  /** GST charged as IGST (the customer is in another state) */
  interState: boolean;
  lines: InvoiceLine[];
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  total: number;
  paid: number;
  status: InvoiceStatus;
  notes?: string;
  /** purchase bills: the number printed on the supplier's own bill */
  supplierBillNo?: string;
  /** sales: what the customer owed before this bill was made (printed as "Previous Balance") */
  previousBalance?: number;
  /** quotations: the invoice it was turned into */
  convertedTo?: Id;
  /** every time the invoice was sent: { channel, at, to } */
  shares: { channel: "email" | "whatsapp" | "sms" | "link" | "print"; at: string; to?: string }[];
  createdAt: string;
};

/* ---- payments ---- */
export type PaymentMode = "cash" | "upi" | "card" | "bank" | "cheque";
export type Payment = {
  _id: Id;
  /** "in" = a customer paid us, "out" = we paid a supplier */
  direction: "in" | "out";
  partyId?: Id;
  invoiceId?: Id;
  amount: number;
  mode: PaymentMode;
  date: string;
  reference?: string;
  note?: string;
  createdAt: string;
};

/* ---- staff, attendance, payroll ---- */
export type StaffMember = {
  _id: Id;
  name: string;
  phone?: string;
  role: string;
  salaryType: "monthly" | "daily" | "hourly";
  salary: number;
  joinedOn: string;
  active: boolean;
  createdAt: string;
};

export type AttendanceStatus = "present" | "absent" | "half-day" | "leave" | "holiday" | "week-off";
export type AttendanceRecord = {
  _id: Id;
  staffId: Id;
  /** "YYYY-MM-DD" — one record per staff member per day */
  date: string;
  status: AttendanceStatus;
  inTime?: string;
  outTime?: string;
  overtimeHours?: number;
  lateMinutes?: number;
  note?: string;
  /** "self" when the staff member marked it themselves from their own login */
  source?: "self";
};

/** money given to a staff member in advance, taken back from their salary */
export type Advance = {
  _id: Id;
  staffId: Id;
  amount: number;
  /** how much of it has been deducted from salaries so far */
  settled: number;
  date: string;
  note?: string;
  createdAt: string;
};

export type PayrollEntry = {
  /** "<staffId>_<YYYY-MM>" */
  _id: Id;
  staffId: Id;
  /** "YYYY-MM" */
  month: string;
  daysInMonth: number;
  presentDays: number;
  halfDays: number;
  leaveDays: number;
  weekOffDays: number;
  holidayDays: number;
  absentDays: number;
  /** days with nothing marked (counted as unpaid) */
  unmarkedDays: number;
  payableDays: number;
  hoursWorked: number;
  overtimeHours: number;
  basic: number;
  overtimePay: number;
  bonus: number;
  deductions: number;
  /** advances taken back this month */
  advances: number;
  net: number;
  paid: boolean;
  paidOn?: string;
  mode?: PaymentMode;
  createdAt: string;
};

/** a staff member's own login for marking attendance (the password is only ever kept as a salted hash) */
export type StaffLogin = {
  /** same as the staff member's id */
  _id: Id;
  username: string;
  salt: string;
  hash: string;
  createdAt: string;
  lastLogin?: string;
};
