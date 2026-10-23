/* A staff member marking their own attendance: check in when they arrive, check out when they leave.
 * The time always comes from the server (Indian time), never from the phone, so it cannot be faked by changing
 * the phone's clock. They can only touch today, and only a mark they made themselves — if the owner already
 * marked the day (absent, leave, holiday…) it is left alone. */
import { istNow, toMinutes, hm } from "@/lib/ist";
import { attendanceCol, recordId, saveAttendance } from "@/lib/staff";
import type { AttendanceRecord, StaffMember } from "@/lib/types";

const STATUS_WORD: Record<string, string> = { present: "present", absent: "absent", "half-day": "a half day", leave: "on leave", "week-off": "a week off", holiday: "a holiday" };

export async function selfMark(staff: StaffMember, action: "in" | "out"): Promise<{ record: AttendanceRecord } | { error: string; status: number }> {
  const { date, time } = istNow();
  if (!staff.active) return { error: "Your account is not active. Please talk to the owner.", status: 403 };
  if (staff.joinedOn > date) return { error: `Your joining date is ${staff.joinedOn}. You can mark attendance from that day.`, status: 409 };
  const cur = await attendanceCol().get(recordId(staff._id, date));

  if (action === "in") {
    if (cur && cur.source !== "self") return { error: `Today is already marked ${STATUS_WORD[cur.status] ?? cur.status} by the owner. Ask them if it needs changing.`, status: 409 };
    if (cur) return { error: cur.outTime ? `You already finished today (${cur.inTime} to ${cur.outTime}).` : `You are already checked in since ${cur.inTime}.`, status: 409 };
    return { record: await saveAttendance({ staffId: staff._id, date, status: "present", inTime: time, source: "self" }) };
  }

  if (!cur || cur.source !== "self" || !cur.inTime) return { error: "Check in first, then you can check out.", status: 409 };
  if (cur.outTime) return { error: `You already checked out at ${cur.outTime}.`, status: 409 };
  if (toMinutes(time) < toMinutes(cur.inTime)) return { error: "The clock looks wrong. Please try again in a moment.", status: 409 };
  return { record: await saveAttendance({ ...cur, outTime: time }) };
}

/** a short line about a day's mark, for the staff screen */
export const worked = (r: AttendanceRecord | undefined) => (r?.inTime && r.outTime ? hm(toMinutes(r.outTime) - toMinutes(r.inTime)) : "");
