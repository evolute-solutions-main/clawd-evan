#!/usr/bin/env node
/**
 * Backfill Closing Tracker for a date range, replacing sheet rows (no duplicates)
 * Usage: node agents/closing-tracker/scripts/backfill-range.mjs --from=2026-02-01 --to=2026-03-18
 */
import '../../_shared/env-loader.mjs'
import { getClosingData } from '../lib/get-closing-data.mjs'
import { updateRange } from '../../_shared/google-sheets/index.mjs'

const SPREADSHEET_ID = '1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'
const SHEET_NAME = 'All Booked Calls Data'

const args = Object.fromEntries(process.argv.slice(2).map(p=>p.split('=')))
const FROM = args['--from']
const TO = args['--to']
if (!FROM || !TO) {
  console.error('Missing --from or --to (YYYY-MM-DD)')
  process.exit(1)
}

function formatDate(dateStr) {
  const [y,m,d] = dateStr.split('-')
  return `${m}/${d}/${y}`
}
function getMonthNum(dateStr) { return parseInt(dateStr.split('-')[1]) }
function getYear(dateStr) { return parseInt(dateStr.split('-')[0]) }

function toKey({dateStr, appt}) {
  // Key by date + contact + calendar + startTime (unique enough)
  return [dateStr, appt.contactName||'', appt.calendarId||'', appt.startTime||''].join('|')
}

function toRow({dateStr, appt}) {
  const source = appt.calendarName || 'Unknown'
  const setter = (()=>{
    if (source === 'Meta Inbound') return 'Ads - No Setter'
    const m = {
      'GheOd0K8eB8qosL2Z8RP': 'Max',
      'ddUpjf6Fj9k9efSf874G': 'Eddie',
      'YQcDJN2MiXUJfaAiKqyj': 'Daniel',
      'VwnP4BSH4oQR6yWOaV4Q': 'Randy',
      'KHUC7ccubjjmR4sV5DOa': 'Richard',
    }
    const uid = appt.createdBy?.userId
    if (uid && m[uid]) return m[uid]
    return 'Ads - No Setter'
  })()
  const status = appt.showStatus === 'showed' ? 'Showed' : 'No-Show'
  const fathomLink = appt.matchedFathomCall?.recordingUrl || ''
  return [
    formatDate(dateStr),
    appt.id || '',
    appt.contactName || '',
    source,
    setter,
    status,
    '', // Closer
    '', // Outcome
    '', // Cash Collected
    '', // Revenue
    '', // Follow Up?
    '', // Offer Made
    '', // Notes / Follow-up (manual)
    fathomLink,
    'Evan (Auto)',
    new Date().toISOString(),
    getMonthNum(dateStr),
    getYear(dateStr),
  ]
}

function* dateRange(from, to) {
  const start = new Date(from + 'T00:00:00Z')
  const end = new Date(to + 'T00:00:00Z')
  for (let d = new Date(start); d <= end; d = new Date(d.getTime()+86400000)) {
    yield d.toISOString().slice(0,10)
  }
}

async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)) }

async function main() {
  console.log(`Backfilling ${FROM} → ${TO}`)
  const map = new Map()
  let totalAppts = 0
  let totalShowed = 0
  let totalNoShow = 0

  for (const day of dateRange(FROM, TO)) {
    try {
      const r = await getClosingData(day)
      totalAppts += r.appointments.length
      totalShowed += r.summary.showed
      totalNoShow += r.summary.noShow
      for (const appt of r.appointments) {
        const key = toKey({dateStr: r.date, appt})
        // Apply filter: only keep appointments that passed sales-call matching (showed) or were scheduled (no-show) in tracked calendars
        // Note: getClosingData already filters non-sales fathom titles
        map.set(key, toRow({dateStr: r.date, appt}))
      }
    } catch (e) {
      console.log(`  ${day} error: ${e.message}`)
    }
    await sleep(500) // be gentle with APIs
  }

  const rows = Array.from(map.values())
  // Sort by date desc then timestamp desc
  rows.sort((a,b)=>{
    const da = new Date(a[0]); const db = new Date(b[0])
    if (db-da!==0) return db-da
    const ta = Date.parse(a[15]||''); const tb = Date.parse(b[15]||'')
    return (tb||0)-(ta||0)
  })

  console.log(`Collected ${rows.length} unique rows from ${totalAppts} appts (${totalShowed} showed, ${totalNoShow} no-show)`) 

  await updateRange({ spreadsheetId: SPREADSHEET_ID, range: `'${SHEET_NAME}'!A2:R`, values: rows })
  console.log('✅ Sheet replaced with backfilled data (no duplicates)')
}

main().catch(e=>{ console.error('Failed:', e); process.exit(1) })
