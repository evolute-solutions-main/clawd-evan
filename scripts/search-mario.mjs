import '../agents/_shared/env-loader.mjs'
import { readSheet } from '../agents/_shared/google-sheets/index.mjs'
const Y_ID='1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'
const S2026_ID='1nU21AF2iM-rX9NspCEXLQB7_APaOBm4AaYMk6IaI648'
const RANGE="'All Booked Calls Data'!A1:R3000"
function norm(s){return (s||'').toString().toLowerCase()}

for (const [id,label] of [[Y_ID,'Y+'],[S2026_ID,'S2026']]){
  const r = await readSheet({ spreadsheetId:id, range:RANGE })
  const rows = r.values||[]
  const hits = rows.slice(1).map((row,i)=>({i:i+2,row})).filter(x=>norm(x.row[2]||'').includes('mario design'))
  console.log(label, JSON.stringify(hits.map(h=>({idx:h.i,date:h.row[0],lead:h.row[2],source:h.row[3],setter:h.row[4],status:h.row[5]})), null, 2))
}
