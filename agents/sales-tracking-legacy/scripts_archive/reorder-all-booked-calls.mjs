import '../agents/_shared/env-loader.mjs'
import { readSheet, updateRange, getSpreadsheetInfo, batchUpdate } from '../agents/_shared/google-sheets/index.mjs'

const SPREADSHEET_ID = '1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'
const TAB_TITLE = 'All Booked Calls Data'
const RANGE = `'${TAB_TITLE}'!A1:R3000`
const CANONICAL = [
  'Date', 'ID', 'Client / Lead Name', 'Source', 'Setter', 'Status', 'Outcome', 'Closer',
  'Cash Collected', 'Revenue', 'Follow Up?', 'Offer Made', 'Notes / Follow-up',
  'Fathom Link', 'Entered By', 'Entry Timestamp', 'MonthNum', 'Year'
]

function buildIndexMap(curr) {
  const idxByKey = {}
  const norm = s => (s || '').toString().trim().toLowerCase()
  const currNorm = curr.map(norm)
  CANONICAL.forEach((h, i) => {
    const ni = currNorm.indexOf(norm(h))
    idxByKey[i] = ni >= 0 ? ni : -1
  })
  return idxByKey
}

async function main() {
  const res = await readSheet({ spreadsheetId: SPREADSHEET_ID, range: RANGE })
  const values = res.values || []
  if (!values.length) throw new Error('no values')
  const header = values[0]
  const rows = values.slice(1)

  // Backup tab
  const info = await getSpreadsheetInfo({ spreadsheetId: SPREADSHEET_ID })
  const sheet = (info.sheets || []).find(s => s.properties.title === TAB_TITLE)
  if (!sheet) throw new Error('tab not found')
  const backupTitle = `${TAB_TITLE} — Backup ${new Date().toISOString().slice(0, 10)}`
  await batchUpdate({ spreadsheetId: SPREADSHEET_ID, requests: [{ duplicateSheet: { sourceSheetId: sheet.properties.sheetId, insertSheetIndex: (info.sheets || []).length, newSheetName: backupTitle } }] })

  // Reorder
  const map = buildIndexMap(header)
  const reordered = [CANONICAL]
  for (const r of rows) {
    const out = new Array(CANONICAL.length).fill('')
    for (let i = 0; i < CANONICAL.length; i++) {
      const srcIdx = map[i]
      if (srcIdx >= 0) out[i] = r[srcIdx] || ''
    }
    reordered.push(out)
  }

  // Write back (A..R)
  await updateRange({ spreadsheetId: SPREADSHEET_ID, range: RANGE, values: reordered })

  // Reset conditional formatting: highlight Outcome (column G, index 6) when F=Showed and G is blank
  const delReqs = [{ deleteConditionalFormatRule: { sheetId: sheet.properties.sheetId, index: 0 } }]
  for (let i = 1; i < 6; i++) delReqs.push({ deleteConditionalFormatRule: { sheetId: sheet.properties.sheetId, index: 0 } })
  await batchUpdate({ spreadsheetId: SPREADSHEET_ID, requests: delReqs }).catch(() => {})
  const formula = '=AND($F2="Showed",LEN($G2)=0)'
  await batchUpdate({ spreadsheetId: SPREADSHEET_ID, requests: [
    { addConditionalFormatRule: { index: 0, rule: { ranges: [{ sheetId: sheet.properties.sheetId, startRowIndex: 1, startColumnIndex: 6, endColumnIndex: 7 }], booleanRule: { condition: { type: 'CUSTOM_FORMULA', values: [{ userEnteredValue: formula }] }, format: { backgroundColor: { red: 1, green: 1, blue: 0 } } } } } }
  ] })

  console.log(JSON.stringify({ backupTitle, rowsWritten: reordered.length }))
}

main().catch(e => { console.error('ERR', e.message || e); process.exit(1) })
