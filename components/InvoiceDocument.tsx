/* The Cycle Wala invoice: black header with the logo, green accents, a frame/serial number under each cycle,
 * a warranty box and a "pay at store / UPI" card. Used on screen, in print, on the public link.
 * Inline styles only (email clients ignore stylesheets) — lib/invoice-html.ts is the same design as an HTML string
 * for the email body; keep the two in step. */
import { day, inr } from "@/lib/format";
import type { BusinessProfile, Invoice } from "@/lib/types";

const INK = "#0a0a0c";
const GREEN = "#4CAF2E";
const GREEN_DARK = "#3c8a24";
const LIME = "#67DD25";
const TINT = "#eef7ea";

const cell = { padding: "10px 10px", borderBottom: "1px solid #e8ece6", fontSize: 13, verticalAlign: "top" } as const;
const head = { padding: "10px 10px", background: TINT, color: GREEN_DARK, fontWeight: 800, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "left" } as const;

export default function InvoiceDocument({ biz, inv, logoSrc = "/images/logo-wordmark.png" }: { biz: BusinessProfile; inv: Invoice; logoSrc?: string }) {
  const gst = inv.gst ?? inv.cgst + inv.sgst + inv.igst > 0;
  const due = Math.max(0, inv.total - inv.paid);
  const status =
    inv.status === "paid" ? { t: "PAID", c: "#166534", b: "#dcfce7" } : inv.status === "cancelled" ? { t: "CANCELLED", c: "#991b1b", b: "#fee2e2" } : inv.status === "partial" ? { t: "PART PAID", c: "#92400e", b: "#fef3c7" } : { t: "PAYMENT DUE", c: "#991b1b", b: "#fee2e2" };
  const hasCycle = inv.lines.some((l) => l.serial);

  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", color: "#111827", background: "#fff", maxWidth: 794, margin: "0 auto", boxSizing: "border-box" }}>
      {/* header band */}
      <div style={{ background: INK, color: "#fff", padding: "22px 28px", borderRadius: "14px 14px 0 0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: "middle" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoSrc} alt={biz.name} width={190} style={{ display: "block", width: 190, height: "auto" }} />
              </td>
              <td style={{ verticalAlign: "middle", textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.06em" }}>{gst ? "TAX INVOICE" : "INVOICE"}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: LIME, marginTop: 3 }}>{inv.number}</div>
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: 12, fontSize: 11.5, color: "rgba(255,255,255,.72)", lineHeight: 1.55 }}>
          {biz.address} &nbsp;·&nbsp; {biz.phone}
          {biz.email ? ` · ${biz.email}` : ""}
          {gst && biz.gstin ? ` · GSTIN ${biz.gstin}` : ""}
        </div>
      </div>
      <div style={{ height: 5, background: GREEN }} />

      <div style={{ padding: "22px 28px 28px" }}>
        {/* bill-to and invoice facts */}
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: "top", width: "55%", paddingRight: 14 }}>
                <div style={{ border: "1px solid #e8ece6", borderRadius: 12, padding: "13px 16px", fontSize: 13, lineHeight: 1.55 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: GREEN_DARK }}>BILLED TO</div>
                  <div style={{ fontWeight: 800, fontSize: 16, marginTop: 2 }}>{inv.party.name}</div>
                  {inv.party.phone ? <div>{inv.party.phone}</div> : null}
                  {inv.party.address ? <div style={{ color: "#4b5563" }}>{inv.party.address}</div> : null}
                  {inv.party.gstin ? <div>GSTIN: {inv.party.gstin}</div> : null}
                </div>
              </td>
              <td style={{ verticalAlign: "top", width: "45%" }}>
                <div style={{ border: "1px solid #e8ece6", borderRadius: 12, padding: "13px 16px", fontSize: 13, lineHeight: 1.7 }}>
                  <Fact k="Invoice date" v={day(inv.date)} />
                  {inv.dueDate ? <Fact k="Due date" v={day(inv.dueDate)} /> : null}
                  <Fact k="Status" v={<span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 99, fontSize: 10.5, fontWeight: 800, color: status.c, background: status.b }}>{status.t}</span>} />
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* items */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 18 }}>
          <thead>
            <tr>
              <th style={{ ...head, borderRadius: "10px 0 0 10px" }}>#</th>
              <th style={head}>Item</th>
              {gst ? <th style={head}>HSN</th> : null}
              <th style={{ ...head, textAlign: "right" }}>Qty</th>
              <th style={{ ...head, textAlign: "right" }}>Rate</th>
              <th style={{ ...head, textAlign: "right" }}>Disc</th>
              {gst ? <th style={{ ...head, textAlign: "right" }}>GST</th> : null}
              <th style={{ ...head, textAlign: "right", borderRadius: "0 10px 10px 0" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l, i) => (
              <tr key={i}>
                <td style={cell}>{i + 1}</td>
                <td style={{ ...cell, fontWeight: 700 }}>
                  {l.name}
                  {l.serial ? <div style={{ marginTop: 3, fontWeight: 400, fontSize: 11.5, color: GREEN_DARK }}>Frame / serial no.: <b style={{ fontFamily: "Consolas, Menlo, monospace", color: INK }}>{l.serial}</b></div> : null}
                </td>
                {gst ? <td style={cell}>{l.hsn || ""}</td> : null}
                <td style={{ ...cell, textAlign: "right", whiteSpace: "nowrap" }}>
                  {l.qty} {l.unit}
                </td>
                <td style={{ ...cell, textAlign: "right" }}>{inr(l.rate)}</td>
                <td style={{ ...cell, textAlign: "right" }}>{l.discountPct ? `${l.discountPct}%` : "-"}</td>
                {gst ? <td style={{ ...cell, textAlign: "right" }}>{l.gstRate}%</td> : null}
                <td style={{ ...cell, textAlign: "right", fontWeight: 800 }}>{inr(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* totals and pay */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: "top", width: "50%", paddingRight: 18, fontSize: 12.5, color: "#4b5563", lineHeight: 1.6 }}>
                {due > 0 && inv.status !== "cancelled" ? (
                  <div style={{ background: TINT, border: `1px solid ${GREEN}`, borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
                    <div style={{ fontWeight: 800, color: GREEN_DARK, fontSize: 12 }}>HOW TO PAY</div>
                    <div style={{ color: INK }}>
                      Pay <b>{inr(due)}</b> at the store or on delivery{biz.upiId ? <> — or by UPI to <b>{biz.upiId}</b></> : null}.
                    </div>
                  </div>
                ) : null}
                {inv.notes ? (
                  <div style={{ marginBottom: 10 }}>
                    <b style={{ color: INK }}>Notes:</b> {inv.notes}
                  </div>
                ) : null}
              </td>
              <td style={{ verticalAlign: "top", width: "50%" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <tbody>
                    <Row k="Subtotal" v={inr(inv.subtotal)} />
                    {inv.discount > 0 ? <Row k="Discount given" v={`- ${inr(inv.discount)}`} /> : null}
                    {inv.cgst > 0 ? <Row k="CGST" v={inr(inv.cgst)} /> : null}
                    {inv.sgst > 0 ? <Row k="SGST" v={inr(inv.sgst)} /> : null}
                    {inv.igst > 0 ? <Row k="IGST" v={inr(inv.igst)} /> : null}
                    {inv.roundOff !== 0 ? <Row k="Round off" v={inr(inv.roundOff)} /> : null}
                    <tr>
                      <td colSpan={2} style={{ paddingTop: 8 }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", background: INK, borderRadius: 12 }}>
                          <tbody>
                            <tr>
                              <td style={{ padding: "13px 16px", color: "#fff", fontWeight: 800, fontSize: 13, letterSpacing: "0.08em" }}>TOTAL</td>
                              <td style={{ padding: "13px 16px", textAlign: "right", color: LIME, fontWeight: 800, fontSize: 20 }}>{inr(inv.total)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <Row k="Received" v={inr(inv.paid)} />
                    <tr>
                      <td style={{ padding: "6px 8px", fontWeight: 800, color: due > 0 ? "#991b1b" : "#166534" }}>Balance due</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 800, color: due > 0 ? "#991b1b" : "#166534" }}>{inr(due)}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* warranty and terms */}
        {(hasCycle && biz.warranty) || biz.terms ? (
          <div style={{ marginTop: 20, fontSize: 11.5, color: "#4b5563", lineHeight: 1.6 }}>
            {hasCycle && biz.warranty ? (
              <div style={{ border: "1px dashed " + GREEN, borderRadius: 12, padding: "11px 14px", marginBottom: 10 }}>
                <b style={{ color: GREEN_DARK }}>WARRANTY</b> — {biz.warranty}
              </div>
            ) : null}
            {biz.terms ? (
              <div>
                <b style={{ color: INK }}>Terms:</b> {biz.terms}
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={{ marginTop: 22, paddingTop: 14, borderTop: "1px solid #e8ece6", textAlign: "center", fontSize: 12, color: "#6b7280" }}>
          <b style={{ color: GREEN_DARK }}>Thank you for riding with {biz.name}!</b>
          {biz.website ? <> &nbsp;·&nbsp; {biz.website}</> : null}
          <div style={{ marginTop: 3, fontSize: 10.5, color: "#9ca3af" }}>This is a computer-generated invoice and needs no signature.</div>
        </div>
      </div>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span style={{ color: "#6b7280" }}>{k}</span>
      <span style={{ fontWeight: 700 }}>{v}</span>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <tr>
      <td style={{ padding: "5px 8px", color: "#4b5563" }}>{k}</td>
      <td style={{ padding: "5px 8px", textAlign: "right" }}>{v}</td>
    </tr>
  );
}
