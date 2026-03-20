#!/usr/bin/env node
/**
 * Test isSalesCall function against recent Fathom calls
 */

import '../../_shared/env-loader.mjs'
import { listMeetings } from '../../_shared/fathom/index.mjs'
import { isSalesCall } from '../lib/is-sales-call.mjs'

const limit = parseInt(process.argv[2]) || 5

console.log(`Testing isSalesCall() on ${limit} most recent calls...\n`)

const { items } = await listMeetings({ limit, includeTranscript: true })

for (const call of items) {
  const title = call.title || call.meeting_title || '(no title)'
  const date = call.created_at?.split('T')[0] || 'unknown'
  const participants = (call.participants || []).map(p => p.display_name || p.name || 'unknown').join(', ')
  
  console.log(`─────────────────────────────────────────`)
  console.log(`Title: ${title}`)
  console.log(`Date: ${date}`)
  console.log(`Participants: ${participants || '(none listed)'}`)
  console.log(`URL: ${call.url || 'N/A'}`)
  
  const result = await isSalesCall(call)
  
  console.log(`\n→ isSalesCall: ${result}`)
  console.log()
}

console.log(`─────────────────────────────────────────`)
console.log('Done.')
