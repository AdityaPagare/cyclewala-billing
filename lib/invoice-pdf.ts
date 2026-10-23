/* The invoice as a real PDF file (A4), drawn to match the shop's own bill: gold frame with corner flourishes, black
 * logo tile and shop details on top, Bill To, a light-blue item table, terms on the left, totals and the
 * signature box on the right. Used for the download, the email attachment and the customer's link.
 *
 * Text is set in Nunito, the shop name in Noto Serif, and the rupee sign and Devanagari (Hindi/Marathi names)
 * come from Noto Sans Devanagari. All font files live in assets/fonts so the PDF works on any server. */
// the font engine's Devanagari shaping needs this runtime, which its build does not bring along
import "regenerator-runtime/runtime";
import fs from "fs";
import path from "path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, degrees, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { buildDoc, type DocModel, type Row, type Total } from "@/lib/doc-model";
import type { BusinessProfile, Invoice } from "@/lib/types";

const W = 595.28;
const H = 841.89;
const NAVY = rgb(0.192, 0.231, 0.373);
const GOLD = rgb(0.82, 0.71, 0.376);
const GOLD_LINE = rgb(0.855, 0.765, 0.498);
const BAND = rgb(0.804, 0.902, 0.969);
const GREY = rgb(0.525, 0.522, 0.592);
const BLACK = rgb(0.04, 0.04, 0.047);

/* page geometry (points from the top-left), measured from the shop's own bill */
const FRAME = { l: 19.5, t: 21.5, r: 575.5, b: 792 };
const BODY_L = 35;
const BODY_R = 569;
const FOOT_BAND = 495; // top of the SUBTOTAL band on a standard page
const BOX_H = 83;
const CONT_TOP = 88; // where the item table starts on a page after the first

const cache = new Map<string, Uint8Array>();
const read = (p: string) => {
  let b = cache.get(p);
  if (!b) cache.set(p, (b = new Uint8Array(fs.readFileSync(path.join(process.cwd(), p))))); // own ArrayBuffer: pdf-lib ignores a Buffer's offset into Node's shared pool
  return b;
};
const tryRead = (p: string) => {
  try {
    return read(p);
  } catch {
    return null;
  }
};

type Weight = "r" | "s" | "b";
type Fonts = { latin: Record<Weight, PDFFont>; deva: Record<Weight, PDFFont>; serif: PDFFont };

async function loadFonts(pdf: PDFDocument): Promise<Fonts> {
  pdf.registerFontkit(fontkit);
  const emb = (p: string) => pdf.embedFont(read(p), { subset: true });
  const [n4, n6, n7, d4, d7, serif] = await Promise.all([emb("assets/fonts/nunito-400.woff"), emb("assets/fonts/nunito-600.woff"), emb("assets/fonts/nunito-700.woff"), emb("assets/fonts/rupee-400.woff"), emb("assets/fonts/rupee-700.woff"), emb("assets/fonts/notoserif-700.woff")]);
  return { latin: { r: n4, s: n6, b: n7 }, deva: { r: d4, s: d7, b: d7 }, serif };
}

/* ---- text: runs of Latin and Devanagari/rupee, so Hindi names and the rupee sign always show ---- */

const isDeva = (cp: number) => (cp >= 0x0900 && cp <= 0x097f) || cp === 0x20b9;
function runs(text: string): { t: string; deva: boolean }[] {
  const out: { t: string; deva: boolean }[] = [];
  for (const ch of text) {
    const d = isDeva(ch.codePointAt(0)!);
    const last = out[out.length - 1];
    if (last && last.deva === d) last.t += ch;
    else out.push({ t: ch, deva: d });
  }
  return out;
}

class Ink {
  constructor(
    private page: PDFPage,
    private f: Fonts
  ) {}

  width(text: string, size: number, w: Weight = "r"): number {
    return runs(text).reduce((n, r) => n + (r.deva ? this.f.deva : this.f.latin)[w].widthOfTextAtSize(r.t, size), 0);
  }

