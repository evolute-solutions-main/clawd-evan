# Sales Tracking — Legacy Scripts (Archived)

The scripts in `scripts_archive/` are deprecated. They wrote to Google Sheets or manipulated Excel files as the source of truth. That approach is replaced by the JSON-first data layer.

**Do not run these.** They will write stale data to spreadsheets and create conflicts with the canonical JSON databases.

---

## What replaced them

| Old approach | New approach |
|---|---|
| Google Sheets as source of truth | `data/sales_data.json`, `data/expenses.json`, `data/transactions.json` |
| Sheet-writer scripts | Edit JSON directly, run `node scripts/inject-and-open.mjs` |
| Excel merges / sync scripts | `node scripts/build-unified-expenses.mjs` (rebuild expenses from raw sources) |
| Manual sheet queries | `node agents/data-analysis/scripts/query.mjs --metric=<name>` |

See `DATA_LAYER_HOWTO.md` for the current workflow.

---

## Archived scripts

| Script | What it did |
|---|---|
| `cleanup-coldsms-setter-smart.mjs` | Cleaned up setter assignments in Google Sheets |
| `cleanup-coldsms-setter.mjs` | Earlier version of same |
| `reorder-all-booked-calls.mjs` | Reordered rows in the All Booked Calls sheet |
| `sync-excel-to-google.js` / `.mjs` | Synced Excel data to Google Sheets |
| `merge-excel-outcomes.mjs` | Merged Y_cleaned_v4.xlsx outcomes into appointment data |
| `diff-2026-vs-yplus.mjs` | Diffed two sheet versions |
| `find-adds-and-updates.mjs` | Found new/changed rows across sheet versions |
| `sheet-only-tests.mjs` | Sheet-specific tests |
| `peek-headers.mjs` | Inspected sheet headers |
