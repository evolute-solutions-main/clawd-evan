#!/usr/bin/env node
import '../../_shared/env-loader.mjs'
import { getSpreadsheetInfo, updateRange } from '../../_shared/google-sheets/index.mjs'
import { iterateMeetings } from '../../_shared/fathom/index.mjs'

const SPREADSHEET_ID = '1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'
const SHEET_TITLE = 'Fathom Calls (Feb–Mar18)'
const FROM = '2026-02-01'
const TO = '2026-03-18'

function withinRange(dateStr){ const d=new Date(dateStr); return d>=new Date(FROM+'T00:00:00Z') && d<=new Date(TO+'T23:59:59Z') }
function normalizeTitle(t){ return (t||'').toLowerCase().trim().replace(/\s+/g,' ') }
function isLikelySalesTitle(t){
  const s = normalizeTitle(t)
  if (!s) return false
  const deny = ['promotion','reveal','highlevel','standup','internal']
  if (deny.some(w=>s.includes(w))) return false
  const allow = ['ai growth game plan call','ai strategy session','strategy session','growth game plan','discovery call','intro call',' x maxwell ','- maxwell']
  return allow.some(w=>s.includes(w))
}

async function main(){
  // Ensure target sheet exists (created previously via batchUpdate; if not, user can create manually)
  const info = await getSpreadsheetInfo({ spreadsheetId: SPREADSHEET_ID })
  const exists = info.sheets.some(s=>s.properties.title===SHEET_TITLE)
  if (!exists) {
    console.log(`Sheet tab "${SHEET_TITLE}" is missing. Create it manually and re-run.`)
    process.exit(1)
  }

  const header = [['Title','Scheduled','RecordingStart','CreatedAt','URL','DurationSec','LikelySales','Uncertain']]
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
      rows.push([ title, scheduled, call.recording_start_time || '', call.created_at || '', url, call.duration || '', likely? 'yes':'no', uncertain? 'yes':'no' ])
      if (page % 10 === 0) await new Promise(r=>setTimeout(r,500))
    }
  }catch(e){ console.log('Iterator ended early:', e.message) }

  rows.sort((a,b)=> new Date(b[1]) - new Date(a[1]))
  await updateRange({ spreadsheetId: SPREADSHEET_ID, range: `'${SHEET_TITLE}'!A1:H`, values: header.concat(rows) })
  console.log(`✅ Wrote ${rows.length} calls to ${SHEET_TITLE}`)
}

main().catch(e=>{ console.error('Failed:', e.message); process.exit(1) })
