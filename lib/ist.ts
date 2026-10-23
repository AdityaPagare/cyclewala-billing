/* The shop runs on Indian time. A server (Vercel) usually runs in UTC, so "today" and "now" for attendance are
 * always worked out for Asia/Kolkata, never from the server's own clock. */
const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });

export function istParts(d: Date = new Date()): { date: string; time: string; seconds: number; minutes: number; hour: number } {
  const p: Record<string, string> = {};
  for (const x of fmt.formatToParts(d)) p[x.type] = x.value;
  const hour = Number(p.hour);
  const minute = Number(p.minute);
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}`, seconds: Number(p.second), minutes: hour * 60 + minute, hour };
}

export const istNow = () => istParts(new Date());

/** "09:30" -> minutes since midnight */
export const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** 95 -> "1h 35m" */
export const hm = (mins: number) => {
  const m = Math.max(0, Math.round(mins));
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
};
