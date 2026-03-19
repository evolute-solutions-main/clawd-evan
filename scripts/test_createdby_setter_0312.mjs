import '../agents/_shared/env-loader.mjs'
import { readSheet } from '../agents/_shared/google-sheets/index.mjs'
import * as GHL from '../agents/_shared/ghl/index.mjs'

const SHEET_ID='1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'
const RANGE="'All Booked Calls Data'!A1:R2000"
const DAY='2026-03-12' // ISO for GHL
const DAY_US='03/12/2026' // Sheet format

function norm(s){ return (s||'').toString().trim().toLowerCase().replace(/\s+/g,' ') }

// Load sheet rows for the day
const res = await readSheet({ spreadsheetId: SHEET_ID, range: RANGE })
const rows = res.values||[]
const data = rows.slice(1).map((r,i)=>({i:i+2,r}))
const IDX = { Date:0, Lead:2, Setter:5 }
const dayRows = data.filter(x=> (x.r[IDX.Date]||'').toString().trim()===DAY_US )

// Pull GHL (used just to assert there were appts that day; createdBy name mapping not guaranteed)
const CALS = [ GHL.CALENDARS.COLD_SMS, GHL.CALENDARS.META_INBOUND ]
let ghlCount=0
for(const cal of CALS){
  try{ const r = await GHL.getCalendarAppointments(cal, DAY); ghlCount += (r.appointments||[]).length }catch(e){}
}

// Flag rows with blank Setter; hint Daniel per your rule for this date
const issues = dayRows.filter(x=> !(x.r[IDX.Setter]||'').toString().trim()).map(x=>({ row:x.i, date:DAY_US, name:x.r[IDX.Lead]||'', expectedSetterHint:'Daniel' }))

console.log(JSON.stringify({ test:'createdby_setter_blank', day:DAY_US, ghlAppointments:ghlCount, issues }, null, 2))
