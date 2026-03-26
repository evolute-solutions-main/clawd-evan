/**
 * Stripe Webhook Handler
 *
 * Handles inbound webhooks from Stripe.
 * Currently handles:
 *   - payment_intent.succeeded → mark payment_collected, create client record if needed
 *   - customer.created         → log new customer for cross-referencing
 *
 * Set up in Stripe: Developers → Webhooks → Add endpoint
 * URL: https://[your-server]/webhooks/stripe
 * Events: payment_intent.succeeded, customer.created
 *
 * Add STRIPE_WEBHOOK_SECRET to .secrets.env (from Stripe webhook dashboard)
 * Add STRIPE_SECRET_KEY to .secrets.env
 */

import Stripe from 'stripe'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'url'
import fs from 'node:fs'
import { postMessage } from '../../_shared/discord/index.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT  = path.resolve(__dirname, '../../..')
const ONBOARDING_FILE = path.join(REPO_ROOT, 'data/onboarding.json')

const OPS_CHANNEL_ID = process.env.DISCORD_OPS_CHANNEL_ID || '1475336170916544524'

function saveAlert(type, message, payload) {
  const data = JSON.parse(fs.readFileSync(ONBOARDING_FILE, 'utf8'))
  if (!data.alerts) data.alerts = []
  data.alerts.push({
    id:         `alert_${Date.now()}`,
    type,
    status:     'pending',
    message,
    receivedAt: new Date().toISOString(),
    resolvedAt: null,
    payload
  })
  fs.writeFileSync(ONBOARDING_FILE, JSON.stringify(data, null, 2))
  console.warn(`[stripe-webhook] Alert saved — type: ${type}`)
}

async function alertOps(message) {
  try {
    await postMessage(OPS_CHANNEL_ID, `⚠️ **Stripe Payment — needs manual review**\n${message}`)
  } catch (err) {
    console.error('[stripe-webhook] Failed to post Discord alert:', err.message)
  }
}

// Lazy init — Stripe key may not be set yet
let _stripe = null
function getStripe() {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not set in .secrets.env')
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  }
  return _stripe
}

export async function handleStripeWebhook(req, res) {
  const sig     = req.headers['stripe-signature']
  const secret  = process.env.STRIPE_WEBHOOK_SECRET

  if (!secret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET not set — cannot verify signature')
    return res.status(500).json({ error: 'Webhook secret not configured' })
  }

  let event
  try {
    // req.rawBody is set by the server for Stripe signature verification
    event = getStripe().webhooks.constructEvent(req.rawBody, sig, secret)
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook signature invalid: ${err.message}` })
  }

  console.log(`[stripe-webhook] Received: ${event.type}`)

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object)
        break
      case 'customer.created':
        handleCustomerCreated(event.data.object)
        break
      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type} — ignoring`)
    }
    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('[stripe-webhook] Error handling event:', err)
    return res.status(500).json({ error: err.message })
  }
}

async function handlePaymentSucceeded(paymentIntent) {
  const email    = paymentIntent.receipt_email?.toLowerCase()?.trim()
  const amount   = paymentIntent.amount / 100  // Stripe amounts are in cents
  const stripeId = paymentIntent.customer

  console.log(`[stripe-webhook] Payment succeeded: $${amount} from ${email || 'unknown'}`)

  if (!email) {
    const msg = `Payment of $${amount} received but no email on the payment intent. Stripe customer: ${stripeId || 'unknown'}`
    saveAlert('payment_no_email', msg, { amount, stripeId })
    await alertOps(`${msg}\n\nResolve: link manually via \`mark-done.mjs\` once you identify the client.`)
    return
  }

  const data   = JSON.parse(fs.readFileSync(ONBOARDING_FILE, 'utf8'))
  const client = data.clients.find(c =>
    c.status === 'onboarding' &&
    c.email?.toLowerCase() === email
  )

  if (!client) {
    const msg = `Payment of $${amount} received from \`${email}\` but no onboarding client matched. Could be a renewal, a new client not yet added, or an email mismatch.`
    saveAlert('payment_no_client_match', msg, { amount, email, stripeId })
    await alertOps(`${msg}\n\nIf this is a new client: \`node scripts/new-client.mjs --name "..." --email "${email}" --stripe "${stripeId || ''}"\`\nIf existing client with wrong email: update their record and run \`mark-done.mjs\` manually.`)
    return
  }

  // Attach Stripe customer ID if we don't have it yet
  if (!client.stripeCustomerId && stripeId) {
    client.stripeCustomerId = stripeId
    fs.writeFileSync(ONBOARDING_FILE, JSON.stringify(data, null, 2))
    console.log(`[stripe-webhook] Linked Stripe customer ${stripeId} to ${client.companyName}`)
  }

  // Mark payment collected
  if (client.steps.payment_collected?.status !== 'complete') {
    execFileSync('node', [
      path.join(REPO_ROOT, 'scripts/mark-done.mjs'),
      '--client', client.companyName,
      '--step',   'payment_collected',
      '--by',     'stripe_webhook'
    ], { encoding: 'utf8' })
    console.log(`[stripe-webhook] ✅ Marked payment_collected for ${client.companyName}`)
  }
}

function handleCustomerCreated(customer) {
  const email    = customer.email?.toLowerCase()?.trim()
  const stripeId = customer.id
  const name     = customer.name

  console.log(`[stripe-webhook] New Stripe customer: ${name} (${email}) — ${stripeId}`)

  if (!email) return

  // Attach Stripe ID to matching onboarding client if found
  const data   = JSON.parse(fs.readFileSync(ONBOARDING_FILE, 'utf8'))
  const client = data.clients.find(c =>
    c.status === 'onboarding' &&
    c.email?.toLowerCase() === email
  )

  if (client && !client.stripeCustomerId) {
    client.stripeCustomerId = stripeId
    fs.writeFileSync(ONBOARDING_FILE, JSON.stringify(data, null, 2))
    console.log(`[stripe-webhook] Linked Stripe customer ${stripeId} to ${client.companyName}`)
  }
}
