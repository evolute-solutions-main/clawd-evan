#!/usr/bin/env node
// Dump confirmed messages content for a given date

// MUST be first import - loads and validates all secrets
import '../../_shared/env-loader.mjs'

import { fetchChannelWindow } from '../../_shared/discord-fetcher/index.mjs'
import { CHANNELS } from './appointmentsDailyReport.mjs'

const repoRoot = process.cwd()

const dateArg = process.argv.find(a => a.startsWith('--date='))
const date = dateArg ? dateArg.split('=')[1] : null
if (!date) {
  console.error('Usage: node agents/appointment-tracking/scripts/dump-confirmed.mjs --date=YYYY-MM-DD')
  process.exit(1)
}

const rows = await fetchChannelWindow({ channelIds: [CHANNELS.confirmed], date, repoRoot, guildId: '1164939432722440282' })
const zapier = rows.filter(r => r.author.toLowerCase() === 'zapier')
for (const r of zapier) {
  const snippet = (r.content || '').replace(/\s+/g,' ').slice(0, 400)
  console.log(JSON.stringify({ id: r.id, timeLocal: r.tsLocal, channelId: r.channelId, contentSnippet: snippet }))
}
