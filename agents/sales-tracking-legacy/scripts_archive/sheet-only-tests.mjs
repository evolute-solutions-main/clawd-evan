import '../agents/_shared/env-loader.mjs'
import { readSheet } from '../agents/_shared/google-sheets/index.mjs'
const SHEET='1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'
const RANGE="'All Booked Calls Data'!A1:R4000"
function norm(s){return (s||'').toString().trim().toLowerCase()}

const res = await readSheet({ spreadsheetId: SHEET, range: RANGE })
const rows = (res.values||[])
const header = rows[0]||[]
const data = rows.slice(1).map((r,i)=>({i:i+2,r}))
const fathomIdx = header.findIndex(h=>norm(h).includes('fathom'))

// Test: Cold SMS source cannot have Ads setter
const t1 = []
for(const x of data){
  const src = norm(x.r[3])
  const set = norm(x.r[4])
  if(src.includes('cold') && set.includes('ads')) t1.push({row:x.i,date:x.r[0],lead:x.r[2],source:x.r[3],setter:x.r[4]})
}
// Test: Showed must have fathom link present (sheet-only check)
const t2 = []
for(const x of data){
  const status = norm(x.r[5])
  if(status==='showed'){
    const link = fathomIdx>=0 ? (x.r[fathomIdx]||'') : ''
    if(!link) t2.push({row:x.i,date:x.r[0],lead:x.r[2]})
  }
}
console.log(JSON.stringify({
  source_setter_consistency_coldsms_not_ads: { count: t1.length, sample: t1.slice(0,10) },
  fathom_showed_integrity: { count_missing_link: t2.length, sample: t2.slice(0,10) }
},null,2))
