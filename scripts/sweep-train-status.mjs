#!/usr/bin/env node
import { loadState } from '../agents/_shared/state/index.mjs'

const st = loadState('sweep-train')
if (!st) {
  console.log('No sweep-train state found.')
  process.exit(0)
}
console.log('Sweep-Train Status as of', st.asOf)
console.log('- Completed:', st.completed?.length || 0)
for (const c of (st.completed||[])) console.log(`  • ${c.client}: ${c.status} | Next: ${c.next}`)
console.log('- Next Up:')
for (const n of (st.nextUp||[])) console.log(`  • ${n.client}`)
console.log('- Tests:', st.tests?.passed, 'passed; failing:', (st.tests?.failing||[]).length)
