import { advancesCol, staffCol } from "@/lib/staff";
import StaffView from "./StaffView";

export const metadata = { title: "Staff — Cycle Wala Billing" };

export default async function StaffPage() {
  const [staff, advances] = await Promise.all([staffCol().all(), advancesCol().all()]);
  const owed = new Map<string, number>();
  for (const a of advances) owed.set(a.staffId, (owed.get(a.staffId) ?? 0) + Math.max(0, a.amount - a.settled));
  const list = staff.sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name)).map((s) => ({ ...s, advanceOwed: Math.round((owed.get(s._id) ?? 0) * 100) / 100 }));
  const open = advances.filter((a) => a.amount > a.settled).sort((a, b) => b.date.localeCompare(a.date));
  return <StaffView staff={list} advances={open} />;
}
