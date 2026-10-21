# Cycle Wala Billing

Billing, invoices, staff attendance and payroll for **Cycle Wala** — a separate app from the shop website
(`../CW`). See [docs/ROADMAP.md](docs/ROADMAP.md) for what is built and what comes next.

## Run it

```bash
npm install
cp .env.example .env.local     # then fill it in (see below)
npm run dev                    # http://localhost:3000
```

In development, with `ADMIN_EMAIL` / `ADMIN_PASSWORD` left empty, sign in as
`owner@cyclewala.local` / `cyclewala-dev`. That login is ignored in production.

## Settings (`.env.local`)

| Variable | What it is |
|---|---|
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | The owner's login (password 10+ characters). Required in production |
| `SESSION_SECRET` | Long random string that signs the session cookie. Required in production |
| `MONGODB_URI`, `MONGODB_DB` | MongoDB connection (Atlas free tier works). Without it, data is saved as JSON files in `./data` (or `DATA_DIR`) so the app runs anywhere |
| `SHOP_SITE_URL` | The shop website (default `https://cyclewala.shop`). The Brand and model dropdowns on Items are read live from its catalogue, so new brands appear by themselves |
| `SMTP_USER`, `SMTP_PASS` | Gmail + app password, for emailing invoices. `MAIL_DRY_RUN=true` prints the email in the log instead of sending |

## Layout

```
app/login                 sign-in page
app/(app)/                everything behind the sign-in (sidebar + top bar)
app/(app)/dashboard       the dashboard
app/(app)/parties|items|invoices|payments|settings   Phase 1, built
app/(app)/staff|attendance|payroll                   Phase 2, built (payroll/slip/[staffId]/[month] is the salary slip)
app/(app)/[section]       placeholder pages for the modules still to come (quotations, purchases, reports)
app/i/[token]             the customer's public invoice link (no sign-in)
app/api/auth              sign in / sign out
lib/auth.ts               signed session cookie
lib/db.ts                 MongoDB connection
lib/store.ts              data layer: MongoDB or JSON files
lib/calc.ts               invoice totals and GST
lib/invoices.ts           numbering, stock, payments, ledgers
lib/payroll.ts            how salary is worked out from attendance (the pay rules live here)
lib/staff.ts              staff, attendance, advances and payroll storage
lib/types.ts              the data model: parties, items, invoices, payments, staff, attendance, payroll
lib/nav.ts                the module list that drives the sidebar and the roadmap
```
