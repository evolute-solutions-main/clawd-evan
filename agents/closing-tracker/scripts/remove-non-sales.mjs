#!/usr/bin/env node
import '../../_shared/env-loader.mjs'
import { readSheet, updateRange } from '../../_shared/google-sheets/index.mjs'

const SPREADSHEET_ID = '1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'
const SHEET = 'All Booked Calls Data'

// Remove rows where Client / Lead Name (col C index 2) includes obvious non-sales markers
const DENY = ['promotion', 'reveal', 'highlevel']

async function main() {
  const res = await readSheet({ spreadsheetId: SPREADSHEET_ID, range: `'${SHEET}'!A1:R10000` })
  const values = res.values || []
  if (values.length < 2) {
    console.log('No data')
    return
  }
  const header = values[0]
  const rows = values.slice(1)

  const kept = []
  const removed = []
  for (const r of rows) {
    const name = (r[2] || '').toString().toLowerCase()
    if (DENY.some(w => name.includes(w))) {
      removed.push(r)
    } else {
      kept.push(r)
    }
  }

  await updateRange({ spreadsheetId: SPREADSHEET_ID, range: `'${SHEET}'!A2:R`, values: kept })
  console.log(`Removed ${removed.length} non-sales rows`)
}

main().catch(e => { console.error(e); process.exit(1) })
