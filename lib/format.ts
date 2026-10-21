export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** 1234.5 -> "₹1,234.50"; whole rupees drop the paise */
export function inr(n: number): string {
  const v = round2(n);
  const whole = Number.isInteger(v);
  return "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
}

/** "2026-10-21" or a full ISO time -> "21 Oct 2026" */
export function day(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export const today = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
