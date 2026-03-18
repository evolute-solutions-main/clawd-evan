#!/usr/bin/env node
/**
 * Fathom Meetings Fetcher (similar to discord-fetcher style)
 * - Reads global timezone from SETTINGS.md
 * - Defaults to yesterday (global tz)
 * - Iterates meetings and writes raw JSON + summary
 *
 * Usage:
 *   node agents/fathom/scripts/run.mjs [--from=YYYY-MM-DD] [--to=YYYY-MM-DD] [--limit=50] [--max-pages=50]
 */

// MUST be first import - loads and validates all secrets
import '../../_shared/env-loader.mjs'

import fs from 'node:fs'
import path from 'node:path'
import { iterateMeetings } from '../../_shared/fathom/index.mjs'

const repoRoot = process.cwd()

function getGlobalTimezone() {
  try {
    const t = fs.readFileSync(path.join(repoRoot,'SETTINGS.md'),'utf8')
    const m = /value:\s*([^\n]+)/i.exec(t)
    return (m && m[1].trim()) || 'UTC'
  } catch { return 'UTC' }
}

function toDateInTz(d, tz) {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
  const [y,m,day] = fmt.format(d).split('-').map(Number)
  return new Date(y, m-1, day)
}

function defaultRange(tz) {
  const today = toDateInTz(new Date(), tz)
  const yest = new Date(today.getTime() - 24*60*60*1000)
  const iso = (d)=> d.toISOString().slice(0,10)
  return { from: iso(yest), to: iso(yest) }
}

const args = process.argv.slice(2)
const arg = (k, def)=> {
  const a = args.find(x=> x.startsWith(`--${k}=`))
  return a ? a.split('=')[1] : def
}

const tz = getGlobalTimezone()
const { from: defFrom, to: defTo } = defaultRange(tz)
const from = arg('from', defFrom)
const to = arg('to', defTo)
const limit = parseInt(arg('limit','50'))
const maxPages = parseInt(arg('max-pages','50'))

function ensureDir(p){ fs.mkdirSync(p, { recursive: true }) }

(async () => {
  try {
    const outDir = path.join(repoRoot, 'agents/fathom/outputs', `${from}_to_${to}`)
    ensureDir(outDir)

    const items = []
    for await (const m of iterateMeetings({ pageSize: limit, maxPages, repoRoot })) {
      // Filter client-side by created_at date within [from,to]
      const created = (m.created_at || '').slice(0,10)
      if (created && created >= from && created <= to) items.push(m)
    }

    // Write raw JSON
    fs.writeFileSync(path.join(outDir, 'meetings.raw.json'), JSON.stringify({ tz, from, to, count: items.length, items }, null, 2))

    // Write summary
    const lines = []
    lines.push(`# Fathom Meetings — ${from}${from!==to?` to ${to}`:''} (${tz})`)
    lines.push('')
    lines.push(`Total: ${items.length}`)
    lines.push('')
    for (const it of items.slice(0,50)) {
      lines.push(`- ${it.title || it.meeting_title || '(untitled)'} | ${it.url || ''} | ${it.created_at}`)
    }
    fs.writeFileSync(path.join(outDir, 'summary.md'), lines.join('\n'))

    console.log('WROTE', path.join(outDir, 'meetings.raw.json'))
    console.log('WROTE', path.join(outDir, 'summary.md'))
  } catch (e) {
    console.error('ERROR:', e.message)
    process.exit(1)
  }
})()
