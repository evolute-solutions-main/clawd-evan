import '../agents/_shared/env-loader.mjs'
import { readSheet } from '../agents/_shared/google-sheets/index.mjs'
import * as GHL from '../agents/_shared/ghl/index.mjs'

const Y_ID='1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'
const RANGE="'All Booked Calls Data'!A1:R4000"
const DATE_FROM = Date.UTC(2026,1,1) // 2026-02-01
const DATE_TO   = Date.UTC(2026,2,18,23,59,59) // 2026-03-18

const CALS = {
  cold: GHL.CALENDARS.COLD_SMS,
  meta: GHL.CALENDARS.META_INBOUND,
  strategy: GHL.CALENDARS.INBOUND_STRATEGY
}

function norm(s){ return (s||'').toString().trim().toLowerCase().replace(/\s+/g,' ') }
function mapSource(s){ s=norm(s); if(s.includes('cold')) return 'cold sms'; if(s.includes('ads')||s.includes('meta')) return 'ads'; return s }
function parseUS(s){ if(!s) return null; const m=String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if(!m) return null; const mm=m[1].padStart(2,'0'),dd=m[2].padStart(2,'0'),yyyy=m[3]; return `${mm}/${dd}/${yyyy}` }
function dateToKey(ms){ const d=new Date(ms); const mm=String(d.getUTCMonth()+1).padStart(2,'0'); const dd=String(d.getUTCDate()).padStart(2,'0'); return `${mm}/${dd}/${d.getUTCFullYear()}` }

async function loadSheet(){
  const res = await readSheet({ spreadsheetId: Y_ID, range: RANGE })
  const rows = res.values||[]
  const header = rows[0]||[]
  const data = rows.slice(1).map((r,i)=>({ idx:i+2, r }))
  const headMap = Object.fromEntries(header.map((h,i)=>[h,i]))
  return { header, headMap, data }
}

function* days(fromMs,toMs){ for(let t=fromMs; t<=toMs; t+=86400000){ const d=new Date(t); const yyyy=d.getUTCFullYear(); const mm=String(d.getUTCMonth()+1).padStart(2,'0'); const dd=String(d.getUTCDate()).padStart(2,'0'); yield `${yyyy}-${mm}-${dd}` } }
async function loadGHL(from=DATE_FROM,to=DATE_TO){
  const all=[]
  for (const day of days(from,to)){
    for (const [family, id] of Object.entries(CALS)){
      const r = await GHL.getCalendarAppointments(id, day)
      for (const a of r.appointments){
        all.push({ family, id, name: a.contactName||'', status: (a.status||'').toLowerCase(), createdBy: (a.createdBy?.userId||'') || '', createdBySource: a.createdBy?.source||'', start: Date.parse(a.startTime) })
      }
    }
  }
  return all
}

async function test_cancelled_mapping(sheet, ghl){
  const findings=[]
  const si = sheet.headMap
  const rows = sheet.data
  const cancelled = ghl.filter(e=>e.status==='cancelled')
  for (const appt of cancelled){
    const day = dateToKey(appt.start)
    const family = appt.family==='cold'?'cold sms':'ads'
    const hit = rows.find(x=> parseUS(x.r[0])===day && mapSource(x.r[3])===family && norm(x.r[2]).includes(norm(appt.name)))
    if (!hit){ findings.push({ type:'missing_row', day, name: appt.name, source: family }) }
    else {
      const status = (x=> (x||'').toString().toLowerCase())(hit.r[5])
      if(!(status==='cancelled' || status==='rejected')){
        findings.push({ type:'status_mismatch', row: hit.idx, day, name: hit.r[2], have: hit.r[5]||'', want: 'Cancelled' })
      }
    }
  }
  return { name:'ghl_cancelled_updates_status', total:cancelled.length, issues: findings }
}

async function test_created_by_setter_on_031226(sheet, ghl){
  const dayKey='03/12/2026'
  const si = sheet.headMap
  const rows = sheet.data
  const dayRows = rows.filter(x=>parseUS(x.r[0])===dayKey)
  const appts = ghl.filter(e=>dateToKey(e.start)===dayKey)
  const issues=[]
  for (const a of appts){
    if(norm(a.createdBy)==='daniel'){
      const family = a.family==='cold'?'cold sms':'ads'
      const hit = dayRows.find(x=> mapSource(x.r[3])===family && norm(x.r[2]).includes(norm(a.name)))
      if (hit){
        const setter = norm(hit.r[4])
        if(!setter){ issues.push({ row: hit.idx, name: hit.r[2], expectedSetter: 'Daniel', reason:'createdBy Daniel with blank Setter' }) }
      }
    }
  }
  return { name:'setter_from_created_by_on_blank', day: dayKey, issues }
}

