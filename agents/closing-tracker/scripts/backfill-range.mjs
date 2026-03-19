#!/usr/bin/env node
/**
 * Backfill Closing Tracker for a date range, replacing sheet rows (no duplicates)
 * Usage: node agents/closing-tracker/scripts/backfill-range.mjs --from=2026-02-01 --to=2026-03-18
 */
import '../../_shared/env-loader.mjs'
import { getClosingData } from '../lib/get-closing-data.mjs'
import { updateRange } from '../../_shared/google-sheets/index.mjs'
import { buildRow, apptKey, dateRange, sortRowsDesc } from '../lib/row-builder.mjs'

const SPREADSHEET_ID = '1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'
const SHEET_NAME = 'All Booked Calls Data'

const args = Object.fromEntries(process.argv.slice(2).map(p => p.split('=')))
const FROM = args['--from']
const TO = args['--to']
if (!FROM || !TO) {
  console.error('Missing --from or --to (YYYY-MM-DD)')
  process.exit(1)
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  console.log(`Backfilling ${FROM} → ${TO}`)
  const map = new Map()
  let totalAppts = 0, totalShowed = 0, totalNoShow = 0

  for (const day of dateRange(FROM, TO)) {
    try {
      const r = await getClosingData(day)
      totalAppts += r.appointments.length
      totalShowed += r.summary.showed
      totalNoShow += r.summary.noShow
      for (const appt of r.appointments) {
        map.set(apptKey(r.date, appt), buildRow(r.date, appt))
      }
    } catch (e) {
      console.log(`  ${day} error: ${e.message}`)
    }
    await sleep(500)
  }

  const rows = sortRowsDesc(Array.from(map.values()))
  console.log(`Collected ${rows.length} unique rows from ${totalAppts} appts (${totalShowed} showed, ${totalNoShow} no-show)`)

  await updateRange({ spreadsheetId: SPREADSHEET_ID, range: `'${SHEET_NAME}'!A2:R`, values: rows })
  console.log('✅ Sheet replaced with backfilled data (no duplicates)')
}

main().catch(e => { console.error('Failed:', e); process.exit(1) })
