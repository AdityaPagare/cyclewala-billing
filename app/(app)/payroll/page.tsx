import { isMonth, thisMonth } from "@/lib/payroll";
import { payrollForMonth } from "@/lib/staff";
import PayrollView from "./PayrollView";

export const metadata = { title: "Payroll — Cycle Wala Billing" };

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const sp = await searchParams;
  const month = isMonth(sp.month) ? sp.month : thisMonth();
  const rows = await payrollForMonth(month);
  return <PayrollView month={month} rows={rows} />;
}
