#!/usr/bin/env node
/**
 * Export Fathom calls (metadata only) for a date range, minimal API use, with backoff & caching.
 * No transcripts. Stores results to state/closing-tracker/fathom-calls-<from>_to_<to>.json
 * Also emits two CSVs: all_calls.csv and uncertain_calls.csv
 *
 * Usage: node agents/fathom/scripts/export-calls-range.mjs --from=2026-02-01 --to=2026-03-18
 */
import '../../_shared/env-loader.mjs'
import fs from 'fs'
import path from 'path'
import { iterateMeetings } from '../../_shared/fathom/index.mjs'

const args = Object.fromEntries(process.argv.slice(2).map(p=>p.split('=')))
const FROM = args['--from'] || '2026-02-01'
const TO = args['--to'] || '2026-03-18'

const STATE_DIR = path.join(process.cwd(), 'state', 'closing-tracker')
const OUT_JSON = path.join(STATE_DIR, `fathom-calls-${FROM}_to_${TO}.json`)
const OUT_ALL_CSV = path.join(STATE_DIR, `all_calls-${FROM}_to_${TO}.csv`)
const OUT_UNCERTAIN_CSV = path.join(STATE_DIR, `uncertain_calls-${FROM}_to_${TO}.csv`)

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p, { recursive:true }) }

function withinRange(dateStr){
  const d = new Date(dateStr)
  return d >= new Date(FROM + 'T00:00:00Z') && d <= new Date(TO + 'T23:59:59Z')
}

function normalizeTitle(t){ return (t||'').toLowerCase().trim().replace(/\s+/g,' ') }

function isLikelySalesTitle(t){
  const s = normalizeTitle(t)
  if (!s) return false
  const deny = ['promotion','reveal','highlevel','standup','internal']
  if (deny.some(w=>s.includes(w))) return false
  const allow = ['ai growth game plan call','ai strategy session','strategy session','growth game plan','discovery call','intro call',' x maxwell ','- maxwell']
  return allow.some(w=>s.includes(w))
}

function toCsvRow(o){
  return [
    o.title?.replaceAll('"','""')||'',
    o.scheduled_start_time||'',
    o.recording_start_time||'',
    o.created_at||'',
    o.recording_url||o.share_url||'',
    o.duration||'',
    o.uncertain? 'yes':'no'
  ].map(x=>`"${x}"`).join(',')
}

async function main(){
  ensureDir(STATE_DIR)
  const out = []
  let pages = 0
  try{
    for await (const call of iterateMeetings({ pageSize: 25, maxPages: 200 })){
      pages++
      const title = call.title || call.meeting_title
      const scheduled = call.scheduled_start_time || call.start_time || call.recording_start_time || call.created_at
      if (!scheduled) continue
      if (!withinRange(scheduled)){
        // If we've paged beyond TO and are before FROM consistently, we can keep iterating; we rely on maxPages cap
      }
      if (withinRange(scheduled)){
        const entry = {
          title,
          scheduled_start_time: call.scheduled_start_time || null,
          recording_start_time: call.recording_start_time || null,
          created_at: call.created_at || null,
          recording_url: call.recording_url || null,
          share_url: call.share_url || null,
          duration: call.duration || null,
        }
        const likely = isLikelySalesTitle(title)
        const denied = normalizeTitle(title).includes('promotion') || normalizeTitle(title).includes('reveal') || normalizeTitle(title).includes('highlevel')
        entry.uncertain = !likely && !denied
        out.push(entry)
      }
      // light pacing between pages
      if (pages % 5 === 0) await new Promise(r=>setTimeout(r, 500))
    }
  }catch(e){
    console.log('Iterator error (likely 429). Partial results will be saved:', e.message)
  }

  // Save JSON
  fs.writeFileSync(OUT_JSON, JSON.stringify({ from: FROM, to: TO, count: out.length, calls: out }, null, 2))

  // Write CSVs
  const header = 'title,scheduled_start_time,recording_start_time,created_at,recording_or_share_url,duration,uncertain' 
  fs.writeFileSync(OUT_ALL_CSV, [header, ...out.map(toCsvRow)].join('\n'))
  const uncertain = out.filter(c=>c.uncertain)
  fs.writeFileSync(OUT_UNCERTAIN_CSV, [header, ...uncertain.map(toCsvRow)].join('\n'))

  console.log(`✅ Export complete. Pages=${pages}. Calls in range=${out.length}. Uncertain=${uncertain.length}`)
  console.log('JSON:', OUT_JSON)
  console.log('CSV (all):', OUT_ALL_CSV)
  console.log('CSV (uncertain):', OUT_UNCERTAIN_CSV)
}

main().catch(e=>{ console.error('Failed:', e); process.exit(1) })
