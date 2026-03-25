#!/usr/bin/env node
/**
 * Onboarding Agent — Daily Briefing
 *
 * Reads all active onboarding clients, walks the dependency graph,
 * and outputs a per-role action list. No one has to think about
 * what's next — this tells them.
 *
 * Usage:
 *   node agents/onboarding/scripts/run.mjs
 *   node agents/onboarding/scripts/run.mjs --client "Smith Roofing"   (single client)
 *   node agents/onboarding/scripts/run.mjs --dry-run                  (console only, no Discord)
 *
 * Output (for now): console + agents/onboarding/outputs/YYYY-MM-DD/briefing.md
 * Discord posting: added once team channels are configured
 */

import '../../_shared/env-loader.mjs'

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT  = path.resolve(__dirname, '../../..')
const ONBOARDING_FILE = path.join(REPO_ROOT, 'data/onboarding.json')
const OUTPUTS_DIR = path.join(__dirname, '../outputs')

const args       = process.argv.slice(2)
const filterName = args.includes('--client') ? args[args.indexOf('--client') + 1]?.toLowerCase() : null
const dryRun     = args.includes('--dry-run')
const today      = new Date().toISOString().split('T')[0]

// ── Step labels ───────────────────────────────────────────────────────────────

const STEP_LABELS = {
  payment_collected:           'Payment collected',
  contract_signed:             'Contract signed',
  welcome_email_sent:          'Welcome email sent',
  added_to_daily_sweep:        'Added to daily sweep',
  onboarding_form_submitted:   'Client completes onboarding form',
  client_joined_discord:       'Client joins Discord',
  discord_channel_created:     'Discord channel created for client',
  facebook_access_granted:     'Facebook access granted & verified',
  client_media_submitted:      'Client submits photos/videos',
  ad_scripts_created:          'Ad scripts created (AI + review)',
  ad_creatives_produced:       'Ad creatives produced',
  creatives_approved:          'Creatives approved by client',
  meta_campaigns_built:        'Meta campaigns built in Ads Manager',
  ghl_subaccount_configured:   'GHL subaccount created & configured',
  onboarding_call_completed:   'Onboarding call completed',
  campaigns_launched:          'Campaigns launched',
  launch_date_logged:          'Launch date logged',
  post_launch_checkin_scheduled: 'Post-launch check-in scheduled (~2 weeks)'
}

// ── Dependency evaluator ──────────────────────────────────────────────────────

function evaluateSteps(steps) {
  const results = { unlocked: [], blocked: [], complete: [], waiting_auto: [] }

  for (const [key, step] of Object.entries(steps)) {
    if (step.status === 'complete') {
      results.complete.push(key)
      continue
    }

    const deps = step.dependsOn || []
    const depsComplete = deps.every(d => steps[d]?.status === 'complete')

    if (!depsComplete) {
      const pendingDeps = deps.filter(d => steps[d]?.status !== 'complete')
      results.blocked.push({ key, pendingDeps })
      continue
    }

    // Dependencies met — is it auto or manual?
    if (step.autoDetected) {
      results.waiting_auto.push(key)
    } else {
      results.unlocked.push({ key, owner: step.owner, note: step.note })
    }
  }

  return results
}

// ── Phase label ───────────────────────────────────────────────────────────────

function getPhase(steps) {
  const s = steps
  if (s.campaigns_launched?.status === 'complete')        return 'LAUNCHED'
  if (s.onboarding_call_completed?.status === 'complete') return 'LAUNCHING'
  if (s.ghl_subaccount_configured?.status === 'complete') return 'ONBOARDING CALL READY'
  if (s.meta_campaigns_built?.status === 'complete')      return 'GHL SETUP'
  if (s.ad_creatives_produced?.status === 'complete')     return 'CAMPAIGNS BUILD'
  if (s.ad_scripts_created?.status === 'complete')        return 'CREATIVE PRODUCTION'
  if (s.onboarding_form_submitted?.status === 'complete') return 'PRODUCTION'
  if (s.contract_signed?.status === 'complete')           return 'AWAITING CLIENT FUNNEL'
  return 'NEW'
}

// ── Main ──────────────────────────────────────────────────────────────────────

