import '../agents/_shared/env-loader.mjs'
const fetchFn = globalThis.fetch
const SPREADSHEET_ID='1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'
const RANGE="'All Booked Calls Data'!A1:R3000"

async function getAccessToken(){
  const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN } = process.env
  const res = await fetchFn('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:GOOGLE_OAUTH_CLIENT_ID,client_secret:GOOGLE_OAUTH_CLIENT_SECRET,refresh_token:GOOGLE_OAUTH_REFRESH_TOKEN,grant_type:'refresh_token'})})
  const data = await res.json(); if(!data.access_token) throw new Error('no token'); return data.access_token
}
async function readAll(){
  const token = await getAccessToken()
  const res = await fetchFn(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(RANGE)}`,{headers:{Authorization:'Bearer '+token}})
  const data = await res.json(); return data.values||[]
}
async function batchUpdate(ranges){
  if(!ranges.length) return 0
  const token = await getAccessToken()
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`
  const body = { valueInputOption:'USER_ENTERED', data: ranges }
  const res = await fetchFn(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)})
  const data = await res.json(); if(data.error) throw new Error(JSON.stringify(data.error)); return data.totalUpdatedCells||0
}
function ci(s){ return (s||'').toString().toLowerCase() }

const rows = await readAll()
const data = rows.slice(1)
const toFix = []
for (let i=0;i<data.length;i++){
  const r = data[i]
  const source = ci(r[3])
  const setter = ci(r[4])
  if (source.includes('cold') && setter.includes('ads')){
    toFix.push(i+2)
  }
}
const updates = toFix.map(rowNum=>({ range: `'All Booked Calls Data'!E${rowNum}:E${rowNum}`, values: [['']] }))
const updated = await batchUpdate(updates)
console.log(JSON.stringify({violations: toFix.length, rows: toFix.slice(0,20), updatedCells: updated}))
