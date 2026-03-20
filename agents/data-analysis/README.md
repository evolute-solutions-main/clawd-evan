# Data Analysis Agent

Read-only CLI for Evolute Solutions business analytics. Reads from `data/*.json`, outputs a single JSON object to stdout. No writes, no external dependencies.

## Usage

```bash
node agents/data-analysis/scripts/query.mjs --metric=<name> [options]
```

### Options

| Flag | Description |
|---|---|
| `--metric` | Required. One of: `revenue`, `show-rate`, `cac`, `roas`, `p&l`, `ltv` |
| `--from YYYY-MM-DD` | Window start date |
| `--to YYYY-MM-DD` | Window end date |
| `--month YYYY-MM` | Shorthand for a full calendar month (sets `--from` / `--to`) |
| `--source` | `"Ads"` or `"Cold SMS"` — filters appointments by calendar/channel |
| `--human` | Print a human-readable summary before the JSON |

---

## Examples

```bash
# Revenue summary Feb–Mar 2026
node agents/data-analysis/scripts/query.mjs --metric=revenue --from 2026-02-01 --to 2026-03-18

# Cold SMS show rate Feb–Mar 2026
node agents/data-analysis/scripts/query.mjs --metric=show-rate --source "Cold SMS" --from 2026-02-01 --to 2026-03-18

# Ads CAC Feb–Mar 2026
node agents/data-analysis/scripts/query.mjs --metric=cac --source Ads --from 2026-02-01 --to 2026-03-18

# P&L for March 2026 (quote & in shell)
node agents/data-analysis/scripts/query.mjs --metric="p&l" --month 2026-03

# ROAS for Ads, all time
node agents/data-analysis/scripts/query.mjs --metric=roas --source Ads

# Client LTV rankings
node agents/data-analysis/scripts/query.mjs --metric=ltv

# Human-readable output + JSON
node agents/data-analysis/scripts/query.mjs --metric=revenue --from 2026-01-01 --to 2026-03-31 --human
```

---

## Metrics

### `revenue`
Counts and cash totals for a date window.
```json
{
  "booked": 200, "showed": 46, "closed": 15,
  "cashCollected": 34000, "contractRevenue": 75800,
  "avgCashPerClose": 2267
}
```

### `show-rate`
Show rate overall and broken down by setter. Formula: `showed / (showed + noShow + cancelled)` — excludes unconfirmed (`new`).
```json
{ "showRate": 0.385, "showRatePct": "38.5%", "bySetter": [...] }
```

### `cac`
Cost per acquisition. Uses `expenses.json` where `excludeFromCAC=false`, filtered by channel if `--source` provided.
```json
{ "closes": 3, "spend": 3065.70, "cac": 1021.90 }
```

### `roas`
Return on ad spend. `cashCollected / spend` for the window.
```json
{ "cashCollected": 34000, "spend": 3065.70, "roas": 11.09, "roasX": "11.09x" }
```

### `p&l`
Revenue (`transactions.json`) minus expenses (`expenses.json`) with monthly breakdown.
```json
{ "revenue": 15900, "expenses": 10776, "profit": 5124, "margin": "32.2%", "byMonth": [...] }
```

### `ltv`
All clients ranked by total cash paid. Groups by normalized name + email.
```json
{ "clientCount": 48, "avgLTV": 5831, "clients": [{ "name": "...", "total": 12000 }] }
```

---

## Routing rule (for Evan)

Any business performance question → run the relevant metric command, read the JSON output, answer from it.

Do NOT create new output files. Do NOT hand-edit the dashboard. Do NOT ask Max to provide data that's already in `data/`.

If outcome changes (e.g. "John showed and didn't close"):
1. Update `data/sales_data.json` → set `status: "not_closed"`, add closer/cash if known
2. Run `node scripts/inject-and-open.mjs` to rebuild the dashboard
