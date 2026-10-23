# Cycle Wala Billing — roadmap

A separate app from the Cycle Wala shop website. It does what a small-shop billing app (myBillBook-style) does,
shaped for a cycle shop: **invoices, parties, stock, payments, staff attendance, payroll and sending the invoice to the
customer.** It is built from scratch for Cycle Wala; it does not copy another product's code, branding or design.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind · MongoDB.

## Phase 1 — Billing core
- [x] Settings: shop profile (name, logo, address, GSTIN, UPI id), invoice prefix/numbering, terms
- [x] Parties: customers & suppliers, ledger per party, opening balance, credit limit
- [x] Items & stock: category, unit, prices, HSN, GST %, live stock, low-stock alert, services without stock
- [x] Sales invoice editor: party, lines, per-line discount, GST (CGST/SGST/IGST), round-off, notes, due date
- [x] Automatic invoice numbers, status (unpaid / partial / paid / cancelled)
- [x] The bill is a real A4 PDF in the shop's own layout (gold frame, logo tile, Bill To, item table, terms, totals, signature), named like SHASHANK_JOSHI_Sales_Invoice_0001.pdf; same layout on screen and in print. A5 and thermal-receipt layouts still to do
- [x] **Send to the customer:** email with the invoice PDF attached (needs SMTP_USER/SMTP_PASS), WhatsApp (the PDF is attached from a phone's share sheet; on a computer the message carries a link to it), copy a public invoice link. Still to do: SMS
- [x] Payments: payment-in against invoices, part payments, advances (payment-out to suppliers came with purchases in Phase 3)
- [x] Outstanding list with WhatsApp reminders (SMS still to do)
- [x] Owner sign-in, app shell, dashboard shell, data model (`lib/types.ts`)

## Phase 2 — Staff & attendance
- [x] Staff list: role, phone, joining date, salary (monthly / daily / hourly), active/inactive, advances
- [x] Daily attendance screen: present, absent, half-day, leave, week-off, holiday; in/out time, late, overtime; mark everyone present
- [x] Month grid for the whole team (tap a day to edit) with present / absent / half-day / leave counts
- [x] Payroll: salary from attendance, overtime, bonus, advances, deductions, salary slip (print/PDF), mark paid (locks the month)
- [x] Staff log in on their own phone (/staff-login) with a username and password the owner creates; they check in and out (server time, Indian time) and see their own month. They can never open owner pages or change a day the owner marked
- [ ] Optional: roles (manager, cashier) with limited access to the owner screens; late-arrival rules; location check on check-in

## Phase 3 — Purchases, quotations & reports
- [x] Quotations (QT-0001…): same editor as invoices, valid-until date, email / WhatsApp / link, convert to a sales invoice in one click (stock moves only then)
- [x] Purchase bills (PB-0001…): supplier's bill number, stock goes up and the buying price updates, part payment, payments out to suppliers (against a bill or the oldest bills first), supplier ledger, "to pay" on the dashboard
- [x] Reports: daily sales, by item / brand / customer, profit estimate, receivables & payables, GST summary (output vs input tax), stock value, attendance & payroll
- [x] Download any report as CSV (opens in Excel); print any report

## Decisions to make before Phase 1 invoice sending
1. **WhatsApp:** the free route is a `wa.me` link that opens WhatsApp with the invoice link ready to send (no cost, one tap per customer).
   Sending automatically from the server needs the WhatsApp Business Cloud API (a Meta business account; per-message charges apply).
2. **SMS:** needs a provider with DLT registration in India (e.g. MSG91, Fast2SMS) — cost per SMS.
3. **Email:** Gmail with an app password is enough to start (500/day limit).
4. **GST:** is the shop GST-registered? That decides whether invoices show GST, GSTIN and HSN codes.
