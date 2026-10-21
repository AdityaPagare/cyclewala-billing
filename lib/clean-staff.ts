/* Cleaning what the staff, attendance and payroll forms send. */
import { isDay, num, str } from "@/lib/guard";
import type { AttendanceStatus } from "@/lib/types";

export const STATUSES: AttendanceStatus[] = ["present", "absent", "half-day", "leave", "week-off", "holiday"];
const TIME = /^([01]?\d|2[0-3]):[0-5]\d$/;

export function cleanStaff(b: Record<string, unknown>): { value: Record<string, unknown> } | { error: string } {
  const name = str(b.name, 100);
  if (!name) return { error: "Please enter the staff member's name." };
  const phone = str(b.phone, 20);
  if (phone && !/^[0-9+()\-\s]{6,20}$/.test(phone)) return { error: "That phone number does not look right." };
  const salaryType = b.salaryType === "daily" || b.salaryType === "hourly" ? b.salaryType : "monthly";
  const salary = num(b.salary, 0, 1e7);
  if (salary === null) return { error: `Enter the ${salaryType} pay as a number.` };
  const joinedOn = b.joinedOn ? (isDay(b.joinedOn) ? b.joinedOn : null) : new Date().toISOString().slice(0, 10);
  if (!joinedOn) return { error: "The joining date is not valid." };
  return { value: { name, phone: phone || undefined, role: str(b.role, 60) || "Staff", salaryType, salary, joinedOn, active: b.active !== false } };
}

export function cleanAttendance(b: Record<string, unknown>): { value: { staffId: string; date: string; status: AttendanceStatus; inTime?: string; outTime?: string; overtimeHours?: number; lateMinutes?: number; note?: string } } | { error: string } {
  const staffId = str(b.staffId, 80);
  if (!staffId) return { error: "Choose a staff member." };
  if (!isDay(b.date)) return { error: "The date is not valid." };
  if (!STATUSES.includes(b.status as AttendanceStatus)) return { error: "Choose a status." };
  const inTime = str(b.inTime, 5);
  const outTime = str(b.outTime, 5);
  if ((inTime && !TIME.test(inTime)) || (outTime && !TIME.test(outTime))) return { error: "Times look like 09:30." };
  const ot = b.overtimeHours === "" || b.overtimeHours == null ? undefined : num(b.overtimeHours, 0, 24);
  const late = b.lateMinutes === "" || b.lateMinutes == null ? undefined : num(b.lateMinutes, 0, 1440);
  if (ot === null || late === null) return { error: "Overtime and late minutes must be numbers." };
  const worked = b.status === "present" || b.status === "half-day";
  return {
    value: {
      staffId,
      date: b.date,
      status: b.status as AttendanceStatus,
      inTime: worked && inTime ? inTime : undefined,
      outTime: worked && outTime ? outTime : undefined,
      overtimeHours: worked ? ot : undefined,
      lateMinutes: worked ? late : undefined,
      note: str(b.note, 200) || undefined,
    },
  };
}
