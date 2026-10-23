/* The short message that goes with an invoice, quotation or payment, by email and WhatsApp. Same shape as the
 * messages a customer already gets from their billing app:
 *
 *   Hi Sir/Ma'am
 *   Invoice(number: INV-0001) of Rs. 5,000.0 has been created for you on 20-Oct-2026
 *   You can view the Invoice here: <link>
 *   Thank you,
 *   Cyclewala
 *   Sent via Cycle Wala Billing
 *
 * Pure text helpers, safe to use in the browser and on the server. */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-20" -> "20-Oct-2026" */
export const messageDate = (day: string) => {
  const [y, m, d] = day.split("-");
  return `${d}-${MONTHS[Number(m) - 1] ?? m}-${y}`;
};

/** 5000 -> "Rs. 5,000.0", 1234.56 -> "Rs. 1,234.56" */
export const rs = (n: number) => `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`;

export type MessageInput = {
  kind: "sale" | "quotation" | "payment";
  /** the customer's name; "Sir/Ma'am" when it is not known */
  name?: string;
  number?: string;
  amount: number;
  /** "YYYY-MM-DD" */
  date: string;
  link: string;
  shop: string;
};

export function docMessage(m: MessageInput): { subject: string; text: string } {
  const who = m.name && !/^(walk-in customer|customer)$/i.test(m.name.trim()) ? m.name.trim() : "Sir/Ma'am";
  const what = m.kind === "quotation" ? "Quotation" : m.kind === "payment" ? "Payment-in" : "Invoice";
  const line =
    m.kind === "payment"
      ? `Payment-in of ${rs(m.amount)} has been recorded from you on ${messageDate(m.date)}`
      : `${what}(number: ${m.number}) of ${rs(m.amount)} has been created for you on ${messageDate(m.date)}`;
  const viewing = m.kind === "payment" ? "Invoice" : what;
  const text = `Hi ${who}\n\n${line}\n\nYou can view the ${viewing} here: ${m.link}\n\nThank you,\n\n${m.shop}\n\nSent via Cycle Wala Billing`;
  return { subject: m.kind === "payment" ? `Payment received by ${m.shop}` : `${what} ${m.number} from ${m.shop}`, text };
}
