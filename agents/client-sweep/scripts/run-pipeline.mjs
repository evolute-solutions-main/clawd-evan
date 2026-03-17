#!/usr/bin/env node
/**
 * Client Sweep — Deterministic Pipeline (v2)
 *
 * Architecture (replaces run-loop.mjs's all-in-one LLM approach):
 *
 *   [Code] 1. Load client list from Discord (Active + Onboarding categories)
 *   [Code] 2. Fetch last 7 days of messages per client channel + team chat mentions
 *   [Code] 3. Save raw snapshot to outputs/YYYY-MM-DD/raw/ for audit
 *   [LLM]  4. Analyze each client → validated ClientState JSON
 *   [Code] 5. Sort by urgency score, assemble sweep.md
 *   [Code] 6. Publish to Notion
 *
 * LLM handles interpretation only — not retrieval, not formatting.
 *
 * Usage:
 *   node run-pipeline.mjs [--dry-run] [--skip-notion] [--client <name>]
 *
 * Env vars:
 *   SWEEP_WINDOW_DAYS  — days of messages to fetch (default: 7)
 *   SWEEP_CONCURRENCY  — parallel clients (default: 4)
 *   SWEEP_MODEL        — OpenAI model override (default: gpt-4o)
 *
 * Old pipeline: node run-loop.mjs (deprecated — kept for comparison)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { listGuildChannels } from '../../_shared/discord-fetcher/index.mjs'
import { fetchClientMessages } from './lib/fetch-messages.mjs'
import { analyzeClient } from './lib/analyze-client.mjs'
import { assembleReport } from './lib/assemble-report.mjs'

const execFileAsync = promisify(execFile)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AGENT_ROOT = path.join(__dirname, '..')
const REPO_ROOT = path.join(AGENT_ROOT, '../..')
const OUTPUTS_DIR = path.join(AGENT_ROOT, 'outputs')

// ── Config ────────────────────────────────────────────────────────────────────

const DISCORD = {
  guildId: '1164939432722440282',
  categories: {
    activeClients:        '1334610131647987742',
    onboardingInProgress: '1478798565810770104'
  }
}

const NOTION_PARENT_PAGE_ID = '31050a67-1a8f-80bb-80eb-dc5d9c59f646'
const WINDOW_DAYS  = Number(process.env.SWEEP_WINDOW_DAYS  || 7)
const CONCURRENCY  = Number(process.env.SWEEP_CONCURRENCY  || 4)

// ── Secrets ───────────────────────────────────────────────────────────────────

function loadSecrets() {
  try {
    const p = path.join(REPO_ROOT, '.secrets.env')
    const text = fs.readFileSync(p, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
    }
  } catch {}
}

// ── Client list ───────────────────────────────────────────────────────────────

async function loadClientsFromDiscord() {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) throw new Error('PREFLIGHT FAIL: Missing DISCORD_BOT_TOKEN')

  const channels = await listGuildChannels({ guildId: DISCORD.guildId, token })
  const active  = (channels || []).filter(ch => ch && String(ch.parent_id) === String(DISCORD.categories.activeClients))
  const onboard = (channels || []).filter(ch => ch && String(ch.parent_id) === String(DISCORD.categories.onboardingInProgress))

  if (active.length === 0 || onboard.length === 0) {
    throw new Error(
      `PREFLIGHT FAIL: Expected channels in both categories — active=${active.length} onboard=${onboard.length}. ` +
      `Check bot permissions for both category IDs.`
    )
  }

  return {
    clients: [...active, ...onboard].map(ch => ({
      name:     ch.name,
      channelId: ch.id,
      parentId:  ch.parent_id
    })),
    counts: { active: active.length, onboarding: onboard.length, total: active.length + onboard.length }
  }
}

// ── Process one client ────────────────────────────────────────────────────────

async function processClient({ client, rawDir }) {
  console.log(`  → ${client.name}`)

  // [Code] Fetch messages deterministically
  const { clientMessages } = await fetchClientMessages({
    clientChannelId: client.channelId,
    clientName:      client.name,
    guildId:         DISCORD.guildId,
    windowDays:      WINDOW_DAYS,
    repoRoot:        REPO_ROOT
  })

  console.log(`     msgs=${clientMessages.length}`)

  // [Code] Save raw snapshot for audit
  const slug = client.name.replace(/[^\w-]/g, '_')
  fs.writeFileSync(
    path.join(rawDir, `${slug}.json`),
    JSON.stringify({ client, clientMessages, fetchedAt: new Date().toISOString() }, null, 2)
  )

  // [LLM] Analyze → structured ClientState JSON (validated against schema)
  const state = await analyzeClient({ client, clientMessages })

  // [Code] Save state snapshot for audit
  fs.writeFileSync(
    path.join(rawDir, `${slug}-state.json`),
    JSON.stringify(state, null, 2)
  )

  const reviewFlag = state.needsManualReview ? ' ⚠️ REVIEW' : ''
  console.log(`     urgency=${state.urgencyScore}${reviewFlag} — done`)
  return state
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const dryRun      = args.includes('--dry-run')
  const skipNotion  = args.includes('--skip-notion')
  const clientFilter = args.find((_, i, arr) => arr[i - 1] === '--client')

  loadSecrets()

  console.log('🔄 Client Sweep — Deterministic Pipeline v2')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'} | Window: ${WINDOW_DAYS}d | Concurrency: ${CONCURRENCY}`)

  // Preflight: LLM key
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    throw new Error('PREFLIGHT FAIL: Neither OPENAI_API_KEY nor ANTHROPIC_API_KEY found in environment')
  }

  // Step 1: Load clients
  let { clients, counts } = await loadClientsFromDiscord()
  console.log(`Found ${counts.total} clients (active: ${counts.active}, onboarding: ${counts.onboarding})`)

  if (clientFilter) {
    clients = clients.filter(c => c.name.toLowerCase().includes(clientFilter.toLowerCase()))
    console.log(`Filtered to: ${clients.map(c => c.name).join(', ')}`)
  }

  if (dryRun) {
    console.log('\n--- Would process ---')
    for (const c of clients) console.log(`  • ${c.name} (${c.channelId})`)
    return
  }

  const today = new Date().toISOString().split('T')[0]
  const outputDir = path.join(OUTPUTS_DIR, today)
  const rawDir    = path.join(outputDir, 'raw')
  fs.mkdirSync(rawDir, { recursive: true })

  // Steps 2–4: Fetch + analyze (concurrent)
  const queue   = [...clients]
  const results = []
  const errors  = []

  async function worker() {
    while (queue.length) {
      const client = queue.shift()
      try {
        results.push(await processClient({ client, rawDir }))
      } catch (err) {
        console.error(`  ✗ ${client.name}: ${err.message}`)
        errors.push({ client: client.name, error: err.message })
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  if (errors.length > 0) {
    console.warn(`\n⚠️  ${errors.length} client(s) failed — will appear in report footer`)
  }

  if (results.length === 0) {
    throw new Error('No clients processed successfully — aborting')
  }

  // Step 5: Sort (urgencyScore 0 = most urgent) and assemble
  results.sort((a, b) => a.urgencyScore - b.urgencyScore)
  const report = assembleReport(results, today, errors)

  const sweepPath = path.join(outputDir, 'sweep.md')
  fs.writeFileSync(sweepPath, report)
  console.log(`\nWROTE ${sweepPath} (${results.length} clients)`)

  // Step 6: Publish to Notion
  if (!skipNotion) {
    const publishArgs = [
      path.join(REPO_ROOT, 'agents/_shared/notion-publisher/publish.mjs'),
      '--mode=page',
      `--parentPageId=${NOTION_PARENT_PAGE_ID}`,
      '--type=client_sweep',
      `--date=${today}`,
      '--status=success',
      `--sources=${sweepPath}`
    ]
    const { stdout: pubOut } = await execFileAsync('node', publishArgs, { maxBuffer: 10 * 1024 * 1024 })
    console.log(pubOut.trim())
  }
}

main().catch(err => {
  console.error(`\nFATAL: ${err.message}`)
  process.exit(1)
})
