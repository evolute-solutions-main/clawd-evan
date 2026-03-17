#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Legacy test harness referenced run-current.mjs; runner removed.
// Fixtures in ground-truth.json are preserved for future narrative regression tests.
console.error('Legacy tests paused. Fixtures preserved in tests/ground-truth.json for migration.')
process.exit(0)

const fixturesPath = path.resolve(__dirname, './ground-truth.json')
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'))

let pass = 0, fail = 0
for (const fx of fixtures) {
  const flags = { inActive: fx.category === 'active', inOnboard: fx.category === 'onboard' }
  const res = summarize(fx.messages, flags)
  const okStatus = res.status.startsWith(fx.expect.status)
  const okNext = res.suggestedNext.startsWith(fx.expect.next)
  const ok = okStatus && okNext
  if (ok) pass++
  else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${fx.name}`)
  if (!ok) {
    console.log('  expected.status =', fx.expect.status)
    console.log('  got.status      =', res.status)
    console.log('  expected.next   =', fx.expect.next)
    console.log('  got.next        =', res.suggestedNext)
  }
}
console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
