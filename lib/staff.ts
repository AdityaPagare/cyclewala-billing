/* Staff, attendance, advances and payroll storage. */
import { col } from "@/lib/store";
import { computePayroll } from "@/lib/payroll";
import type { Advance, AttendanceRecord, PayrollEntry, PaymentMode, StaffMember } from "@/lib/types";

export const staffCol = () => col<StaffMember>("staff");
export const attendanceCol = () => col<AttendanceRecord>("attendance");
export const advancesCol = () => col<Advance>("advances");
export const payrollCol = () => col<PayrollEntry>("payroll");

/** one attendance record per person per day: the id is "<staffId>_<date>" so saving again just replaces it */
export const recordId = (staffId: string, date: string) => `${staffId}_${date}`;

export async function saveAttendance(r: Omit<AttendanceRecord, "_id">): Promise<AttendanceRecord> {
  const id = recordId(r.staffId, r.date);
  const doc = { ...r, _id: id } as AttendanceRecord;
  if (await attendanceCol().get(id)) return (await attendanceCol().update(id, doc))!;
  return attendanceCol().insert(doc);
}

export async function attendanceForMonth(month: string): Promise<AttendanceRecord[]> {
  return (await attendanceCol().all()).filter((r) => r.date.startsWith(month));
}

/** the month's payroll for everyone active (or paid that month): saved bonus/deductions are kept, paid rows are frozen */
export async function payrollForMonth(month: string): Promise<{ staff: StaffMember; entry: PayrollEntry }[]> {
  const [staff, records, advs, saved] = await Promise.all([staffCol().all(), attendanceForMonth(month), advancesCol().all(), payrollCol().all()]);
  const out: { staff: StaffMember; entry: PayrollEntry }[] = [];
  for (const s of staff) {
    const prev = saved.find((p) => p._id === `${s._id}_${month}`);
    if (prev?.paid) {
      out.push({ staff: s, entry: prev });
      continue;
    }
    if (!s.active || s.joinedOn.slice(0, 7) > month) continue;
    const c = computePayroll(s, month, records, advs.filter((a) => a.staffId === s._id), { bonus: prev?.bonus, deductions: prev?.deductions });
    out.push({ staff: s, entry: { ...c, paid: false, createdAt: prev?.createdAt ?? new Date().toISOString() } });
  }
  return out.sort((a, b) => a.staff.name.localeCompare(b.staff.name));
}

/** take the advances back, oldest first, up to `amount` */
export async function settleAdvances(staffId: string, amount: number) {
  let left = amount;
  const mine = (await advancesCol().all()).filter((a) => a.staffId === staffId && a.amount > a.settled).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  for (const a of mine) {
    if (left <= 0) break;
    const take = Math.min(left, a.amount - a.settled);
    await advancesCol().update(a._id, { settled: Math.round((a.settled + take) * 100) / 100 });
    left = Math.round((left - take) * 100) / 100;
  }
}

export async function markPaid(staffId: string, month: string, mode: PaymentMode, date: string): Promise<PayrollEntry | null> {
  const row = (await payrollForMonth(month)).find((r) => r.staff._id === staffId);
  if (!row || row.entry.paid) return null;
  const entry: PayrollEntry = { ...row.entry, paid: true, paidOn: date, mode };
  await settleAdvances(staffId, entry.advances);
  const exists = await payrollCol().get(entry._id);
  return exists ? payrollCol().update(entry._id, entry) : payrollCol().insert(entry);
}

export async function saveAdjustments(staffId: string, month: string, bonus: number, deductions: number): Promise<PayrollEntry | null> {
  const row = (await payrollForMonth(month)).find((r) => r.staff._id === staffId);
  if (!row || row.entry.paid) return null;
  const [records, advs] = await Promise.all([attendanceForMonth(month), advancesCol().all()]);
  const c = computePayroll(row.staff, month, records, advs.filter((a) => a.staffId === staffId), { bonus, deductions });
  const entry: PayrollEntry = { ...c, paid: false, createdAt: row.entry.createdAt };
  const exists = await payrollCol().get(entry._id);
  return exists ? payrollCol().update(entry._id, entry) : payrollCol().insert(entry);
}
