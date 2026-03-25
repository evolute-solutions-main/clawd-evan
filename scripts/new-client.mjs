#!/usr/bin/env node
/**
 * new-client.mjs — Create a new onboarding record when a client is signed
 *
 * Run this immediately after closing a deal on the sales call.
 * Marks payment, contract, welcome email as complete and kicks off
 * the onboarding checklist with all dependencies pre-wired.
 *
 * Usage:
 *   node scripts/new-client.mjs --name "John Smith" --company "Smith Roofing" --email "john@smithroofing.com"
 *   node scripts/new-client.mjs --name "John Smith" --company "Smith Roofing" --email "john@smithroofing.com" --contract-end "2026-09-25" --fathom "https://fathom.ai/..." --stripe "cus_xxx"
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')
const ONBOARDING_FILE = path.join(REPO_ROOT, 'data/onboarding.json')

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const get = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null }

const name        = get('--name')
const company     = get('--company') || name
const email       = get('--email')
const contractEnd = get('--contract-end')
const fathomLink  = get('--fathom')
const stripeId    = get('--stripe')

if (!name || !email) {
  console.error('Usage: node scripts/new-client.mjs --name "Name" --email "email@example.com" [--company "Co"] [--contract-end "YYYY-MM-DD"] [--fathom "url"] [--stripe "cus_xxx"]')
  process.exit(1)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const now   = new Date().toISOString()
const today = now.split('T')[0]
const id    = 'client_' + company.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now()

function makeSteps() {
  return {
    // ── Already done at signing ──────────────────────────────────────────────
    payment_collected: {
      status: 'complete', completedAt: today,
      autoDetected: true, trigger: 'manual',
      note: 'Collected on closing call'
    },
    contract_signed: {
      status: 'complete', completedAt: today,
      autoDetected: false, trigger: 'manual'
    },
    welcome_email_sent: {
      status: 'complete', completedAt: today,
      autoDetected: true, trigger: 'auto',
      note: 'Triggered by contract signing'
    },
    added_to_daily_sweep: {
      status: 'complete', completedAt: today,
      autoDetected: true, trigger: 'auto',
      note: 'Clients enter sweep at signing, not at launch'
    },

    // ── Client actions (auto-detected via webhooks) ──────────────────────────
    onboarding_form_submitted: {
      status: 'pending', completedAt: null,
      autoDetected: true, trigger: 'ghl_webhook',
      dependsOn: ['contract_signed']
    },
    client_joined_discord: {
      status: 'pending', completedAt: null,
      autoDetected: true, trigger: 'discord_event',
      dependsOn: ['contract_signed']
    },
    discord_channel_created: {
      status: 'pending', completedAt: null,
      autoDetected: true, trigger: 'auto',
      dependsOn: ['client_joined_discord'],
      note: 'Bot auto-creates company channel and adds client'
    },

    // ── Client actions (manual) ──────────────────────────────────────────────
    facebook_access_granted: {
      status: 'pending', completedAt: null,
      autoDetected: false, owner: 'accountManager',
      dependsOn: ['onboarding_form_submitted']
    },
    client_media_submitted: {
      status: 'pending', completedAt: null,
      autoDetected: false, owner: 'accountManager',
      dependsOn: ['onboarding_form_submitted'],
      note: 'Authentic photos/videos — business owner face, team'
    },

    // ── Media Buyer ──────────────────────────────────────────────────────────
    ad_scripts_created: {
      status: 'pending', completedAt: null,
      autoDetected: false, owner: 'mediaBuyer',
      dependsOn: ['onboarding_form_submitted'],
      note: 'AI generates draft from intake form + Fathom sales call. Media Buyer reviews and finalizes. Send to Video Editor via Discord + Asana.'
    },

    // ── Video Editor ─────────────────────────────────────────────────────────
    ad_creatives_produced: {
      status: 'pending', completedAt: null,
      autoDetected: false, owner: 'videoEditor',
      dependsOn: ['ad_scripts_created', 'client_media_submitted']
    },
    creatives_approved: {
      status: 'pending', completedAt: null,
      autoDetected: false, owner: 'accountManager',
      dependsOn: ['ad_creatives_produced'],
      note: 'Only required for high-production videos'
    },

    // ── Media Buyer (campaigns) ───────────────────────────────────────────────
    meta_campaigns_built: {
      status: 'pending', completedAt: null,
      autoDetected: false, owner: 'mediaBuyer',
      dependsOn: ['creatives_approved', 'facebook_access_granted']
    },

    // ── Account Manager/CSM ───────────────────────────────────────────────────
    ghl_subaccount_configured: {
      status: 'pending', completedAt: null,
      autoDetected: false, owner: 'accountManager',
      dependsOn: ['meta_campaigns_built'],
      note: 'Full SOP in Notion — to be linked here'
    },
    onboarding_call_completed: {
      status: 'pending', completedAt: null,
      autoDetected: false, owner: 'accountManager',
      dependsOn: ['ghl_subaccount_configured', 'meta_campaigns_built', 'onboarding_form_submitted', 'client_joined_discord'],
      note: 'Book ONLY when all deps done. Covers: LeadConnector install, software walkthrough, calendar connect, example lead fired.'
    },

    // ── Launch ────────────────────────────────────────────────────────────────
    campaigns_launched: {
      status: 'pending', completedAt: null,
      autoDetected: false, owner: 'accountManager',
      dependsOn: ['onboarding_call_completed'],
      note: 'CSM/Account Manager switches campaigns on'
    },
    launch_date_logged: {
      status: 'pending', completedAt: null,
      autoDetected: true, trigger: 'auto',
      dependsOn: ['campaigns_launched']
    },
    post_launch_checkin_scheduled: {
      status: 'pending', completedAt: null,
      autoDetected: false, owner: 'accountManager',
      dependsOn: ['campaigns_launched'],
      note: '~2 weeks post-launch'
    }
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────

const data = JSON.parse(fs.readFileSync(ONBOARDING_FILE, 'utf8'))

// Remove example record if still present
data.clients = data.clients.filter(c => c.id !== 'client_example')

// Check for duplicate
if (data.clients.find(c => c.email === email)) {
  console.warn(`⚠️  A client with email ${email} already exists. Aborting to avoid duplicate.`)
  process.exit(1)
}

const client = {
  id,
  name,
  companyName: company,
  email,
  contractSignedDate: today,
  contractEndDate: contractEnd || null,
  stripeCustomerId: stripeId || null,
  fathomSalesCallLink: fathomLink || null,
  discordChannelId: null,
  status: 'onboarding',
  assignedRoles: {
    accountManager: 'bilal',
    mediaBuyer: 'bilal',
    videoEditor: null
  },
  steps: makeSteps(),
  log: [{ timestamp: now, event: 'client_created', note: 'Signed by Max. Created via new-client.mjs.' }]
}

data.clients.push(client)
fs.writeFileSync(ONBOARDING_FILE, JSON.stringify(data, null, 2))

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n✅ Client created: ${name} (${company})`)
console.log(`   ID:            ${id}`)
console.log(`   Email:         ${email}`)
console.log(`   Contract end:  ${contractEnd || 'not set — add with --contract-end'}`)
console.log(`   Fathom call:   ${fathomLink  || 'not set — add with --fathom'}`)
console.log(`   Stripe ID:     ${stripeId    || 'not set — add with --stripe'}`)
console.log(`\n📋 Unlocked immediately:`)
console.log(`   [Account Manager] Follow up with client to complete onboarding funnel`)
console.log(`   [Media Buyer]     Waiting on onboarding form — then scripts can begin`)
console.log(`\n💡 Tip: add Fathom link now if you have it — needed for AI script generation`)
console.log(`   node scripts/new-client.mjs ... --fathom "https://..."`)
