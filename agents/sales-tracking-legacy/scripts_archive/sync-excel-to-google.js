const XLSX = require('xlsx')
const fs = require('fs')
const fetch = global.fetch
const SPREADSHEET_ID='1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'
const EXCEL_PATH='/root/clawd/data/sales/audits/audited_workbook_mar18.xlsx'

// Load .secrets.env minimally
try {
  const envText = fs.readFileSync('/root/clawd/.secrets.env','utf8')
  envText.split(/\r?\n/).forEach(line=>{
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if(m) process.env[m[1]] = m[2]
  })
} catch(e) {}

async function getAccessToken(){
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
    grant_type: 'refresh_token'
  })
  const res = await fetch('https://oauth2.googleapis.com/token', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body: params })
  const data = await res.json(); if(!data.access_token) throw new Error('No token'); return data.access_token
}
async function getSpreadsheet(){
  const token = await getAccessToken()
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties`, { headers:{ Authorization: 'Bearer ' + token } })
  return res.json()
}
async function duplicateSheet(sourceTitle, backupTitle){
  const info = await getSpreadsheet()
  const sheet = (info.sheets||[]).find(s=>s.properties.title===sourceTitle)
  if(!sheet) throw new Error('Source sheet not found')
  const token = await getAccessToken()
  const req = { requests: [ { duplicateSheet: { sourceSheetId: sheet.properties.sheetId, insertSheetIndex: (info.sheets||[]).length, newSheetName: backupTitle } } ] }
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, { method:'POST', headers:{ Authorization:'Bearer '+token, 'Content-Type':'application/json' }, body: JSON.stringify(req) })
  const data = await res.json(); if(data.error) throw new Error(JSON.stringify(data.error))
}
async function updateRange(range, values){
  const token = await getAccessToken()
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}:update?valueInputOption=USER_ENTERED`
  const body = { range, values }
  const res = await fetch(url, { method:'POST', headers:{ Authorization:'Bearer '+token, 'Content-Type':'application/json' }, body: JSON.stringify(body) })
  const data = await res.json(); if(data.error) throw new Error(JSON.stringify(data.error)); return data
}

function parseUSDate(s){ if(!s) return null; const m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if(!m) return null; return new Date(+m[3],+m[1]-1,+m[2]) }

async function main(){
  const wb = XLSX.readFile(EXCEL_PATH)
  const ws = wb.Sheets['All Booked Calls Data']
  if(!ws) throw new Error('Excel: All Booked Calls Data not found')
  const aoa = XLSX.utils.sheet_to_json(ws,{header:1,blankrows:false})
  const header = aoa[0]
  const rows = aoa.slice(1)
  const from = new Date(Date.UTC(2026,1,1)) // Feb 1
  const to = new Date(Date.UTC(2026,2,18,23,59,59)) // Mar 18
  const inRange = rows.filter(r=>{ const d=parseUSDate(r[0]); if(!d) return false; const du=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); return du>=from && du<=to })
  const values = [header, ...inRange]
  const ts = new Date().toISOString().slice(0,10)
  const backupTitle = `All Booked Calls Data — Backup ${ts}`
  await duplicateSheet('All Booked Calls Data', backupTitle)
  await updateRange("'All Booked Calls Data'!A1:R", values.map(r=>r.slice(0,18)))
  console.log(JSON.stringify({ backupTitle, written: values.length }))
}

main().catch(e=>{ console.error('ERR', e); process.exit(1) })
