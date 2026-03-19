#!/usr/bin/env node
import '../../_shared/env-loader.mjs'
import { getSpreadsheetInfo } from '../../_shared/google-sheets/index.mjs'

const SPREADSHEET_ID = '1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'
const SHEET_TITLE = 'Fathom Calls (Feb–Mar18)'
const FROM = '2026-02-01'
const TO = '2026-03-18'

function normalizeTitle(t){ return (t||'').toLowerCase().trim().replace(/\s+/g,' ') }
function isLikelySalesTitle(t){
  const s = normalizeTitle(t)
  if (!s) return false
  const deny = ['promotion','reveal','highlevel','standup','internal']
  if (deny.some(w=>s.includes(w))) return false
  const allow = ['ai growth game plan call','ai strategy session','strategy session','growth game plan','discovery call','intro call',' x maxwell ','- maxwell']
  return allow.some(w=>s.includes(w))
}

async function ensureSheetExists(){
  const infoRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties`, {
    headers: { 'Authorization': 'Bearer ' + await getAccessToken(), 'Accept': 'application/json' }
  })
  const info = await infoRes.json()
  const exists = (info.sheets||[]).some(s=>s.properties.title===SHEET_TITLE)
  if (exists) return
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + await getAccessToken(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [ { addSheet: { properties: { title: SHEET_TITLE } } } ] })
  })
}

async function getAccessToken(){
  const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN } = process.env
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: GOOGLE_OAUTH_CLIENT_ID, client_secret: GOOGLE_OAUTH_CLIENT_SECRET, refresh_token: GOOGLE_OAUTH_REFRESH_TOKEN, grant_type: 'refresh_token' })
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('No access token')
  return data.access_token
}

import { iterateMeetings } from '../../_shared/fathom/index.mjs'

function withinRange(dateStr){ const d=new Date(dateStr); return d>=new Date(FROM+'T00:00:00Z') && d<=new Date(TO+'T23:59:59Z') }

function fmt(x){ return x || '' }

async function writeRows(rows){
  // Clear and write header+rows
  const access = await getAccessToken()
  const header = [['Title','Scheduled','RecordingStart','CreatedAt','URL','DurationSec','LikelySales','Uncertain']]
  const values = header.concat(rows)
  // Clear by updating with the range and full values
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_TITLE+'!A1:H')}:update?valueInputOption=USER_ENTERED`
  const res = await fetch(url, { method:'POST', headers:{ 'Authorization':'Bearer '+access, 'Content-Type':'application/json' }, body: JSON.stringify({ range: SHEET_TITLE+'!A1:H', values }) })
  const data = await res.json()
  if (data.error) throw new Error(JSON.stringify(data.error))
}

async function main(){
  await ensureSheetExists()
  const rows = []
  let page=0
  try{
    for await (const call of iterateMeetings({ pageSize: 25, maxPages: 500 })){
      page++
      const title = call.title || call.meeting_title || ''
      const scheduled = call.scheduled_start_time || call.start_time || call.recording_start_time || call.created_at || ''
      if (!scheduled) continue
      if (!withinRange(scheduled)) continue
      const url = call.recording_url || call.share_url || ''
      const likely = isLikelySalesTitle(title)
      const denied = normalizeTitle(title).includes('promotion') || normalizeTitle(title).includes('reveal') || normalizeTitle(title).includes('highlevel')
      const uncertain = !likely && !denied
      rows.push([ fmt(title), fmt(scheduled), fmt(call.recording_start_time), fmt(call.created_at), fmt(url), fmt(call.duration), likely? 'yes':'no', uncertain? 'yes':'no' ])
      if (page % 10 === 0) await new Promise(r=>setTimeout(r,500))
    }
  }catch(e){ console.log('Iterator ended early:', e.message) }

  // Sort by scheduled desc
  rows.sort((a,b)=> new Date(b[1]) - new Date(a[1]))
  await writeRows(rows)
  console.log(`✅ Wrote ${rows.length} calls to sheet tab: ${SHEET_TITLE}`)
}

main().catch(e=>{ console.error('Failed:', e.message); process.exit(1) })