async function test_cold_sms_not_ads(sheet){
  const rows = sheet.data
  const issues=[]
  for(const x of rows){
    const source = mapSource(x.r[3])
    const setter = norm(x.r[4])
    if(source==='cold sms' && setter.includes('ads')) issues.push({ row:x.idx, date:x.r[0], lead:x.r[2], source:x.r[3], setter:x.r[4] })
  }
  return { name:'source_setter_consistency_coldsms_not_ads', issues }
}

async function test_fathom_for_showed(sheet){
  const hi = sheet.headMap
  const fathomIdx = hi['Fathom Link'] ?? Object.keys(hi).find(k=>norm(k).includes('fathom'))
  const rows = sheet.data
  const issues=[]
  for(const x of rows){
    const status = (x.r[5]||'').toString().toLowerCase()
    if(status==='showed'){
      const link = fathomIdx!=null ? (x.r[fathomIdx]||'') : ''
      if(!link){ issues.push({ row:x.idx, date:x.r[0], lead:x.r[2], reason:'Showed but missing Fathom link' }) }
    }
  }
  return { name:'fathom_showed_integrity', issues }
}

async function test_calendar_source_mapping(sheet, ghl){
  const issues=[]
  for(const a of ghl){
    const day = dateToKey(a.start)
    const fam = a.family==='cold'?'cold sms':'ads'
    const hit = sheet.data.find(x=> parseUS(x.r[0])===day && norm(x.r[2]).includes(norm(a.name)))
    if(hit){
      const have = mapSource(hit.r[3])
      if(have && have!==fam){ issues.push({ row: hit.idx, day, name: hit.r[2], have: hit.r[3], want: fam }) }
    }
  }
  return { name:'calendar_to_source_mapping_consistency', issues }
}

async function test_status_parity_with_ghl(sheet, ghl){
  const include = new Set(['showed','noshow','cancelled','rescheduled'])
  const exclude = new Set(['new','confirmed','unconfirmed'])
  const findings=[]
  // check excluded statuses: sheet shouldn't have new/unconfirmed
  for(const x of sheet.data){
    const st = (x.r[5]||'').toString().toLowerCase()
    if(exclude.has(st)) findings.push({ type:'sheet_should_exclude', row:x.idx, date:x.r[0], lead:x.r[2], status:x.r[5] })
  }
  // check parity on included ones present in GHL
  for(const a of ghl){
    const st=a.status
    if(!include.has(st)) continue
    const day = dateToKey(a.start)
    const fam = a.family==='cold'?'cold sms':'ads'
    const hit = sheet.data.find(x=> parseUS(x.r[0])===day && mapSource(x.r[3])===fam && norm(x.r[2]).includes(norm(a.name)))
    if(hit){
      const have = (hit.r[5]||'').toString().toLowerCase()
      const want = st==='noshow'?'no-show': (st==='rescheduled'?'Rescheduled': st.charAt(0).toUpperCase()+st.slice(1))
      if(have!==want.toLowerCase()) findings.push({ type:'status_mismatch', row:hit.idx, day, name:hit.r[2], have:hit.r[5]||'', want })
    }
  }
  return { name:'status_parity_with_ghl', issues: findings }
}

async function run(){
  const sheet = await loadSheet()
  const ghl = await loadGHL(DATE_FROM, DATE_TO)
  const results = []
  results.push(await test_cancelled_mapping(sheet, ghl))
  results.push(await test_created_by_setter_on_031226(sheet, ghl))
  results.push(await test_cold_sms_not_ads(sheet))
  results.push(await test_fathom_for_showed(sheet))
  results.push(await test_calendar_source_mapping(sheet, ghl))
  results.push(await test_status_parity_with_ghl(sheet, ghl))
  console.log(JSON.stringify({ ok:true, results }, null, 2))
}

run().catch(e=>{ console.error(JSON.stringify({ ok:false, error: e.message||String(e) })); process.exit(1) })
