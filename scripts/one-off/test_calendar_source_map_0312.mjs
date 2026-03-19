import '../agents/_shared/env-loader.mjs'
import { readSheet } from '../agents/_shared/google-sheets/index.mjs'
import * as GHL from '../agents/_shared/ghl/index.mjs'

const SHEET_ID='1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'
const RANGE="'All Booked Calls Data'!A1:R2000"
const DAY='2026-03-12'
const DAY_US='03/12/2026'

function norm(s){ return (s||'').toString().trim().toLowerCase().replace(/\s+/g,' ') }
function famToSource(f){ return f==='cold' ? 'Cold SMS' : 'Ads' }

// Load sheet rows for day
const res = await readSheet({ spreadsheetId: SHEET_ID, range: RANGE })
const rows = res.values||[]
const data = rows.slice(1).map((r,i)=>({i:i+2,r}))
const IDX = { Date:0, Lead:2, Source:4 }
const dayRows = data.filter(x=> (x.r[IDX.Date]||'').toString().trim()===DAY_US )

// Load GHL per calendar
const CALMAP = { cold: GHL.CALENDARS.COLD_SMS, meta: GHL.CALENDARS.META_INBOUND }
const appts=[]
for(const [fam, cal] of Object.entries(CALMAP)){
  try{
    const r = await GHL.getCalendarAppointments(cal, DAY)
    for(const a of (r.appointments||[])) appts.push({ fam, name:a.contactName||'' })
  }catch(e){}
}

// Match and compare source
function match(name){ const t=norm(name); return dayRows.find(x=>{ const lead=norm(x.r[IDX.Lead]); return t&&lead&&(lead.includes(t)||t.includes(lead)) }) }
const issues=[]
for(const a of appts){
  const hit = match(a.name)
  if(!hit) continue // only compare when we can match a row
  const have = (hit.r[IDX.Source]||'').toString().trim()
  const want = famToSource(a.fam)
  if(have && have.toLowerCase()!==want.toLowerCase()) issues.push({ row:hit.i, date:DAY_US, name:hit.r[IDX.Lead], have, want })
}

console.log(JSON.stringify({ test:'calendar_source_mapping', day:DAY_US, issues }, null, 2))
