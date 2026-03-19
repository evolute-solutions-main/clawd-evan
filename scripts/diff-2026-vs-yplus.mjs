import '../agents/_shared/env-loader.mjs'
import { readSheet } from '../agents/_shared/google-sheets/index.mjs'

const Y_ID='1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI' // Y+
const S2026_ID='1nU21AF2iM-rX9NspCEXLQB7_APaOBm4AaYMk6IaI648' // 2026
const RANGE="'All Booked Calls Data'!A1:R3000"

function normLead(s){return (s||'').toString().trim().toLowerCase().replace(/\s+/g,' ')}
function mapSource(s){
  s=(s||'').toString().trim().toLowerCase()
  if(s.includes('ads')||s.includes('meta')) return 'ads'
  if(s.includes('cold')) return 'cold sms'
  return s
}
function parseUS(s){
  if(!s) return null
  const m=String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if(!m) return null
  const mm = m[1].padStart(2,'0'), dd = m[2].padStart(2,'0'), yyyy=m[3]
  const d=new Date(Date.UTC(+yyyy,+mm-1,+dd))
  return {d, key:`${mm}/${dd}/${yyyy}`}
}
const FROM=new Date(Date.UTC(2026,1,1))
const TO=new Date(Date.UTC(2026,2,18,23,59,59))
function inRangeDate(s){ const p=parseUS(s); if(!p) return false; return p.d>=FROM && p.d<=TO }
function makeKey(row){ const p=parseUS(row[0]); if(!p) return null; return [p.key, normLead(row[2]), mapSource(row[3])].join('|') }

async function load(id){
  const r = await readSheet({ spreadsheetId: id, range: RANGE })
  const rows = r.values||[]
  const header = rows[0]||[]
  const data = rows.slice(1).filter(r=>inRangeDate(r[0]))
  const map = new Map()
  for(const row of data){ const k=makeKey(row); if(k) map.set(k,row) }
  return {header,data,map}
}

const Y = await load(Y_ID)
const S = await load(S2026_ID)

const missing=[]
for(const row of S.data){ const k=makeKey(row); if(!k) continue; if(!Y.map.has(k)) missing.push({date:parseUS(row[0]).key, lead: row[2], source: mapSource(row[3]), status: row[5]||''}) }

// Exclusions user flagged as present
const excludeSet = new Set([
  ['02/09/2026','alex','cold sms'].join('|'),
  ['03/11/2026','anthony carroway','ads'].join('|')
])
const filtered = missing.filter(x=>!excludeSet.has([x.date, normLead(x.lead), x.source].join('|')))

console.log(JSON.stringify({counts:{y_in:Y.data.length, s_in:S.data.length, missing_filtered: filtered.length}, sample: filtered.slice(0,30)}, null, 2))
