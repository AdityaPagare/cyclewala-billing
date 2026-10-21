/* Salary from attendance. Pure arithmetic, shared by the payroll screen and the slip.
 *
 * How pay is worked out (change the rules here, in one place):
 *  - Monthly salary: salary / days in the month x payable days. Payable days = present + half-days x 0.5 + paid leave
 *    + weekly offs + holidays. Absent and unmarked days are unpaid.
 *  - Daily wage: salary x (present days + half-days x 0.5). Weekly offs, holidays and leave are unpaid.
 *  - Hourly: salary x hours worked (from in/out times; a present day without times counts as 8 hours, a half-day 4).
 *  - Overtime: overtime hours x the hourly rate (monthly: salary / (days x 8); daily: salary / 8).
 *  - Net pay = basic + overtime + bonus - deductions - advances taken back (never below zero).
 */
import { round2, today } from "@/lib/format";
import type { Advance, AttendanceRecord, PayrollEntry, StaffMember } from "@/lib/types";

export const daysInMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};
export const isMonth = (v: unknown): v is string => typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
export const thisMonth = () => today().slice(0, 7);

function hours(inTime?: string, outTime?: string): number | null {
  const p = (s?: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(s ?? "");
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const a = p(inTime);
  const b = p(outTime);
  return a !== null && b !== null && b > a ? (b - a) / 60 : null;
}

export type PayrollInput = { bonus?: number; deductions?: number };

export function computePayroll(staff: StaffMember, month: string, records: AttendanceRecord[], advances: Advance[], input: PayrollInput = {}): Omit<PayrollEntry, "paid" | "paidOn" | "mode" | "createdAt"> {
  const D = daysInMonth(month);
  const mine = new Map(records.filter((r) => r.staffId === staff._id && r.date.startsWith(month)).map((r) => [r.date, r]));
  const count = (s: AttendanceRecord["status"]) => [...mine.values()].filter((r) => r.status === s).length;
  const present = count("present");
  const half = count("half-day");
  const leave = count("leave");
  const weekOff = count("week-off");
  const holiday = count("holiday");
  const absent = count("absent");
  // days that should already have been marked but are not
  const t = today();
  const lastDay = month < t.slice(0, 7) ? D : month === t.slice(0, 7) ? Number(t.slice(8, 10)) : 0;
  let unmarked = 0;
  for (let d = 1; d <= lastDay; d++) if (!mine.has(`${month}-${String(d).padStart(2, "0")}`)) unmarked++;

  let worked = 0;
  for (const r of mine.values()) {
    if (r.status === "present") worked += hours(r.inTime, r.outTime) ?? 8;
    else if (r.status === "half-day") worked += hours(r.inTime, r.outTime) ?? 4;
  }
  const overtimeHours = round2([...mine.values()].reduce((n, r) => n + (r.overtimeHours ?? 0), 0));

  let payable: number;
  let basic: number;
  let hourly: number;
  if (staff.salaryType === "monthly") {
    payable = present + half * 0.5 + leave + weekOff + holiday;
    basic = (staff.salary / D) * payable;
    hourly = staff.salary / (D * 8);
  } else if (staff.salaryType === "daily") {
    payable = present + half * 0.5;
    basic = staff.salary * payable;
    hourly = staff.salary / 8;
  } else {
    payable = present + half * 0.5;
    basic = staff.salary * worked;
    hourly = staff.salary;
  }
  basic = round2(basic);
  const overtimePay = round2(overtimeHours * hourly);
  const bonus = round2(input.bonus ?? 0);
  const deductions = round2(input.deductions ?? 0);
  const owed = advances.reduce((n, a) => n + Math.max(0, a.amount - a.settled), 0);
  const before = Math.max(0, basic + overtimePay + bonus - deductions);
  const taken = round2(Math.min(owed, before));
  return {
    _id: `${staff._id}_${month}`,
    staffId: staff._id,
    month,
    daysInMonth: D,
    presentDays: present,
    halfDays: half,
    leaveDays: leave,
    weekOffDays: weekOff,
    holidayDays: holiday,
    absentDays: absent,
    unmarkedDays: unmarked,
    payableDays: round2(payable),
    hoursWorked: round2(worked),
    overtimeHours,
    basic,
    overtimePay,
    bonus,
    deductions,
    advances: taken,
    net: round2(before - taken),
  };
}