  /** `top` is the top of the text line measured from the top of the page */
  text(text: string, x: number, top: number, size: number, w: Weight = "r", o: { align?: "l" | "r" | "c"; color?: ReturnType<typeof rgb>; font?: PDFFont } = {}) {
    if (!text) return;
    const total = o.font ? o.font.widthOfTextAtSize(text, size) : this.width(text, size, w);
    let cx = o.align === "r" ? x - total : o.align === "c" ? x - total / 2 : x;
    const y = H - top - size * 0.82;
    if (o.font) {
      this.page.drawText(text, { x: cx, y, size, font: o.font, color: o.color ?? NAVY });
      return;
    }
    for (const r of runs(text)) {
      const font = (r.deva ? this.f.deva : this.f.latin)[w];
      this.page.drawText(r.t, { x: cx, y, size, font, color: o.color ?? NAVY });
      cx += font.widthOfTextAtSize(r.t, size);
    }
  }

  wrap(text: string, max: number, size: number, w: Weight = "r"): string[] {
    const lines: string[] = [];
    for (const para of text.split(/\r?\n/)) {
      let cur = "";
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const next = cur ? `${cur} ${word}` : word;
        if (cur && this.width(next, size, w) > max) {
          lines.push(cur);
          cur = word;
        } else cur = next;
      }
      lines.push(cur);
    }
    return lines;
  }

  /** "₹ 5,000" with the sign set in the rupee font, right-aligned (or left) at x */
  money(value: string, x: number, top: number, size: number, w: Weight, align: "l" | "r" = "r", rupee = true) {
    this.text(rupee ? `₹ ${value}` : value, x, top, size, w, { align: align === "r" ? "r" : "l" });
  }
}

/* ---- the frame and its flourishes ---- */

function line(page: PDFPage, x1: number, y1: number, x2: number, y2: number, t = 0.8, color = GOLD_LINE) {
  page.drawLine({ start: { x: x1, y: H - y1 }, end: { x: x2, y: H - y2 }, thickness: t, color });
}
function box(page: PDFPage, x: number, top: number, w: number, h: number, o: { fill?: ReturnType<typeof rgb>; border?: ReturnType<typeof rgb>; bw?: number; r?: number } = {}) {
  if (o.r) {
    // a rounded rectangle as an SVG path (y runs downwards from the page top)
    const r = o.r;
    const d = `M ${x + r} ${top} H ${x + w - r} Q ${x + w} ${top} ${x + w} ${top + r} V ${top + h - r} Q ${x + w} ${top + h} ${x + w - r} ${top + h} H ${x + r} Q ${x} ${top + h} ${x} ${top + h - r} V ${top + r} Q ${x} ${top} ${x + r} ${top} Z`;
    page.drawSvgPath(d, { x: 0, y: H, color: o.fill, borderColor: o.border, borderWidth: o.bw ?? 0 });
  } else page.drawRectangle({ x, y: H - top - h, width: w, height: h, color: o.fill, borderColor: o.border, borderWidth: o.bw ?? 0 });
}

