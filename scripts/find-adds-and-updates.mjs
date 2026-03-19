import '../agents/_shared/env-loader.mjs'
import { readSheet } from '../agents/_shared/google-sheets/index.mjs'

const Y_ID='1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'
const S2026_ID='1nU21AF2iM-rX9NspCEXLQB7_APaOBm4AaYMk6IaI648'
const RANGE="'All Booked Calls Data'!A1:R3000"
const COLS=['Date','ID','Client / Lead Name','Source','Setter','Status','Outcome','Closer','Cash Collected','Revenue','Follow Up?','Offer Made','Notes / Follow-up','Fathom Link','Entered By','Entry Timestamp','MonthNum','Year']

function normLead(s){return (s||'').toString().trim().toLowerCase().replace(/\s+/g,' ')}
function mapSource(s){ s=(s||'').toString().trim().toLowerCase(); if(s.includes('ads')||s.includes('meta')) return 'ads'; if(s.includes('cold')) return 'cold sms'; return s }
function parseUS(s){ if(!s) return null; const m=String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if(!m) return null; const mm=m[1].padStart(2,'0'),dd=m[2].padStart(2,'0'),yyyy=m[3]; const d=new Date(Date.UTC(+yyyy,+mm-1,+dd)); return {d,key:`${mm}/${dd}/${yyyy}`}}
const FROM=new Date(Date.UTC(2026,1,1)), TO=new Date(Date.UTC(2026,2,18,23,59,59))
function inRangeDate(s){ const p=parseUS(s); if(!p) return false; return p.d>=FROM && p.d<=TO }
function makeKey(row){ const p=parseUS(row[0]); if(!p) return null; return [p.key, normLead(row[2]), mapSource(row[3])].join('|') }
function makeLooseKey(row){ const p=parseUS(row[0]); if(!p) return null; return [p.key, normLead(row[2])].join('|') }

async function load(id){ const r=await readSheet({spreadsheetId:id, range:RANGE}); const rows=r.values||[]; const header=rows[0]||[]; const data=rows.slice(1).map((r,i)=>({row:r, idx:i+2})).filter(x=>inRangeDate(x.row[0])); const map=new Map(); const loose=new Map(); for(const x of data){ const k=makeKey(x.row); if(k) map.set(k,x); const lk=makeLooseKey(x.row); if(lk && !loose.has(lk)) loose.set(lk,x) } return {header,data,map,loose} }

const Y = await load(Y_ID)
const S = await load(S2026_ID)

const adds=[]
for(const {row} of S.data){ const status=(row[5]||'').toString().toLowerCase(); if(!(status==='showed'||status==='no-show')) continue; const k=makeKey(row); const lk=makeLooseKey(row); if(!lk) continue; if(!(Y.map.has(k) || Y.loose.has(lk))){ adds.push({date:parseUS(row[0]).key, lead:row[2], source:mapSource(row[3]), status:row[5]||''}) } }

const updatableCols = ['Outcome','Closer','Cash Collected','Revenue','Notes / Follow-up','Fathom Link']
const updates=[]
for(const {row: srow} of S.data){ const k=makeKey(srow); if(!k) continue; const yx=Y.map.get(k); if(!yx) continue; const yrow=yx.row; const yidx=yx.idx; const changes=[]; for(let i=0;i<COLS.length;i++){ if(!updatableCols.includes(COLS[i])) continue; const yv=(yrow[i]||'').toString().trim(); const sv=(srow[i]||'').toString().trim(); if(!yv && sv){ changes.push({col:COLS[i], to:sv}) } } if(changes.length) updates.push({row:yidx, key:{date:yrow[0], lead:yrow[2], source:yrow[3]}, changes})}

console.log(JSON.stringify({adds_count:adds.length, adds_sample:adds.slice(0,25), updates_count:updates.length, updates_sample:updates.slice(0,15)}, null, 2))
