import '../agents/_shared/env-loader.mjs'
const fetchFn = globalThis.fetch
const SPREADSHEET_ID='1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'

async function getAccessToken(){
  const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN } = process.env
  const res = await fetchFn('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:GOOGLE_OAUTH_CLIENT_ID,client_secret:GOOGLE_OAUTH_CLIENT_SECRET,refresh_token:GOOGLE_OAUTH_REFRESH_TOKEN,grant_type:'refresh_token'})})
  const data = await res.json(); if(!data.access_token) throw new Error('no token'); return data.access_token
}
async function getSpreadsheet(){
  const token = await getAccessToken()
  const res = await fetchFn(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties`,{headers:{Authorization:'Bearer '+token}})
  return res.json()
}
async function readCell(range){
  const token = await getAccessToken()
  const res = await fetchFn(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`,{headers:{Authorization:'Bearer '+token}})
  const data = await res.json(); return (data.values&&data.values[0]&&data.values[0][0])||''
}
async function writeCell(range, value){
  const token = await getAccessToken()
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`
  const body = { valueInputOption:'USER_ENTERED', data:[{ range, values:[[value]] }] }
  const res = await fetchFn(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)})
  const data = await res.json(); if(data.error) throw new Error(JSON.stringify(data.error))
}

const info = await getSpreadsheet()
const backup = (info.sheets||[]).map(s=>s.properties.title).find(t=>t && t.startsWith('All Booked Calls Data — Backup'))
let restored=''
if(backup){
  const val = await readCell(`'${backup}'!D4:D4`)
  if(val){ await writeCell(`'All Booked Calls Data'!D4:D4`, val); restored=val }
}
console.log(JSON.stringify({backup, restored}))
