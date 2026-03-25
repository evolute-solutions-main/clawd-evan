#!/usr/bin/env node
/**
 * mark-done.mjs — Mark an onboarding step complete for a client
 *
 * Called by Evan when a team member says "Facebook access done for Smith Roofing"
 * or checks a box in the dashboard. Never called directly by humans.
 *
 * Usage:
 *   node scripts/mark-done.mjs --client "Smith Roofing" --step "facebook_access_granted"
 *   node scripts/mark-done.mjs --client "smith" --step "facebook"   (fuzzy match)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')
const ONBOARDING_FILE = path.join(REPO_ROOT, 'data/onboarding.json')

// ── Args ──────────────────────────────────────────────────────────────────────

const args   = process.argv.slice(2)
const get    = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null }

const clientArg = get('--client')
const stepArg   = get('--step')
const actor     = get('--by') || 'unknown'

if (!clientArg || !stepArg) {
  console.error('Usage: node scripts/mark-done.mjs --client "Company Name" --step "step_key" [--by "name"]')
  process.exit(1)
}

// ── Fuzzy match helpers ───────────────────────────────────────────────────────

function matchClient(clients, query) {
  const q = query.toLowerCase()
  return clients.find(c =>
    c.companyName.toLowerCase().includes(q) ||
    c.name.toLowerCase().includes(q) ||
    c.id.toLowerCase().includes(q)
  )
}

function matchStep(steps, query) {
  const q = query.toLowerCase().replace(/[\s-]/g, '_')
  // Exact match first
  if (steps[q]) return q
  // Partial match
  return Object.keys(steps).find(k => k.includes(q) || q.includes(k.replace(/_/g, '')))
}

// ── Step labels (for readable output) ────────────────────────────────────────

const STEP_LABELS = {
  payment_collected:             'Payment collected',
  contract_signed:               'Contract signed',
  welcome_email_sent:            'Welcome email sent',
  added_to_daily_sweep:          'Added to daily sweep',
  onboarding_form_submitted:     'Client completed onboarding form',
  client_joined_discord:         'Client joined Discord',
  discord_channel_created:       'Discord channel created',
  facebook_access_granted:       'Facebook access granted & verified',
  client_media_submitted:        'Client submitted photos/videos',
  ad_scripts_created:            'Ad scripts created',
  ad_creatives_produced:         'Ad creatives produced',
  creatives_approved:            'Creatives approved by client',
  meta_campaigns_built:          'Meta campaigns built',
  ghl_subaccount_configured:     'GHL subaccount configured',
  onboarding_call_completed:     'Onboarding call completed',
  campaigns_launched:            'Campaigns launched',
  launch_date_logged:            'Launch date logged',
  post_launch_checkin_scheduled: 'Post-launch check-in scheduled'
}

// ── Dependency evaluator ──────────────────────────────────────────────────────

function getNewlyUnlocked(steps, justCompletedKey) {
  const unlocked = []
  for (const [key, step] of Object.entries(steps)) {
    if (step.status === 'complete') continue
    if (step.autoDetected) continue
    const deps = step.dependsOn || []
    if (!deps.includes(justCompletedKey)) continue
    const allDepsNowDone = deps.every(d => steps[d]?.status === 'complete')
    if (allDepsNowDone) unlocked.push({ key, owner: step.owner, label: STEP_LABELS[key] || key })
  }
  return unlocked
}

// ── Main ──────────────────────────────────────────────────────────────────────

const data = JSON.parse(fs.readFileSync(ONBOARDING_FILE, 'utf8'))

const client = matchClient(data.clients, clientArg)
if (!client) {
  console.error(`No onboarding client found matching "${clientArg}"`)
  console.error(`Active clients: ${data.clients.filter(c => c.status === 'onboarding').map(c => c.companyName).join(', ')}`)
  process.exit(1)
}

const stepKey = matchStep(client.steps, stepArg)
if (!stepKey) {
  console.error(`No step found matching "${stepArg}" for ${client.companyName}`)
  console.error(`Available steps: ${Object.keys(client.steps).join(', ')}`)
  process.exit(1)
}

const step = client.steps[stepKey]

if (step.status === 'complete') {
  console.log(`⚠️  "${STEP_LABELS[stepKey]}" is already marked complete for ${client.companyName} (${step.completedAt})`)
  process.exit(0)
}

// Mark complete
const now   = new Date().toISOString()
const today = now.split('T')[0]

step.status      = 'complete'
step.completedAt = today

client.log.push({
  timestamp: now,
  event:     'step_completed',
  step:      stepKey,
  by:        actor
})

// Check if this is a launch event — update client status
if (stepKey === 'campaigns_launched') {
  client.status = 'launched'
  client.launchedDate = today
}

// Find newly unlocked steps
const newlyUnlocked = getNewlyUnlocked(client.steps, stepKey)

// Save
fs.writeFileSync(ONBOARDING_FILE, JSON.stringify(data, null, 2))

// ── Output ────────────────────────────────────────────────────────────────────

console.log(`\n✅ [${client.companyName}] "${STEP_LABELS[stepKey]}" marked complete`)

if (newlyUnlocked.length > 0) {
  console.log(`\n🔓 Now unlocked:`)
  for (const u of newlyUnlocked) {
    console.log(`   [${u.owner || 'auto'}] ${u.label}`)
  }
} else {
  console.log(`   No new steps unlocked yet — waiting on other dependencies.`)
}

// Output JSON for Evan to parse and relay to team
console.log('\n---JSON---')
console.log(JSON.stringify({
  client: client.companyName,
  step: stepKey,
  label: STEP_LABELS[stepKey],
  newlyUnlocked
}))
