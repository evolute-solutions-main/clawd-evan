import '../agents/_shared/env-loader.mjs'
const fetchFn = globalThis.fetch

const SPREADSHEET_ID='1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'

async function getAccessToken(){
  const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN } = process.env
  const res = await fetchFn('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:GOOGLE_OAUTH_CLIENT_ID,client_secret:GOOGLE_OAUTH_CLIENT_SECRET,refresh_token:GOOGLE_OAUTH_REFRESH_TOKEN,grant_type:'refresh_token'})})
  const data = await res.json(); if(!data.access_token) throw new Error('no token'); return data.access_token
}
async function readAll(){
  const token = await getAccessToken()
  const res = await fetchFn(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent("'All Booked Calls Data'!A1:R2000")}`,{headers:{Authorization:'Bearer '+token}})
  const data = await res.json(); return data.values||[]
}
async function appendRows(values){
  const token = await getAccessToken()
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent("'All Booked Calls Data'!A1:R")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
  const body = { values }
  const res = await fetchFn(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)})
  const data = await res.json(); if(data.error) throw new Error(JSON.stringify(data.error)); return data.updates?.updatedCells||0
}

function makeRow(dateUS, lead){
  const nowIso = new Date().toISOString()
  const [mm,dd,yyyy] = dateUS.split('/')
  const monthNum = String(Number(mm))
  const row = Array(18).fill('')
  row[0] = dateUS                              // Date
  row[2] = lead                                // Client / Lead Name
  row[3] = 'Ads'                               // Source
  row[4] = 'Ads - No Setter'                   // Setter
  row[5] = 'No-Show'                           // Status
  row[7] = 'Max'                               // Closer
  row[10] = 'FALSE'                            // Follow Up?
  row[14] = 'Davi'                             // Entered By
  row[15] = nowIso                             // Entry Timestamp
  row[16] = monthNum                           // MonthNum
  row[17] = yyyy                               // Year
  return row
}

const want = [
  { date:'03/06/2026', lead:'Anthony Sullivan' },
  { date:'03/03/2026', lead:'Arthur Broussard' },
]

const existing = await readAll()
const header = existing[0]||[]
const rows = existing.slice(1)
function key(r){ return [r[0]||'', r[2]||'', r[3]||''].join('|').toLowerCase() }
const have = new Set(rows.map(key))

const toAdd=[]
for (const w of want){
  const k = [w.date, w.lead, 'Ads'].join('|').toLowerCase()
  if (!have.has(k)) toAdd.push(makeRow(w.date, w.lead))
}
let addedCount = 0
if (toAdd.length){ await appendRows(toAdd); addedCount = toAdd.length }
console.log(JSON.stringify({added: addedCount}))
