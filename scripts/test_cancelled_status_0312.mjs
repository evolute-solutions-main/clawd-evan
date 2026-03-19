import '../agents/_shared/env-loader.mjs'
import { readSheet } from '../agents/_shared/google-sheets/index.mjs'
import * as GHL from '../agents/_shared/ghl/index.mjs'

const SHEET_ID='1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'
const RANGE="'All Booked Calls Data'!A1:R2000"
const DAY='2026-03-12' // ISO for GHL
const DAY_US='03/12/2026' // Sheet format

function norm(s){ return (s||'').toString().trim().toLowerCase().replace(/\s+/g,' ') }

// Load sheet
const res = await readSheet({ spreadsheetId: SHEET_ID, range: RANGE })
const rows = res.values||[]
const data = rows.slice(1).map((r,i)=>({i:i+2,r})) // i = sheet row number
const IDX = { Date:0, Lead:2, Status:6 }
const dayRows = data.filter(x=> (x.r[IDX.Date]||'').toString().trim()===DAY_US )

// Load GHL for two calendars
const CALS = [ GHL.CALENDARS.COLD_SMS, GHL.CALENDARS.META_INBOUND ]
const appts = []
for(const cal of CALS){
  try{
    const r = await GHL.getCalendarAppointments(cal, DAY)
    appts.push(...r.appointments.map(a=>({ name:a.contactName||'', status:(a.status||'').toLowerCase() })))
  }catch(e){ /* ignore single cal errors */ }
}

// Filter cancelled
const cancelled = appts.filter(a=>a.status==='cancelled')

// Match by fuzzy name in same day
function match(a){
  const t = norm(a.name)
  let best = null
  for(const x of dayRows){
    const lead = norm(x.r[IDX.Lead])
    if(!t || !lead) continue
    if(lead.includes(t) || t.includes(lead)) { best = x; break }
  }
  return best
}

const findings = []
for(const a of cancelled){
  const hit = match(a)
  if(!hit){ findings.push({ type:'missing_row', name:a.name }) ; continue }
  const have = (hit.r[IDX.Status]||'').toString().trim()
  const want = 'Cancelled/Rejected'
  if(have.toLowerCase()!==want.toLowerCase()){
    findings.push({ type:'status_mismatch', row: hit.i, date: DAY_US, name: hit.r[IDX.Lead], have, want })
  }
}

console.log(JSON.stringify({ test:'ghl_cancelled_status', day:DAY_US, total_cancelled: cancelled.length, issues: findings }, null, 2))
