import '../agents/_shared/env-loader.mjs'
import { updateRange } from '../agents/_shared/google-sheets/index.mjs'
import XLSXpkg from 'xlsx'
const XLSX = XLSXpkg

const SPREADSHEET_ID='1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'
const EXCEL_PATH='/root/clawd/data/sales/audits/audited_workbook_mar18.xlsx'

function parseExcelDate(v){
  if(v==null) return null
  if(typeof v==='number'){ // Excel serial date
    const epoch = Date.UTC(1899,11,30)
    const ms = epoch + v*86400000
    const d = new Date(ms)
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  }
  const s = String(v).trim()
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if(m) return new Date(Date.UTC(+m[3], +m[1]-1, +m[2]))
  // ISO-like
  if(/\d{4}-\d{2}-\d{2}/.test(s)) return new Date(Date.UTC(+s.slice(0,4), +s.slice(5,7)-1, +s.slice(8,10)))
  return null
}

async function main(){
  const wb = XLSX.readFile(EXCEL_PATH)
  const ws = wb.Sheets['All Booked Calls Data']
  if(!ws) throw new Error('Excel: All Booked Calls Data not found')
  const aoa = XLSX.utils.sheet_to_json(ws,{header:1,blankrows:false})
  const header = aoa[0]
  const rows = aoa.slice(1)
  const from = new Date(Date.UTC(2026,1,1))
  const to = new Date(Date.UTC(2026,2,18,23,59,59))
  const inRange = rows.filter(r=>{ const du=parseExcelDate(r[0]); if(!du) return false; return du>=from && du<=to })
  const values = [header, ...inRange].map(r=>r.slice(0,18))
  await updateRange({ spreadsheetId: SPREADSHEET_ID, range: "'All Booked Calls Data'!A1:R", values })
  console.log(JSON.stringify({written: values.length}))
}

main().catch(e=>{ console.error('ERR', e.message); process.exit(1) })