/** one corner flourish; (sx, sy) point it into the page: +1/+1 top-left, -1/+1 top-right, +1/-1 bottom-left, -1/-1 bottom-right */
function ornament(page: PDFPage, cx: number, cy: number, sx: number, sy: number) {
  const X = (v: number) => cx + sx * v;
  const Y = (v: number) => cy + sy * v;
  const stroke = (d: string) => page.drawSvgPath(d, { x: 0, y: H, borderColor: GOLD, borderWidth: 0.75 });
  const pt = (x: number, y: number) => `${X(x).toFixed(2)} ${Y(y).toFixed(2)}`;
  // curls in the corner
  stroke(`M ${pt(4, 13)} C ${pt(3, 8)} ${pt(8, 4)} ${pt(12, 6)} C ${pt(16, 8)} ${pt(15, 13)} ${pt(11, 13)} C ${pt(8, 13)} ${pt(8, 9)} ${pt(11, 9)}`);
  stroke(`M ${pt(13, 4)} C ${pt(17, 2)} ${pt(20, 6)} ${pt(18, 9)} C ${pt(16.5, 11.5)} ${pt(13, 10.5)} ${pt(13.5, 8)}`);
  stroke(`M ${pt(4, 13)} C ${pt(2, 17)} ${pt(6, 20)} ${pt(9, 18)} C ${pt(12, 16)} ${pt(10, 13)} ${pt(8, 14.5)}`);
  for (const [x, y, r] of [[16.5, 15, 0.9], [19.5, 12.5, 0.8], [7, 7, 0.9]] as const) page.drawCircle({ x: X(x), y: H - Y(y), size: r, color: GOLD });
  // the two lines running away from the corner, each with two pairs of diamonds
  line(page, X(20), Y(8), X(44), Y(8), 0.75, GOLD);
  line(page, X(8), Y(20), X(8), Y(44), 0.75, GOLD);
  const diamond = (x: number, y: number) => page.drawSvgPath(`M ${pt(x - 1.7, y)} L ${pt(x, y - 1.7)} L ${pt(x + 1.7, y)} L ${pt(x, y + 1.7)} Z`, { x: 0, y: H, color: GOLD });
  for (const d of [24, 26.4, 38.4, 40.8]) {
    diamond(d, 8);
    diamond(8, d);
  }
}

function frame(page: PDFPage) {
  page.drawRectangle({ x: FRAME.l, y: H - FRAME.b, width: FRAME.r - FRAME.l, height: FRAME.b - FRAME.t, borderColor: GOLD, borderWidth: 1.4 });
  ornament(page, FRAME.l, FRAME.t, 1, 1);
  ornament(page, FRAME.r, FRAME.t, -1, 1);
  ornament(page, FRAME.l, FRAME.b, 1, -1);
  ornament(page, FRAME.r, FRAME.b, -1, -1);
}

/* ---- the table ---- */

type Col = { key: keyof Row | "no"; label: string; x: number; align: "l" | "r"; w?: number };
function columns(m: DocModel): Col[] {
  const cols: Col[] = [{ key: "no", label: "No", x: 42, align: "l" }];
  const itemsW = m.showHsn && m.showDisc ? 152 : m.showHsn || m.showDisc ? 180 : 225;
  cols.push({ key: "name", label: "Items", x: 82, align: "l", w: itemsW });
  if (m.showHsn) cols.push({ key: "hsn", label: "HSN", x: 82 + itemsW + 8, align: "l" });
  cols.push({ key: "qty", label: "Qty.", x: 349, align: "r" });
  cols.push({ key: "rate", label: "Rate", x: 404, align: "r" });
  if (m.showDisc) cols.push({ key: "disc", label: "Disc.", x: 450, align: "r" });
  if (m.showGst) cols.push({ key: "gst", label: "GST", x: m.showDisc ? 498 : 470, align: "r" });
  cols.push({ key: "total", label: "Total", x: BODY_R, align: "r" });
  return cols;
}

function rowHeight(ink: Ink, r: Row, cols: Col[]): number {
  const name = cols.find((c) => c.key === "name")!;
  const lines = ink.wrap(r.name, name.w ?? 225, 9).length + (r.serial ? 1 : 0);
  return Math.max(22, lines * 11 + 11);
}

/* ---- the whole document ---- */

