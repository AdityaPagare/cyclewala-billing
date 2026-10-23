import { istNow } from "@/lib/ist";
import { attendanceCol, staffCol } from "@/lib/staff";
import AttendanceView from "./AttendanceView";

export const metadata = { title: "Attendance — Cycle Wala Billing" };

export default async function AttendancePage() {
  const [staff, records] = await Promise.all([staffCol().all(), attendanceCol().all()]);
  const t = istNow().date;
  return <AttendanceView staff={staff.filter((s) => s.active).sort((a, b) => a.name.localeCompare(b.name))} today={t} initial={records.filter((r) => r.date === t)} />;
}
