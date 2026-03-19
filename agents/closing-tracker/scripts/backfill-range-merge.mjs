#!/usr/bin/env node
/**
 * Backfill Closing Tracker for a date range with MERGE (preserve manual fields if present)
 * Usage: node agents/closing-tracker/scripts/backfill-range-merge.mjs --from=2026-02-01 --to=2026-03-18
 */
import '../../_shared/env-loader.mjs'
import { getClosingData } from '../lib/get-closing-data.mjs'
import { readSheet, updateRange } from '../../_shared/google-sheets/index.mjs'

const SPREADSHEET_ID = '1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'
const SHEET_NAME = 'All Booked Calls Data'

const args = Object.fromEntries(process.argv.slice(2).map(p=>p.split('=')))
const FROM = args['--from']
const TO = args['--to']
if (!FROM || !TO) { console.error('Missing --from or --to (YYYY-MM-DD)'); process.exit(1) }

function formatDate(dateStr) { const [y,m,d]=dateStr.split('-'); return `${m}/${d}/${y}` }
function getMonthNum(dateStr){ return parseInt(dateStr.split('-')[1]) }
function getYear(dateStr){ return parseInt(dateStr.split('-')[0]) }

// Build a merge key using Appointment ID when available; else Date+Name+Source
function sheetKey(row){
  const id = (row[1]||'').trim()
  if (id) return 'id:' + id
  const date = (row[0]||'').trim()
  const name = (row[2]||'').trim()
  const source = (row[3]||'').trim()
  return `dns:${date}|${name}|${source}`
}

function apptKey(dateStr, appt){
  const id = (appt.id||'').trim()
  if (id) return 'id:' + id
  return `dns:${formatDate(dateStr)}|${(appt.contactName||'').trim()}|${(appt.calendarName||'').trim()}`
}

// Manual columns we PRESERVE if existing non-empty: G..M (6..12)
const MANUAL_COLS = [6,7,8,9,10,11,12]

function toRow(dateStr, appt){
  const source = appt.calendarName || 'Unknown'
  const setter = (()=>{
    if (source === 'Meta Inbound') return 'Ads - No Setter'
    const m = { 'GheOd0K8eB8qosL2Z8RP':'Max', 'ddUpjf6Fj9k9efSf874G':'Eddie', 'YQcDJN2MiXUJfaAiKqyj':'Daniel', 'VwnP4BSH4oQR6yWOaV4Q':'Randy', 'KHUC7ccubjjmR4sV5DOa':'Richard' }
    const uid = appt.createdBy?.userId
    return (uid && m[uid]) ? m[uid] : 'Ads - No Setter'
  })()
  const status = appt.showStatus === 'showed' ? 'Showed' : 'No-Show'
  const fathomLink = appt.matchedFathomCall?.recordingUrl || ''
  return [
    formatDate(dateStr),            // A Date
    appt.id || '',                  // B ID
    appt.contactName || '',         // C Client / Lead Name
    source,                         // D Source
    setter,                         // E Setter
    status,                         // F Status
    '', '', '', '', '', '', '',     // G..M manual columns blank by default
    fathomLink,                     // N Fathom Link
    'Evan (Auto)',                  // O Entered By
    new Date().toISOString(),       // P Entry Timestamp
    getMonthNum(dateStr),           // Q MonthNum
    getYear(dateStr),               // R Year
  ]
}

function* dateRange(from, to){
  const start = new Date(from+'T00:00:00Z'); const end = new Date(to+'T00:00:00Z')
  for(let d=new Date(start); d<=end; d=new Date(d.getTime()+86400000)) yield d.toISOString().slice(0,10)
}

async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)) }

async function main(){
  // 1) Snapshot current sheet to preserve manual fields
  const existing = await readSheet({ spreadsheetId: SPREADSHEET_ID, range: `'${SHEET_NAME}'!A1:R10000` })
  const header = existing.values?.[0] || []
  const rows = existing.values?.slice(1) || []
  const preserve = new Map()
  for (const r of rows){ if (!r || !r.length) continue; preserve.set(sheetKey(r), r) }

  // 2) Build new rows from source systems
  const out = new Map()
  let total=0, showed=0, noshow=0
  for (const day of dateRange(FROM, TO)){
    try{
      const r = await getClosingData(day)
      total += r.appointments.length; showed += r.summary.showed; noshow += r.summary.noShow
      for(const appt of r.appointments){
        const key = apptKey(r.date, appt)
        const base = toRow(r.date, appt)
        // Merge: if we have existing manual values for this key, fill them in
        const prev = preserve.get(key)
        if (prev){
          for (const c of MANUAL_COLS){ if ((prev[c]||'').toString().trim()) base[c] = prev[c] }
        }
        out.set(key, base)
      }
    }catch(e){ console.log(`${day} warn: ${e.message}`) }
    await sleep(400)
  }

  const finalRows = Array.from(out.values())
  finalRows.sort((a,b)=>{ const da=new Date(a[0]); const db=new Date(b[0]); if (db-da!==0) return db-da; const ta=Date.parse(a[15]||''); const tb=Date.parse(b[15]||''); return (tb||0)-(ta||0) })

  await updateRange({ spreadsheetId: SPREADSHEET_ID, range: `'${SHEET_NAME}'!A2:R`, values: finalRows })
  console.log(`✅ Merge backfill complete (${FROM}→${TO}). Appointments=${total} (showed=${showed}, no-show=${noshow}). Preserved manual fields where present.`)
}

main().catch(e=>{ console.error('Failed:', e); process.exit(1) })
