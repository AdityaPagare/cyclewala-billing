import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { istNow, toMinutes } from "@/lib/ist";
import { isMonth } from "@/lib/payroll";
import { attendanceForMonth, payrollForMonth } from "@/lib/staff";
import { currentStaff } from "@/lib/staff-auth";
import MeView from "./MeView";

export const metadata: Metadata = { title: "My attendance — Cycle Wala", robots: { index: false, follow: false } };

/* A staff member's own screen: check in / out for today and see their month. Only their own records are read. */
export default async function MePage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const me = await currentStaff();
  if (!me) redirect("/staff-login");
  const { staff } = me;
  const now = istNow();
  const sp = await searchParams;
  const thisMonth = now.date.slice(0, 7);
  const month = isMonth(sp.month) && sp.month <= thisMonth ? sp.month : thisMonth;

  const [records, payroll] = await Promise.all([attendanceForMonth(month), payrollForMonth(month)]);
  const mine = records.filter((r) => r.staffId === staff._id);
  const entry = payroll.find((p) => p.staff._id === staff._id)?.entry;
  const hours = mine.reduce((n, r) => (r.inTime && r.outTime ? n + Math.max(0, toMinutes(r.outTime) - toMinutes(r.inTime)) : n), 0);

  return (
    <MeView
      name={staff.name}
      role={staff.role}
      greeting={now.hour < 12 ? "Good morning" : now.hour < 17 ? "Good afternoon" : "Good evening"}
      today={now.date}
      joinedOn={staff.joinedOn}
      month={month}
      records={mine.map((r) => ({ date: r.date, status: r.status, inTime: r.inTime, outTime: r.outTime, self: r.source === "self", note: r.note }))}
      payableDays={entry ? entry.payableDays : null}
      minutesWorked={hours}
    />
  );
}