const data = JSON.parse(fs.readFileSync(ONBOARDING_FILE, 'utf8'))

let clients = data.clients.filter(c => c.status === 'onboarding')
if (filterName) clients = clients.filter(c => c.companyName.toLowerCase().includes(filterName))

if (clients.length === 0) {
  console.log('No active onboarding clients.')
  process.exit(0)
}

// Build per-role action lists
const roleActions = {
  accountManager: [],
  mediaBuyer:     [],
  videoEditor:    [],
  auto:           []
}

const clientSummaries = []

for (const client of clients) {
  const eval_ = evaluateSteps(client.steps)
  const phase  = getPhase(client.steps)

  // Bucket unlocked steps by owner
  for (const item of eval_.unlocked) {
    const bucket = roleActions[item.owner] || roleActions.accountManager
    bucket.push({ client: client.companyName, step: item.key, label: STEP_LABELS[item.key] || item.key, note: item.note })
  }

  // Auto steps waiting
  for (const key of eval_.waiting_auto) {
    roleActions.auto.push({ client: client.companyName, step: key, label: STEP_LABELS[key] || key })
  }

  // Blocked steps (for context)
  const blockedSummary = eval_.blocked.map(b => ({
    step: STEP_LABELS[b.key] || b.key,
    waitingOn: b.pendingDeps.map(d => STEP_LABELS[d] || d)
  }))

  clientSummaries.push({
    name: client.companyName,
    phase,
    unlocked: eval_.unlocked.length,
    blocked: blockedSummary,
    complete: eval_.complete.length,
    total: Object.keys(client.steps).length
  })
}

// ── Format output ─────────────────────────────────────────────────────────────

const lines = []

lines.push(`# Onboarding Briefing — ${today}`)
lines.push(`${clients.length} client(s) in onboarding\n`)

// Per-client status overview
lines.push(`## Client Status`)
for (const c of clientSummaries) {
  lines.push(`\n### ${c.name}`)
  lines.push(`Phase: ${c.phase} | ${c.complete}/${c.total} steps complete`)
  if (c.unlocked > 0) lines.push(`${c.unlocked} step(s) ready to action`)
  if (c.blocked.length > 0) {
    lines.push(`Blocked steps:`)
    for (const b of c.blocked) {
      lines.push(`  - "${b.step}" → waiting on: ${b.waitingOn.join(', ')}`)
    }
  }
}

// Per-role action lists
lines.push(`\n---\n`)
lines.push(`## Action List — Account Manager / CSM`)
if (roleActions.accountManager.length === 0) {
  lines.push(`Nothing to action right now.`)
} else {
  for (const a of roleActions.accountManager) {
    lines.push(`- [ ] [${a.client}] ${a.label}${a.note ? `\n      → ${a.note}` : ''}`)
  }
}

lines.push(`\n## Action List — Media Buyer`)
if (roleActions.mediaBuyer.length === 0) {
  lines.push(`Nothing to action right now.`)
} else {
  for (const a of roleActions.mediaBuyer) {
    lines.push(`- [ ] [${a.client}] ${a.label}${a.note ? `\n      → ${a.note}` : ''}`)
  }
}

lines.push(`\n## Action List — Video Editor`)
if (roleActions.videoEditor.length === 0) {
  lines.push(`Nothing to action right now.`)
} else {
  for (const a of roleActions.videoEditor) {
    lines.push(`- [ ] [${a.client}] ${a.label}${a.note ? `\n      → ${a.note}` : ''}`)
  }
}

if (roleActions.auto.length > 0) {
  lines.push(`\n## Waiting on Automation`)
  lines.push(`These steps are unlocked but waiting on a webhook/event:`)
  for (const a of roleActions.auto) {
    lines.push(`- [${a.client}] ${a.label}`)
  }
}

const output = lines.join('\n')

// ── Write output ──────────────────────────────────────────────────────────────

console.log(output)

if (!dryRun) {
  const outDir = path.join(OUTPUTS_DIR, today)
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'briefing.md'), output)
  console.log(`\n✅ Written to agents/onboarding/outputs/${today}/briefing.md`)
}

// TODO: Post to Discord team channels once configured