export async function invoicePdf(biz: BusinessProfile, inv: Invoice): Promise<Uint8Array> {
  const m = buildDoc(biz, inv);
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${m.title} ${inv.number}`);
  pdf.setAuthor(biz.name);
  pdf.setCreator("Cycle Wala Billing");
  const fonts = await loadFonts(pdf);
  const logoBytes = tryRead("assets/logo-tile.jpg");
  const logo: PDFImage | null = logoBytes ? await pdf.embedJpg(logoBytes) : null;
  const sigBytes = tryRead("assets/signature.jpg");
  const sig: PDFImage | null = sigBytes ? await pdf.embedJpg(sigBytes) : null;

  const cols = columns(m);
  const measure = new Ink(pdf.addPage([W, H]), fonts); // a scratch page, removed below
  pdf.removePage(0);

  /* how tall the footer (subtotal band, terms, totals, words, signature) is, so it can sit lower or higher */
  const termsLines = (ink: Ink) => {
    const out: { text: string; size: number; w: Weight }[] = [];
    if (m.notes) {
      out.push({ text: "Notes", size: 9, w: "s" });
      for (const l of ink.wrap(m.notes, 250, 8.2)) out.push({ text: l, size: 8.2, w: "r" });
      out.push({ text: "", size: 8.2, w: "r" });
    }
    if (m.terms.length) {
      out.push({ text: "Terms & Conditions", size: 9, w: "s" });
      for (const t of m.terms) for (const l of ink.wrap(t, 255, 8.2)) out.push({ text: l, size: 8.2, w: "r" });
    }
    if (m.warranty) {
      out.push({ text: "", size: 8.2, w: "r" });
      out.push({ text: "Warranty", size: 9, w: "s" });
      for (const l of ink.wrap(m.warranty, 255, 8.2)) out.push({ text: l, size: 8.2, w: "r" });
    }
    return out;
  };
  const totalsHeight = (t: Total[]) => t.reduce((n, x, i) => n + (x.label === "Total Amount" ? 24 : t[i + 1]?.line ? 23 : 13), 0);

  /* the footer (subtotal band, terms, totals, words, signature box) is anchored near the bottom of the page like
     the shop's own bill; a long tax invoice has more total lines, so it sits higher and its signature box is smaller */
  const T = totalsHeight(m.totals);
  const wordsLines = measure.wrap(m.words, 240, 8.2).length;
  const boxH = T > 100 ? 66 : BOX_H;
  const flowH = 44 + T + 25 + 14 + 10.7 * wordsLines + 15.3 + boxH; // top of the SUBTOTAL band to the bottom of the box (278 on a plain bill)
  const anchored = Math.min(FOOT_BAND, 773 - flowH);

  /* split the rows over pages; the last page must also leave room for the footer */
  const heights = m.rows.map((r) => rowHeight(measure, r, cols));
  const tableTop0 = headerLayout(measure, m).tableTop;
  const startY = (first: boolean) => (first ? tableTop0 : CONT_TOP) + 31;
  const pages: number[][] = [[]];
  let y = startY(true);
  for (let i = 0; i < m.rows.length; i++) {
    if (pages[pages.length - 1].length && y + heights[i] > 770) {
      pages.push([]);
      y = startY(false);
    }
    pages[pages.length - 1].push(i);
    y += heights[i];
  }
  const endOf = (p: number[], first: boolean) => startY(first) + p.reduce((n, i) => n + heights[i], 0);
  for (let guard = 0; guard < 4; guard++) {
    const last = pages[pages.length - 1];
    if (!last.length || endOf(last, pages.length === 1) + 8 <= anchored) break;
    pages.push([last.pop()!]); // the last row moves to the next page, which carries the footer
  }

  pages.forEach((idx, n) => {
    const page = pdf.addPage([W, H]);
    const ink = new Ink(page, fonts);
    const last = n === pages.length - 1;
    frame(page);

    let tableTop: number;
    if (n === 0) tableTop = drawHeader(page, ink, m, fonts, logo).tableTop;
    else {
      ink.text(m.shop.name, BODY_L, 40, 14, "b", { font: fonts.serif });
      ink.text(`${m.title} ${m.facts[0].v} (continued)`, BODY_R, 44, 9, "s", { align: "r" });
      line(page, FRAME.l, 70, FRAME.r, 70);
      tableTop = CONT_TOP;
    }

    /* header band */
    box(page, FRAME.l + 0.7, tableTop, FRAME.r - FRAME.l - 1.4, 23, { fill: BAND });
    for (const c of cols) ink.text(c.label, c.x, tableTop + 8, 9, "s", { align: c.align });

    /* rows */
    let ry = tableTop + 31;
    for (const i of idx) {
      const r = m.rows[i];
      for (const c of cols) {
        if (c.key === "name") {
          let ly = ry;
          for (const l of ink.wrap(r.name, c.w ?? 225, 9)) {
            ink.text(l, c.x, ly, 9);
            ly += 11;
          }
          if (r.serial) ink.text(`Frame / serial no.: ${r.serial}`, c.x, ly, 7.6, "r", { color: GREY });
        } else ink.text(c.key === "no" ? String(r.no) : String(r[c.key as keyof Row] ?? ""), c.x, ry, 9, "r", { align: c.align });
      }
      ry += heights[i];
    }

    if (m.cancelled) {
      page.drawText("CANCELLED", { x: 110, y: H / 2 - 120, size: 80, font: fonts.latin.b, color: rgb(0.8, 0.1, 0.1), opacity: 0.16, rotate: degrees(35) });
    }
    if (!last) {
      ink.text("Continued on the next page…", BODY_R, Math.min(ry + 8, 776), 8, "r", { align: "r", color: GREY });
      return;
    }

    /* where the footer starts: as anchored on the first page, right under the rows on a later page */
    const footTop = n === 0 ? anchored : Math.min(anchored, ry + 12);
    /* subtotal band */
    box(page, FRAME.l + 0.7, footTop, FRAME.r - FRAME.l - 1.4, 23, { fill: BAND });
    ink.text("SUBTOTAL", 82, footTop + 8, 9, "b");
    ink.text(m.subtotalQty, 349, footTop + 8, 9, "b", { align: "r" });
    ink.money(m.subtotalAmount, BODY_R, footTop + 8, 9, "b");

    /* terms (left) */
    let ty = footTop + 40;
    for (const l of termsLines(ink)) {
      if (l.text) ink.text(l.text, BODY_L, ty, l.size, l.w);
      ty += l.size > 8.5 ? 14 : 10.7;
      if (ty > 782) break;
    }

    /* totals (right) */
    let cy = footTop + 44;
    line(page, 322, cy, 557, cy);
    m.totals.forEach((t, i) => {
      if (t.line === "above" && i > 0) line(page, 322, cy, 557, cy);
      const big = t.label === "Total Amount";
      const size = big ? 10.5 : 9;
      const w: Weight = t.bold ? "b" : "r";
      ink.text(t.label, 322, cy + 7.5, size, big ? "b" : w, { color: t.bold || !t.line ? NAVY : NAVY });
      ink.money(t.value, 559, cy + 7.5, size, big ? "b" : w, "r", !!t.rupee);
      cy += big ? 24 : m.totals[i + 1]?.line ? 23 : 13;
    });
    const wordsTop = cy + 31 - 13 + 7;
    ink.text("Total Amount (in words)", 320, wordsTop, 9, "b");
    let wy = wordsTop + 14;
    for (const l of ink.wrap(m.words, 240, 8.2)) {
      ink.text(l, 320, wy, 8.2);
      wy += 10.7;
    }

    /* signature box */
    const boxTop = footTop + 44 + T + 25 + 14 + 10.7 * wordsLines + 15.3;
    box(page, 320, boxTop, 240, boxH, { border: GOLD, bw: 0.9, r: 12 });
    if (sig) {
      const sw = boxH < BOX_H ? 42 : 56;
      const sh = (sig.height / sig.width) * sw;
      page.drawImage(sig, { x: 440 - sw / 2, y: H - (boxTop + (boxH < BOX_H ? 6 : 14)) - sh, width: sw, height: sh });
    }
    ink.text("Signature", 440, boxTop + (boxH < BOX_H ? 41 : 57), 8.2, "b", { align: "c" });
    ink.text(m.shop.name, 440, boxTop + (boxH < BOX_H ? 52 : 68), 8.2, "r", { align: "c" });
  });

  return pdf.save();
}

/* ---- the top of the first page ---- */

function headerLayout(ink: Ink, m: DocModel): { tableTop: number; party: string[]; partyRows: { k: string; v: string }[] } {
  const party = ink.wrap(m.party.name, 250, 10.5);
  let n = party.length;
  const partyRows: { k: string; v: string }[] = [];
  for (const l of m.party.lines) {
    const lines = ink.wrap(`${l.k} ${l.v}`, 250, 9);
    n += lines.length;
    partyRows.push(l);
  }
  const bottom = 226 + party.length * 14 + (n - party.length) * 13.4 + 16;
  return { tableTop: Math.max(290, Math.ceil(bottom)), party, partyRows };
}

function drawHeader(page: PDFPage, ink: Ink, m: DocModel, fonts: Fonts, logo: PDFImage | null): { tableTop: number } {
  /* logo tile */
  if (logo) {
    page.drawImage(logo, { x: 35, y: H - 38 - 105, width: 105, height: 105 });
    // round the tile's corners by laying white corner pieces over it
    const r = 14;
    const white = rgb(1, 1, 1);
    const [x0, y0, x1, y1] = [35, 38, 140, 143];
    for (const d of [`M ${x0 - 0.5} ${y0 - 0.5} H ${x0 + r} A ${r} ${r} 0 0 0 ${x0 - 0.5} ${y0 + r} Z`, `M ${x1 + 0.5} ${y0 - 0.5} H ${x1 - r} A ${r} ${r} 0 0 1 ${x1 + 0.5} ${y0 + r} Z`, `M ${x0 - 0.5} ${y1 + 0.5} H ${x0 + r} A ${r} ${r} 0 0 1 ${x0 - 0.5} ${y1 - r} Z`, `M ${x1 + 0.5} ${y1 + 0.5} H ${x1 - r} A ${r} ${r} 0 0 0 ${x1 + 0.5} ${y1 - r} Z`]) page.drawSvgPath(d, { x: 0, y: H, color: white });
  } else box(page, 35, 38, 105, 105, { fill: BLACK, r: 14 });

  /* shop details */
  ink.text(m.shop.name, 161, 47.5, 22.5, "b", { font: fonts.serif });
  if (m.shop.gstin) {
    ink.text("GSTIN", 161, 77, 9, "s");
    ink.text(m.shop.gstin, 161 + ink.width("GSTIN ", 9, "s"), 77, 9);
  }
  // a phone and a pin, drawn as gold icons
  page.drawSvgPath("M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z", { x: 160.5, y: H - 90.5, scale: 0.5, color: GOLD });
  ink.text(m.shop.phone, 177, 94, 10.5, "r");
  page.drawSvgPath("M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z", { x: 158.5, y: H - 111.5, scale: 0.55, color: GOLD });
  page.drawCircle({ x: 165.1, y: H - 116.3, size: 1.5, color: rgb(1, 1, 1) });
  let ay = 115;
  for (const l of ink.wrap(m.shop.address, 372, 9)) {
    ink.text(l, 177, ay, 9);
    ay += 11;
  }

  /* title and stamp */
  ink.text(m.title, 556, 44.5, 12.8, "b", { align: "r" });
  box(page, 456, 61, 100, 15, { border: rgb(0.62, 0.62, 0.68), bw: 0.6, r: 2 });
  ink.text(m.stamp, 506, 65, 6.8, "r", { align: "c", color: GREY });

  line(page, FRAME.l, 158, FRAME.r, 158);

  /* invoice number and date */
  let fx = 35;
  for (const f of m.facts) {
    ink.text(f.k, fx, 172, 9, "b");
    ink.text(f.v, fx, 186, 9);
    fx += Math.max(102, ink.width(f.v, 9) + 20);
  }
  line(page, FRAME.l, 209, FRAME.r, 209);

  /* bill to */
  const h = headerLayout(ink, m);
  ink.text(m.partyLabel, 35, 225, 10.5, "b");
  let py = 240;
  for (const l of h.party) {
    ink.text(l, 35, py, 10.5);
    py += 14;
  }
  for (const l of h.partyRows) {
    const lines = ink.wrap(`${l.k} ${l.v}`, 250, 9);
    lines.forEach((t, i) => {
      if (i === 0) {
        ink.text(l.k, 35, py, 9, "s");
        ink.text(t.slice(l.k.length + 1), 35 + ink.width(`${l.k} `, 9, "s"), py, 9);
      } else ink.text(t, 35, py, 9);
      py += 13.4;
    });
  }
  line(page, 298, 209, 298, h.tableTop, 0.8);
  return { tableTop: h.tableTop };
}
