#!/usr/bin/env node
import '../../_shared/env-loader.mjs'
import { readSheet, updateRange } from '../../_shared/google-sheets/index.mjs'

const SPREADSHEET_ID = '1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'
const SHEET = 'All Booked Calls Data'

function parseUSDate(s) {
  const m = s && s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const [, mm, dd, yyyy] = m
  return new Date(+yyyy, +mm - 1, +dd)
}

async function main() {
  const res = await readSheet({ spreadsheetId: SPREADSHEET_ID, range: `'${SHEET}'!A1:R10000` })
  const values = res.values || []
  if (values.length < 2) {
    console.log('Nothing to sort')
    return
  }
  const header = values[0]
  const rows = values.slice(1).filter(r => r.length && r[0])

  rows.sort((a, b) => {
    const da = parseUSDate(a[0]) || new Date(0)
    const db = parseUSDate(b[0]) || new Date(0)
    if (db - da !== 0) return db - da
    const ta = a[15] ? Date.parse(a[15]) : 0
    const tb = b[15] ? Date.parse(b[15]) : 0
    return tb - ta
  })

  await updateRange({ spreadsheetId: SPREADSHEET_ID, range: `'${SHEET}'!A2:R`, values: rows })
  console.log('✅ Sorted by Date (desc), most recent at top')
}

main().catch(err => { console.error('Error:', err.message); process.exit(1) })
