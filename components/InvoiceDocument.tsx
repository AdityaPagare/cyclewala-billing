/* The bill as it looks on screen, in print and on the customer's link: the same layout as the PDF
 * (lib/invoice-pdf.ts) — gold frame, logo tile and shop details on top, Bill To, light-blue item table,
 * terms on the left, totals and the signature box on the right. Everything printed comes from buildDoc(),
 * so this page and the PDF always agree. */
import { buildDoc, type DocModel } from "@/lib/doc-model";
import type { BusinessProfile, Invoice } from "@/lib/types";

const NAVY = "#313b5f";
const GOLD = "#d1b560";
const GOLD_LINE = "#dac37f";
const BAND = "#cde6f7";
const SANS = "Nunito, 'Segoe UI', Arial, sans-serif";
const SERIF = "'Noto Serif', Georgia, serif";

/** one corner flourish, drawn for the top-left; the other corners flip it */
function Flourish({ flip }: { flip: "tl" | "tr" | "bl" | "br" }) {
  const sx = flip === "tr" || flip === "br" ? -1 : 1;
  const sy = flip === "bl" || flip === "br" ? -1 : 1;
  const pos = { top: flip === "tl" || flip === "tr" ? 0 : undefined, bottom: flip === "bl" || flip === "br" ? 0 : undefined, left: flip === "tl" || flip === "bl" ? 0 : undefined, right: flip === "tr" || flip === "br" ? 0 : undefined };
  const dia = (x: number, y: number) => `M ${x - 1.7} ${y} L ${x} ${y - 1.7} L ${x + 1.7} ${y} L ${x} ${y + 1.7} Z`;
  return (
    <svg aria-hidden="true" width={64} height={64} viewBox="0 0 48 48" style={{ position: "absolute", ...pos, transform: `scale(${sx}, ${sy})` }} fill="none" stroke={GOLD} strokeWidth={0.75} strokeLinecap="round">
      <path d="M 4 13 C 3 8 8 4 12 6 C 16 8 15 13 11 13 C 8 13 8 9 11 9" />
      <path d="M 13 4 C 17 2 20 6 18 9 C 16.5 11.5 13 10.5 13.5 8" />
      <path d="M 4 13 C 2 17 6 20 9 18 C 12 16 10 13 8 14.5" />
      <circle cx={16.5} cy={15} r={0.9} fill={GOLD} stroke="none" />
      <circle cx={19.5} cy={12.5} r={0.8} fill={GOLD} stroke="none" />
      <circle cx={7} cy={7} r={0.9} fill={GOLD} stroke="none" />
      <path d="M 20 8 H 44 M 8 20 V 44" />
      {[24, 26.4, 38.4, 40.8].map((d) => (
        <g key={d}>
          <path d={dia(d, 8)} fill={GOLD} stroke="none" />
          <path d={dia(8, d)} fill={GOLD} stroke="none" />
        </g>
      ))}
    </svg>
  );
}

