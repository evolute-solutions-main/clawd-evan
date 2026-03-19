import '../agents/_shared/env-loader.mjs'
const fetchFn = globalThis.fetch

const SPREADSHEET_ID='1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'
const TAB_TITLE='All Booked Calls Data'
const RANGE=`'${TAB_TITLE}'!A1:R3000`
const CANONICAL=[
  'Date','ID','Client / Lead Name','Source','Setter','Status','Outcome','Closer','Cash Collected','Revenue','Follow Up?','Offer Made','Notes / Follow-up','Fathom Link','Entered By','Entry Timestamp','MonthNum','Year'
]

async function getAccessToken(){
  const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN } = process.env
  const res = await fetchFn('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:GOOGLE_OAUTH_CLIENT_ID,client_secret:GOOGLE_OAUTH_CLIENT_SECRET,refresh_token:GOOGLE_OAUTH_REFRESH_TOKEN,grant_type:'refresh_token'})})
  const data = await res.json(); if(!data.access_token) throw new Error('no token'); return data.access_token
}
async function readValues(range){
  const token = await getAccessToken()
  const res = await fetchFn(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`,{headers:{Authorization:'Bearer '+token}})
  const data = await res.json(); return data.values||[]
}
async function updateRange(range, values){
  const token = await getAccessToken()
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}:update?valueInputOption=USER_ENTERED`
  const body = { range, values }
  const res = await fetchFn(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)})
  const data = await res.json(); if(data.error) throw new Error(JSON.stringify(data.error)); return data
}
async function getSpreadsheet(){
  const token = await getAccessToken()
  const res = await fetchFn(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties`,{headers:{Authorization:'Bearer '+token}})
  return res.json()
}
async function batchUpdateRequests(requests){
  const token = await getAccessToken()
  const res = await fetchFn(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({requests})})
  const data = await res.json(); if(data.error) throw new Error(JSON.stringify(data.error)); return data
}

function buildIndexMap(curr){
  const idxByKey = {}
  const norm = s=> (s||'').toString().trim().toLowerCase()
  const currNorm = curr.map(norm)
  CANONICAL.forEach((h,i)=>{
    const ni = currNorm.indexOf(norm(h))
    if(ni>=0) idxByKey[i]=ni
    else idxByKey[i]=-1
  })
  return idxByKey
}

async function main(){
  const values = await readValues(RANGE)
  if(!values.length) throw new Error('no values')
  const header = values[0]
  const rows = values.slice(1)

  // Backup tab
  const info = await getSpreadsheet()
  const sheet = (info.sheets||[]).find(s=>s.properties.title===TAB_TITLE)
  if(!sheet) throw new Error('tab not found')
  const backupTitle = `${TAB_TITLE} — Backup ${new Date().toISOString().slice(0,10)}`
  await batchUpdateRequests([{ duplicateSheet:{ sourceSheetId: sheet.properties.sheetId, insertSheetIndex: (info.sheets||[]).length, newSheetName: backupTitle } }])

  // Reorder
  const map = buildIndexMap(header)
  const reordered = []
  reordered.push(CANONICAL)
  for(const r of rows){
    const out = new Array(CANONICAL.length).fill('')
    for(let i=0;i<CANONICAL.length;i++){
      const srcIdx = map[i]
      if(srcIdx>=0) out[i] = r[srcIdx]||''
    }
    reordered.push(out)
  }

  // Write back (A..R)
  await updateRange(RANGE, reordered)

  // Reset conditional formatting: highlight Outcome (column G, index 6) when F=Showed and G is blank
  const delReqs = [{ deleteConditionalFormatRule:{ sheetId: sheet.properties.sheetId, index: 0 } }]
  // Best-effort delete a handful
  for(let i=1;i<6;i++) delReqs.push({ deleteConditionalFormatRule:{ sheetId: sheet.properties.sheetId, index: 0 } })
  await batchUpdateRequests(delReqs).catch(()=>{})
  const formula = '=AND($F2="Showed",LEN($G2)=0)'
  await batchUpdateRequests([
    { addConditionalFormatRule:{ index:0, rule:{ ranges:[{ sheetId: sheet.properties.sheetId, startRowIndex:1, startColumnIndex:6, endColumnIndex:7 }], booleanRule:{ condition:{ type:'CUSTOM_FORMULA', values:[{ userEnteredValue: formula }] }, format:{ backgroundColor:{ red:1, green:1, blue:0 } } } } } }
  ])

  console.log(JSON.stringify({backupTitle, rowsWritten: reordered.length}))
}

main().catch(e=>{ console.error('ERR', e.message||e); process.exit(1) })
