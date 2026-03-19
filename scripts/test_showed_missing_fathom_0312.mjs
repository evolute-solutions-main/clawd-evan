import '../agents/_shared/env-loader.mjs'
import { readSheet } from '../agents/_shared/google-sheets/index.mjs'
const SHEET_ID='1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'
const RANGE="'All Booked Calls Data'!A1:R2000"
function norm(s){return (s||'').toString().trim().toLowerCase()}
const res = await readSheet({ spreadsheetId: SHEET_ID, range: RANGE })
const rows = res.values||[]
const header = rows[0]||[]
const IDX={ Date:0, Status:6, Fathom:14, Lead:2 }
const targetDay='03/12/2026'
const out=[]
for(let i=1;i<rows.length;i++){
  const r=rows[i]
  if(!r||!r.length) continue
  if((r[IDX.Date]||'').toString().trim()!==targetDay) continue
  const st=norm(r[IDX.Status])
  const link=(r[IDX.Fathom]||'').toString().trim()
  if(st==='showed' && !link){ out.push({ row:i+1, date:r[IDX.Date], lead:r[IDX.Lead], status:r[IDX.Status]||'', fathomLink: link }) }
}
console.log(JSON.stringify({ test:'showed_missing_fathom_link', day:targetDay, count: out.length, rows: out }, null, 2))