export default function InvoiceDocument({ biz, inv }: { biz: BusinessProfile; inv: Invoice }) {
  const m: DocModel = buildDoc(biz, inv);
  const extra = [m.showHsn, m.showDisc, m.showGst].filter(Boolean).length;
  const grid = ["56px", "1fr", m.showHsn ? "84px" : "", "86px", "74px", m.showDisc ? "64px" : "", m.showGst ? "56px" : "", extra ? "132px" : "220px"].filter(Boolean).join(" ");
  const head = { display: "grid", gridTemplateColumns: grid, background: BAND, padding: "8px 35px 8px 0", fontWeight: 600, fontSize: 12 } as const;
  const right = { textAlign: "right" } as const;

  return (
    <div className="cwdoc" style={{ position: "relative", width: 794, maxWidth: "100%", minHeight: 1123, margin: "0 auto", boxSizing: "border-box", background: "#fff", color: NAVY, fontFamily: SANS, fontSize: 12, lineHeight: 1.35, border: `2px solid ${GOLD}`, overflow: "hidden" }}>
      <style>{`
        @font-face{font-family:Nunito;font-weight:400;src:url(/fonts/nunito-400.woff2) format("woff2");font-display:swap}
        @font-face{font-family:Nunito;font-weight:600;src:url(/fonts/nunito-600.woff2) format("woff2");font-display:swap}
        @font-face{font-family:Nunito;font-weight:700;src:url(/fonts/nunito-700.woff2) format("woff2");font-display:swap}
        @font-face{font-family:Nunito;font-weight:800;src:url(/fonts/nunito-800.woff2) format("woff2");font-display:swap}
        @font-face{font-family:"Noto Serif";font-weight:700;src:url(/fonts/notoserif-700.woff2) format("woff2");font-display:swap}
        @font-face{font-family:Nunito;font-weight:400;unicode-range:U+0900-097F,U+20B9;src:url(/fonts/rupee-400.woff2) format("woff2")}
        @font-face{font-family:Nunito;font-weight:700;unicode-range:U+0900-097F,U+20B9;src:url(/fonts/rupee-700.woff2) format("woff2")}
        @media print{.cwdoc{width:100%!important;min-height:0!important;border-width:1.5px!important;break-inside:avoid}}
      `}</style>
      <Flourish flip="tl" />
      <Flourish flip="tr" />
      <Flourish flip="bl" />
      <Flourish flip="br" />

      {/* top: logo, shop, title */}
      <div style={{ display: "flex", gap: 21, padding: "50px 35px 0 47px", minHeight: 208, boxSizing: "border-box", borderBottom: `1px solid ${GOLD_LINE}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-tile.jpg" alt={m.shop.name} width={140} height={140} style={{ width: 140, height: 140, borderRadius: 19, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 30, lineHeight: 1.1, marginTop: 6 }}>{m.shop.name}</div>
          {m.shop.gstin ? (
            <div style={{ marginTop: 10, fontSize: 12 }}>
              <b style={{ fontWeight: 600 }}>GSTIN</b> {m.shop.gstin}
            </div>
          ) : null}
          <div style={{ marginTop: 9, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill={GOLD} aria-hidden="true">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
            </svg>
            {m.shop.phone}
          </div>
          <div style={{ marginTop: 10, fontSize: 12, display: "flex", gap: 8 }}>
            <svg width={14} height={18} viewBox="0 0 24 30" fill={GOLD} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" transform="translate(-3 0) scale(1.15)" />
              <circle cx={12} cy={9.5} r={2.6} fill="#fff" />
            </svg>
            <span>{m.shop.address}</span>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: 0.2, marginTop: 4 }}>{m.title}</div>
          <div style={{ display: "inline-block", marginTop: 10, width: 133, border: "1px solid #b8b8c2", borderRadius: 3, textAlign: "center", fontSize: 9.5, color: "#868597", padding: "4px 0" }}>{m.stamp}</div>
        </div>
      </div>

      {/* number and date */}
      <div style={{ display: "flex", gap: 0, padding: "14px 35px 0 47px", minHeight: 68, boxSizing: "border-box", borderBottom: `1px solid ${GOLD_LINE}` }}>
        {m.facts.map((f, i) => (
          <div key={f.k} style={{ minWidth: i === 0 ? 136 : 0, marginRight: i === 0 ? 0 : 28 }}>
            <div style={{ fontWeight: 700 }}>{f.k}</div>
            <div style={{ marginTop: 5 }}>{f.v}</div>
          </div>
        ))}
      </div>

      {/* bill to */}
      <div style={{ display: "grid", gridTemplateColumns: "50% 50%", minHeight: 108 }}>
        <div style={{ padding: "14px 20px 12px 47px", borderRight: `1px solid ${GOLD_LINE}` }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{m.partyLabel}</div>
          <div style={{ fontSize: 14, marginTop: 3 }}>{m.party.name}</div>
          {m.party.lines.map((l) => (
            <div key={l.k} style={{ marginTop: 3 }}>
              <b style={{ fontWeight: 700 }}>{l.k}</b> {l.v}
            </div>
          ))}
        </div>
        <div />
      </div>

      {/* items */}
      <div style={head}>
        <span style={{ paddingLeft: 7 }}>No</span>
        <span>Items</span>
        {m.showHsn ? <span>HSN</span> : null}
        <span style={right}>Qty.</span>
        <span style={right}>Rate</span>
        {m.showDisc ? <span style={right}>Disc.</span> : null}
        {m.showGst ? <span style={right}>GST</span> : null}
        <span style={right}>Total</span>
      </div>
      <div style={{ minHeight: 243 }}>
        {m.rows.map((r) => (
          <div key={r.no} style={{ display: "grid", gridTemplateColumns: grid, padding: "11px 35px 0 0", alignItems: "start" }}>
            <span style={{ paddingLeft: 10 }}>{r.no}</span>
            <span style={{ paddingRight: 12 }}>
              {r.name}
              {r.serial ? <span style={{ display: "block", fontSize: 10.5, color: "#868597" }}>Frame / serial no.: {r.serial}</span> : null}
            </span>
            {m.showHsn ? <span>{r.hsn}</span> : null}
            <span style={right}>{r.qty}</span>
            <span style={right}>{r.rate}</span>
            {m.showDisc ? <span style={right}>{r.disc}</span> : null}
            {m.showGst ? <span style={right}>{r.gst}</span> : null}
            <span style={right}>{r.total}</span>
          </div>
        ))}
      </div>
      <div style={{ ...head, fontWeight: 700 }}>
        <span />
        <span>SUBTOTAL</span>
        {m.showHsn ? <span /> : null}
        <span style={right}>{m.subtotalQty}</span>
        <span />
        {m.showDisc ? <span /> : null}
        {m.showGst ? <span /> : null}
        <span style={right}>₹ {m.subtotalAmount}</span>
      </div>

      {/* terms and totals */}
      <div style={{ display: "grid", gridTemplateColumns: "50% 50%", padding: "20px 0 0", minHeight: 310 }}>
        <div style={{ padding: "0 14px 0 47px", fontSize: 11 }}>
          {m.notes ? (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 12 }}>Notes</div>
              <div style={{ whiteSpace: "pre-line", marginTop: 4 }}>{m.notes}</div>
            </div>
          ) : null}
          {m.terms.length ? (
            <>
              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 5 }}>Terms &amp; Conditions</div>
              {m.terms.map((t, i) => (
                <div key={i} style={{ lineHeight: 1.3 }}>
                  {t}
                </div>
              ))}
            </>
          ) : null}
          {m.warranty ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>Warranty</div>
              {m.warranty}
            </div>
          ) : null}
        </div>
        <div style={{ padding: "0 47px 0 32px" }}>
          <div style={{ borderTop: `1px solid ${GOLD_LINE}` }}>
            {m.totals.map((t, i) => {
              const big = t.label === "Total Amount";
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: big ? "9px 0 11px" : "5px 0", fontSize: big ? 14 : 12, fontWeight: big || t.bold ? 700 : 400, borderTop: t.line === "above" && i > 0 ? `1px solid ${GOLD_LINE}` : undefined, marginTop: t.line === "above" && i > 0 ? 4 : 0 }}>
                  <span>{t.label}</span>
                  <span>{t.rupee ? `₹ ${t.value}` : t.value}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 28 }}>
            <div style={{ fontWeight: 700 }}>Total Amount (in words)</div>
            <div style={{ fontSize: 11, marginTop: 5 }}>{m.words}</div>
          </div>
          <div style={{ marginTop: 28, marginBottom: 26, height: 111, border: `1.2px solid ${GOLD}`, borderRadius: 16, textAlign: "center", boxSizing: "border-box", paddingTop: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/signature.jpg" alt="" height={50} style={{ height: 50, width: "auto", display: "block", margin: "0 auto" }} />
            <div style={{ fontWeight: 700, fontSize: 11, marginTop: 6 }}>Signature</div>
            <div style={{ fontSize: 11 }}>{m.shop.name}</div>
          </div>
        </div>
      </div>

      {m.cancelled ? (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
          <span style={{ transform: "rotate(-35deg)", fontSize: 110, fontWeight: 800, color: "rgba(200,30,30,.16)", letterSpacing: 4 }}>CANCELLED</span>
        </div>
      ) : null}
    </div>
  );
}
