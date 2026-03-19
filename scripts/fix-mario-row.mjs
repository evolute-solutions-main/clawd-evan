import '../agents/_shared/env-loader.mjs'
const fetchFn = globalThis.fetch
const SPREADSHEET_ID='1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'

async function getAccessToken(){
  const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN } = process.env
  const res = await fetchFn('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:GOOGLE_OAUTH_CLIENT_ID,client_secret:GOOGLE_OAUTH_CLIENT_SECRET,refresh_token:GOOGLE_OAUTH_REFRESH_TOKEN,grant_type:'refresh_token'})})
  const data = await res.json(); if(!data.access_token) throw new Error('no token'); return data.access_token
}
async function batchUpdate(patches){
  const token = await getAccessToken()
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchUpdate`
  const body = { valueInputOption:'USER_ENTERED', data: patches }
  const res = await fetchFn(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)})
  const data = await res.json(); if(data.error) throw new Error(JSON.stringify(data.error)); return data.totalUpdatedCells||0
}

const patches = [
  { range: "'All Booked Calls Data'!D3:D3", values: [["Cold SMS"]] },
  { range: "'All Booked Calls Data'!E3:E3", values: [["Randy"]] },
  { range: "'All Booked Calls Data'!F3:F3", values: [["No-Show"]] }
]
const updated= await batchUpdate(patches)
console.log(JSON.stringify({updated}))
