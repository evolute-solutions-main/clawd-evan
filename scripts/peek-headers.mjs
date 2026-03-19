import '../agents/_shared/env-loader.mjs'
import { readSheet } from '../agents/_shared/google-sheets/index.mjs'
const SHEET_ID='1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'
const RANGE="'All Booked Calls Data'!A1:Z1"
const res = await readSheet({ spreadsheetId: SHEET_ID, range: RANGE })
const header = (res.values||[])[0]||[]
const wanted=[
 'Date','ID','Client / Lead Name','Source','Setter','Status','Outcome','Closer','Cash Collected','Revenue','Follow Up?','Offer Made','Notes / Follow-up','Fathom Link','Entered By','Entry Timestamp','MonthNum','Year'
]
function indexMap(hdr){ const map={}; for(let i=0;i<wanted.length;i++){ const key=wanted[i].toLowerCase(); let found=-1; for(let j=0;j<hdr.length;j++){ if((hdr[j]||'').toString().trim().toLowerCase()===key){ found=j; break } } map[wanted[i]] = (found>=0? found : null) } return map }
const mapping=indexMap(header)
console.log(JSON.stringify({header, mapping}, null, 2))
