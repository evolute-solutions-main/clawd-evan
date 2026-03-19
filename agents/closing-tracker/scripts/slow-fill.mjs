#!/usr/bin/env node
import '../../_shared/env-loader.mjs'
import fs from 'fs'
import path from 'path'
import { getClosingData } from '../lib/get-closing-data.mjs'
import { readSheet, updateRange } from '../../_shared/google-sheets/index.mjs'
import { buildRow, rowKey, apptKey, mergeManualCols, formatDate, dateRange } from '../lib/row-builder.mjs'

const SPREADSHEET_ID = '1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'
const SHEET = 'All Booked Calls Data'
const STATE_DIR = path.join(process.cwd(), 'state', 'closing-tracker')
const QUEUE_PATH = path.join(STATE_DIR, 'backfill-queue.json')

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }) }

async function mergeDay(dateStr) {
  // 1) Fetch day data (may 429)
  const r = await getClosingData(dateStr)

  // 2) Read existing sheet to preserve manual cols for this day
  const res = await readSheet({ spreadsheetId: SPREADSHEET_ID, range: `'${SHEET}'!A1:R10000` })
  const rows = res.values?.slice(1) || []

  // Split existing into: otherDays, today
  const todayUS = formatDate(dateStr)
  const otherDays = []
  const today = []
  for (const r0 of rows) { if (!r0 || !r0.length) continue; if (r0[0] === todayUS) today.push(r0); else otherDays.push(r0) }
  const preserve = new Map(today.map(r0 => [rowKey(r0), r0]))

  // 3) Build merged rows for today
  const outToday = []
  const seen = new Set()
  for (const appt of r.appointments) {
    const key = apptKey(r.date, appt)
    if (seen.has(key)) continue
    seen.add(key)
    outToday.push(mergeManualCols(buildRow(r.date, appt), preserve.get(key)))
  }

  // 4) Combine and sort desc by date then timestamp
  const combined = otherDays.concat(outToday)
  combined.sort((a, b) => { const da = new Date(a[0]); const db = new Date(b[0]); if (db - da !== 0) return db - da; const ta = Date.parse(a[15] || ''); const tb = Date.parse(b[15] || ''); return (tb || 0) - (ta || 0) })

  await updateRange({ spreadsheetId: SPREADSHEET_ID, range: `'${SHEET}'!A2:R`, values: combined })
  return { showed: r.summary.showed, noShow: r.summary.noShow }
}

function loadQueue() { ensureDir(STATE_DIR); if (!fs.existsSync(QUEUE_PATH)) return { dates: [] }; return JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8')) }
function saveQueue(q) { ensureDir(STATE_DIR); fs.writeFileSync(QUEUE_PATH, JSON.stringify(q, null, 2)) }

async function main() {
  const from = process.env.CT_SLOW_FROM || '2026-02-01'
  const to = process.env.CT_SLOW_TO || '2026-03-18'
  const q = loadQueue()
  if (!q.dates || q.dates.length === 0) { q.dates = Array.from(dateRange(from, to)).map(d => ({ date: d, status: 'pending', notBefore: 0, attempts: 0 })) }
  // pick next eligible
  const now = Date.now()
  const next = q.dates.find(d => d.status === 'pending' && (d.notBefore || 0) <= now)
  if (!next) { console.log('No eligible dates to process'); saveQueue(q); return }

  try {
    next.status = 'running'; saveQueue(q)
    const r = await mergeDay(next.date)
    next.status = 'done'; next.result = r; saveQueue(q)
    console.log(`✅ ${next.date} merged (showed=${r.showed}, noShow=${r.noShow})`)
  } catch (e) {
    next.attempts = (next.attempts || 0) + 1
    // backoff: 30s, 60s, 120s, 300s cap
    const delays = [30000, 60000, 120000, 300000]
    const delay = delays[Math.min(next.attempts - 1, delays.length - 1)]
    next.notBefore = Date.now() + delay
    next.status = 'pending'
    next.error = e.message
    saveQueue(q)
    console.log(`⏳ ${next.date} deferred: ${e.message} (retry in ${Math.round(delay / 1000)}s)`)
    process.exitCode = 2
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
