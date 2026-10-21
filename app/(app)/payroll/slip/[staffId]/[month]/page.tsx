import Link from "next/link";
import { notFound } from "next/navigation";
import PrintButton from "@/components/PrintButton";
import SalarySlip from "@/components/SalarySlip";
import { isMonth } from "@/lib/payroll";
import { getBusiness } from "@/lib/settings";
import { payrollForMonth } from "@/lib/staff";

export const metadata = { title: "Salary slip — Cycle Wala Billing" };

export default async function SlipPage({ params }: { params: Promise<{ staffId: string; month: string }> }) {
  const { staffId, month } = await params;
  if (!isMonth(month)) notFound();
  const [biz, rows] = await Promise.all([getBusiness(), payrollForMonth(month)]);
  const row = rows.find((r) => r.staff._id === staffId);
  if (!row) notFound();
  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center gap-3">
        <Link href={`/payroll?month=${month}`} className="text-sm font-semibold text-black/55 hover:text-[#3c8a24]">
          ← Payroll
        </Link>
        <div className="ml-auto">
          <PrintButton />
        </div>
      </div>
      <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-black/5 print:overflow-visible print:rounded-none print:shadow-none print:ring-0">
        <SalarySlip biz={biz} staff={row.staff} e={row.entry} />
      </div>
    </div>
  );
}
