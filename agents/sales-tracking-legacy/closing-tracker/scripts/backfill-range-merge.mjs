#!/usr/bin/env node
/**
 * Backfill Closing Tracker for a date range with MERGE (preserve manual fields if present)
 * Usage: node agents/closing-tracker/scripts/backfill-range-merge.mjs --from=2026-02-01 --to=2026-03-18
 */
import '../../_shared/env-loader.mjs'
import { getClosingData } from '../lib/get-closing-data.mjs'
import { readSheet, updateRange } from '../../_shared/google-sheets/index.mjs'
import { buildRow, rowKey, apptKey, mergeManualCols, dateRange, sortRowsDesc } from '../lib/row-builder.mjs'

const SPREADSHEET_ID = '1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'
const SHEET_NAME = 'All Booked Calls Data'

const args = Object.fromEntries(process.argv.slice(2).map(p => p.split('=')))
const FROM = args['--from']
const TO = args['--to']
if (!FROM || !TO) { console.error('Missing --from or --to (YYYY-MM-DD)'); process.exit(1) }

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  // 1) Snapshot current sheet to preserve manual fields
  const existing = await readSheet({ spreadsheetId: SPREADSHEET_ID, range: `'${SHEET_NAME}'!A1:R10000` })
  const rows = existing.values?.slice(1) || []
  const preserve = new Map()
  for (const r of rows) { if (!r || !r.length) continue; preserve.set(rowKey(r), r) }

  // 2) Build new rows from source systems
  const out = new Map()
  let total = 0, showed = 0, noshow = 0
  for (const day of dateRange(FROM, TO)) {
    try {
      const r = await getClosingData(day)
      total += r.appointments.length; showed += r.summary.showed; noshow += r.summary.noShow
      for (const appt of r.appointments) {
        const key = apptKey(r.date, appt)
        out.set(key, mergeManualCols(buildRow(r.date, appt), preserve.get(key)))
      }
    } catch (e) { console.log(`${day} warn: ${e.message}`) }
    await sleep(400)
  }

  const finalRows = sortRowsDesc(Array.from(out.values()))
  await updateRange({ spreadsheetId: SPREADSHEET_ID, range: `'${SHEET_NAME}'!A2:R`, values: finalRows })
  console.log(`✅ Merge backfill complete (${FROM}→${TO}). Appointments=${total} (showed=${showed}, no-show=${noshow}). Preserved manual fields where present.`)
}

main().catch(e => { console.error('Failed:', e); process.exit(1) })
