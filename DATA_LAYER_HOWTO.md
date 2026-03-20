# DATA_LAYER_HOWTO.md — Evolute Data Layer

All business analytics read from `data/*.json`. The HTML dashboard is generated-only — never hand-edit it.

---

## The Three Files

| File | Contents |
|---|---|
| `data/sales_data.json` | `{ appointments: [...], dials: [...] }` — every GHL appointment with status, outcome, setter, closer, cash, revenue |
| `data/expenses.json` | 1,066 expense entries — ad spend, payroll, software, consulting. Each tagged with `category`, `channel`, `excludeFromCAC` |
| `data/transactions.json` | 153 client payments (Stripe + Fanbasis) — email, name, amount, net, date |

Source of channel for appointments: `calendarName` field — `"Cold SMS"` or `"AI Strategy Session (Meta Inbound)"` (Ads).
Source of channel for expenses: `channel` field — `"ads"`, `"cold_sms"`, `"fulfillment"`, or `null`.

---

## Running Analytics

Use the query CLI. It reads JSON, outputs JSON. No writes.

```bash
# Revenue
node agents/data-analysis/scripts/query.mjs --metric=revenue --from 2026-01-01 --to 2026-03-31

# Show rate by setter (Cold SMS only)
node agents/data-analysis/scripts/query.mjs --metric=show-rate --source "Cold SMS" --from 2026-01-01 --to 2026-03-31

# CAC for Ads
node agents/data-analysis/scripts/query.mjs --metric=cac --source Ads --from 2026-01-01 --to 2026-03-31

# ROAS for Cold SMS
node agents/data-analysis/scripts/query.mjs --metric=roas --source "Cold SMS" --from 2026-01-01 --to 2026-03-31

# Monthly P&L (quote the &)
node agents/data-analysis/scripts/query.mjs --metric="p&l" --month 2026-03

# Client LTV rankings
node agents/data-analysis/scripts/query.mjs --metric=ltv

# Human-readable output
node agents/data-analysis/scripts/query.mjs --metric=revenue --from 2026-01-01 --to 2026-03-31 --human
```

Full docs: `agents/data-analysis/README.md`

---

## Syncing New Appointments from GHL

Pull the latest appointments from GoHighLevel into `data/sales_data.json`:

```bash
node scripts/fetch-raw-appts.mjs --from 2026-03-01 --to 2026-03-31
```

Safe to run repeatedly — upserts only, never overwrites outcome fields (closer, cash, revenue, etc.).

---

## Finding Data Gaps

Check which past appointments are missing outcome data:

```bash
node scripts/check-gaps.mjs
```

Outputs groups: showed-but-no-outcome, closed-but-no-cash, stale status, no closer recorded.

---

## Updating Appointment Outcomes

**Interactive (recommended):** Walk through all gaps and fill them in:

```bash
node scripts/log-outcome.mjs
node scripts/log-outcome.mjs --from 2026-03-01   # limit by date
node scripts/log-outcome.mjs --name "John Smith"  # single contact
```

Saves updates and rebuilds the dashboard automatically.

**Manual:** Edit `data/sales_data.json` directly:
1. Find the appointment by `contactName` and approximate `startTime`
2. Update `status` → `"closed"` | `"not_closed"` | `"no_show"` | `"cancelled"`
3. Add `closer`, `cashCollected`, `cashCollectedAfterFirstCall`, `contractRevenue`, `followUpBooked` if known
4. Rebuild dashboard: `node scripts/inject-and-open.mjs`

Status values: `new` → `confirmed` → `showed` → `closed | not_closed`. Also: `cancelled`, `no_show`.

---

## Updating Expenses

Add an entry to `data/expenses.json`:

```json
{
  "id": "exp_unique_id",
  "date": "YYYY-MM-DD",
  "vendor": "Vendor Name",
  "description": "What it was for",
  "amount": 1234.56,
  "category": "ad_spend | software | payroll | consulting | other",
  "channel": "ads | cold_sms | fulfillment | null",
  "department": "Setter | Closer | Media Buyer | null",
  "excludeFromCAC": false,
  "source": "manual"
}
```

`excludeFromCAC: true` = fulfillment/overhead — excluded from CAC and ROAS calculations.

Then run: `node scripts/inject-and-open.mjs`

---

## Updating Client Payments

Add an entry to `data/transactions.json`:

```json
{
  "email": "client@example.com",
  "name": "Client Name",
  "amount": 4000,
  "net": 3884,
  "fee": 116,
  "date": "YYYY-MM-DD",
  "source": "stripe | fanbasis | manual | venmo"
}
```

---

## Dashboard

`sales_tracker.html` is generated — do not hand-edit. Rebuilt by:

```bash
node scripts/inject-and-open.mjs
```

This regex-replaces all data constants in the HTML from the JSON files and opens the dashboard in the browser.

---

## Routing Rule for Evan

Any business performance question (revenue, CAC, show rate, LTV, P&L, expenses) → **read `data/*.json` first, compute the answer**. Use the query CLI. Do not ask Max to provide data that's already in these files. Do not generate your own output files for analytics.

Outcome changes → update `data/sales_data.json` → run inject script.

When uncertain about a call outcome (did they close? did they show?): run `node scripts/check-gaps.mjs`, surface the gaps to Max, and ask him to fill in the missing data. Do not guess or assume outcomes. Use `node scripts/log-outcome.mjs` to record his answers interactively.
