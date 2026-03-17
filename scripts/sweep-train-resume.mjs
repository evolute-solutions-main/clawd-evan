#!/usr/bin/env node
import { loadState, saveState, appendEvent } from '../agents/_shared/state/index.mjs'

const st = loadState('sweep-train')
if (!st) {
  console.error('No sweep-train state found.')
  process.exit(1)
}
const next = (st.nextUp && st.nextUp[0]) ? st.nextUp[0] : null
if (!next) {
  console.log('Nothing next — training complete or not queued.')
  process.exit(0)
}
console.log('Resuming at:', next.client)
appendEvent('sweep-train', { actor: 'user', surface: 'cli', action: 'resume', client: next.client })
// No mutation here; training flow will mutate when a client is completed.
