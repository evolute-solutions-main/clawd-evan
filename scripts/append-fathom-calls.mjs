import '../agents/_shared/env-loader.mjs'
const fetchFn = globalThis.fetch

const SPREADSHEET_ID='1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'

async function getAccessToken(){
  const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN } = process.env
  const res = await fetchFn('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:GOOGLE_OAUTH_CLIENT_ID,client_secret:GOOGLE_OAUTH_CLIENT_SECRET,refresh_token:GOOGLE_OAUTH_REFRESH_TOKEN,grant_type:'refresh_token'})})
  const data = await res.json(); if(!data.access_token) throw new Error('no token'); return data.access_token
}
function fmtUS(d){ const mm=String(d.getUTCMonth()+1).padStart(2,'0'); const dd=String(d.getUTCDate()).padStart(2,'0'); return `${mm}/${dd}/${d.getUTCFullYear()}` }
function parseISODateOnly(s){ const d=new Date(s); return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())) }
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

const items = [
  { lead:'Joe', url:'https://fathom.video/share/k6mzJ2BDqUbnf6b8p-kUF3BnFzRye3mS', scheduled:'2026-03-09T16:00:00Z' },
  { lead:'Austin Bennett', url:'https://fathom.video/share/joxUM911sL74pdZFofGdXzxi5z91wt2G', scheduled:'2026-03-02T22:30:00Z' },
  { lead:'Impromptu Google Meet Meeting', url:'https://fathom.video/share/91DUoHvq3y2Vrz2J69TsxBBPtUpzeRU3', scheduled:'2026-02-19T22:57:45Z' }
]

const existing = await readAll()
const header = existing[0]||[]
const rows = existing.slice(1)
const urlIdx = header.findIndex(h=>String(h||'').toLowerCase().includes('fathom'))
const existingURLs = new Set(rows.map(r=>r[urlIdx]).filter(Boolean))

const toAdd=[]
for(const it of items){
  if(existingURLs.has(it.url)) continue
  const d = parseISODateOnly(it.scheduled)
  const row = Array(18).fill('')
  row[0] = fmtUS(d) // Date
  row[2] = it.lead // Client / Lead Name
  row[5] = 'Showed' // Status
  row[13] = it.url // Fathom Link
  row[15] = new Date().toISOString() // Entry Timestamp
  row[16] = String(d.getUTCMonth()+1) // MonthNum
  row[17] = String(d.getUTCFullYear()) // Year
  toAdd.push(row)
}
let updatedCells = 0
if(toAdd.length){ updatedCells = await appendRows(toAdd) }
console.log(JSON.stringify({added: toAdd.length, updatedCells}))
