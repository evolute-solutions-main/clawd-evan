#!/usr/bin/env node
/**
 * Probe Fathom API connectivity
 * Usage: node agents/fathom/scripts/probe.mjs [--limit=10]
 */

import { listMeetings } from '../../_shared/fathom/index.mjs'

const limitArg = process.argv.find(a => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 5

try {
  const { items = [], next_cursor, rate } = await listMeetings({ limit })
  console.log(`OK: fetched ${items.length} meeting(s); next_cursor=${!!next_cursor}`)
  if (rate) console.log('Rate:', rate)
  for (const m of items) {
    console.log(`- ${m.title || m.meeting_title || '(untitled)'} | ${m.url || ''} | ${m.created_at}`)
  }
} catch (e) {
  console.error('ERROR:', e.message)
  process.exit(1)
}
