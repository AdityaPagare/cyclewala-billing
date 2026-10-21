/* A salary slip in the same black-and-green Cycle Wala look as the invoice. */
import { day, inr } from "@/lib/format";
import type { BusinessProfile, PayrollEntry, StaffMember } from "@/lib/types";

const INK = "#0a0a0c";
const GREEN = "#4CAF2E";
const GREEN_DARK = "#3c8a24";
const LIME = "#67DD25";
const TINT = "#eef7ea";
const line = { padding: "9px 12px", borderBottom: "1px solid #e8ece6", fontSize: 13 } as const;

const monthName = (m: string) => new Date(m + "-01T00:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const dec = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export default function SalarySlip({ biz, staff, e, logoSrc = "/images/logo-wordmark.png" }: { biz: BusinessProfile; staff: StaffMember; e: PayrollEntry; logoSrc?: string }) {
  const earn: [string, string][] = [
    [`Basic pay (${dec(e.payableDays)} ${staff.salaryType === "hourly" ? "days" : "payable days"})`, inr(e.basic)],
    [`Overtime (${dec(e.overtimeHours)} hours)`, inr(e.overtimePay)],
  ];
  if (e.bonus) earn.push(["Bonus", inr(e.bonus)]);
  const take: [string, string][] = [];
  if (e.deductions) take.push(["Deductions", inr(e.deductions)]);
  if (e.advances) take.push(["Advance taken back", inr(e.advances)]);
  const gross = e.basic + e.overtimePay + e.bonus;
  const out = e.deductions + e.advances;

  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", color: "#111827", background: "#fff", maxWidth: 794, margin: "0 auto", boxSizing: "border-box" }}>
      <div style={{ background: INK, color: "#fff", padding: "22px 28px", borderRadius: "14px 14px 0 0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: "middle" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoSrc} alt={biz.name} width={190} style={{ display: "block", width: 190, height: "auto" }} />
              </td>
              <td style={{ verticalAlign: "middle", textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.06em" }}>SALARY SLIP</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: LIME, marginTop: 3 }}>{monthName(e.month)}</div>
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: 12, fontSize: 11.5, color: "rgba(255,255,255,.72)", lineHeight: 1.55 }}>
          {biz.address} · {biz.phone}
        </div>
      </div>
      <div style={{ height: 5, background: GREEN }} />

      <div style={{ padding: "22px 28px 28px" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: "top", width: "55%", paddingRight: 14 }}>
                <div style={{ border: "1px solid #e8ece6", borderRadius: 12, padding: "13px 16px", fontSize: 13, lineHeight: 1.55 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: GREEN_DARK }}>EMPLOYEE</div>
                  <div style={{ fontWeight: 800, fontSize: 16, marginTop: 2 }}>{staff.name}</div>
                  <div>{staff.role}</div>
                  {staff.phone ? <div>{staff.phone}</div> : null}
                  <div style={{ color: "#6b7280" }}>Joined {day(staff.joinedOn)}</div>
                </div>
              </td>
              <td style={{ verticalAlign: "top", width: "45%" }}>
                <div style={{ border: "1px solid #e8ece6", borderRadius: 12, padding: "13px 16px", fontSize: 13, lineHeight: 1.7 }}>
                  <Fact k="Pay type" v={`${staff.salaryType === "monthly" ? "Monthly" : staff.salaryType === "daily" ? "Daily wage" : "Hourly"} — ${inr(staff.salary)}`} />
                  <Fact k="Days in month" v={String(e.daysInMonth)} />
                  <Fact k="Status" v={e.paid ? `Paid ${day(e.paidOn)}${e.mode ? ` (${e.mode})` : ""}` : "Not paid yet"} />
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 18, background: TINT, borderRadius: 12, padding: "12px 16px", fontSize: 12.5 }}>
          <b style={{ color: GREEN_DARK }}>ATTENDANCE</b> &nbsp; Present {dec(e.presentDays)} · Half-days {dec(e.halfDays)} · Leave {dec(e.leaveDays)} · Week-off / holiday {dec(e.weekOffDays + e.holidayDays)} · Absent {dec(e.absentDays)}
          {e.unmarkedDays ? ` · Not marked ${dec(e.unmarkedDays)}` : ""}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 18 }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: "top", width: "50%", paddingRight: 14 }}>
                <Block title="EARNINGS" rows={earn} total={["Total earnings", inr(gross)]} />
              </td>
              <td style={{ verticalAlign: "top", width: "50%" }}>
                <Block title="DEDUCTIONS" rows={take.length ? take : [["None", "-"]]} total={["Total deductions", inr(out)]} />
              </td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: "100%", borderCollapse: "collapse", background: INK, borderRadius: 12, marginTop: 18 }}>
          <tbody>
            <tr>
              <td style={{ padding: "15px 18px", color: "#fff", fontWeight: 800, fontSize: 13, letterSpacing: "0.08em" }}>NET PAY</td>
              <td style={{ padding: "15px 18px", textAlign: "right", color: LIME, fontWeight: 800, fontSize: 24 }}>{inr(e.net)}</td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 46, fontSize: 12, color: "#6b7280" }}>
          <tbody>
            <tr>
              <td style={{ width: "50%", paddingRight: 30 }}>
                <div style={{ borderTop: "1px solid #9ca3af", paddingTop: 6 }}>Employee signature</div>
              </td>
              <td style={{ width: "50%", paddingLeft: 30, textAlign: "right" }}>
                <div style={{ borderTop: "1px solid #9ca3af", paddingTop: 6 }}>For {biz.name}</div>
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: 18, textAlign: "center", fontSize: 10.5, color: "#9ca3af" }}>Computer-generated salary slip.</div>
      </div>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span style={{ color: "#6b7280" }}>{k}</span>
      <span style={{ fontWeight: 700, textAlign: "right" }}>{v}</span>
    </div>
  );
}

function Block({ title, rows, total }: { title: string; rows: [string, string][]; total: [string, string] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th colSpan={2} style={{ padding: "9px 12px", background: TINT, color: GREEN_DARK, fontWeight: 800, fontSize: 10.5, letterSpacing: "0.08em", textAlign: "left", borderRadius: 8 }}>
            {title}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td style={line}>{k}</td>
            <td style={{ ...line, textAlign: "right", fontWeight: 700 }}>{v}</td>
          </tr>
        ))}
        <tr>
          <td style={{ padding: "10px 12px", fontWeight: 800, fontSize: 13 }}>{total[0]}</td>
          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, fontSize: 13 }}>{total[1]}</td>
        </tr>
      </tbody>
    </table>
  );
}
