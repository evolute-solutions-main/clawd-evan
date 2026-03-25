/**
 * GHL Webhook Handler
 *
 * Handles inbound webhooks from GoHighLevel.
 * Currently handles: form submissions (onboarding form completed)
 *
 * GHL webhook payload for form submission:
 * {
 *   type: "FormSubmitted",
 *   locationId: "Fv38qyVITGwToy2uDZgc",
 *   contactId: "abc123",
 *   formId: "xxx",
 *   email: "client@example.com",
 *   name: "John Smith",
 *   phone: "...",
 *   customData: { ... }  // form fields
 * }
 *
 * Set up in GHL: Settings → Integrations → Webhooks → Add Webhook
 * URL: https://[your-server]/webhooks/ghl
 * Events: Form Submitted
 */

import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT  = path.resolve(__dirname, '../../..')
const ONBOARDING_FILE = path.join(REPO_ROOT, 'data/onboarding.json')

// The form ID of the onboarding form in GHL
// Set GHL_ONBOARDING_FORM_ID in .secrets.env once you have it
const ONBOARDING_FORM_ID = process.env.GHL_ONBOARDING_FORM_ID || null

export function handleGHLWebhook(req, res) {
  const payload = req.body
  const type    = payload?.type || payload?.event_type

  console.log(`[ghl-webhook] Received: ${type}`, JSON.stringify(payload).slice(0, 200))

  try {
    if (type === 'FormSubmitted' || type === 'form_submitted') {
      handleFormSubmitted(payload)
      return res.status(200).json({ ok: true })
    }

    // Unhandled event type — log and ack
    console.log(`[ghl-webhook] Unhandled event type: ${type} — ignoring`)
    return res.status(200).json({ ok: true, ignored: true })

  } catch (err) {
    console.error('[ghl-webhook] Error handling webhook:', err)
    return res.status(500).json({ error: err.message })
  }
}

function handleFormSubmitted(payload) {
  const email  = payload.email?.toLowerCase()?.trim()
  const formId = payload.formId || payload.form_id

  if (!email) {
    console.warn('[ghl-webhook] FormSubmitted missing email — cannot match client')
    return
  }

  // If a specific form ID is configured, only process that form
  if (ONBOARDING_FORM_ID && formId && formId !== ONBOARDING_FORM_ID) {
    console.log(`[ghl-webhook] Form ${formId} is not the onboarding form — ignoring`)
    return
  }

  // Find matching onboarding client by email
  const data   = JSON.parse(fs.readFileSync(ONBOARDING_FILE, 'utf8'))
  const client = data.clients.find(c =>
    c.status === 'onboarding' &&
    c.email?.toLowerCase() === email
  )

  if (!client) {
    console.warn(`[ghl-webhook] No onboarding client found for email: ${email}`)
    return
  }

  if (client.steps.onboarding_form_submitted?.status === 'complete') {
    console.log(`[ghl-webhook] Onboarding form already marked complete for ${client.companyName} — skipping`)
    return
  }

  // Mark step done
  const result = execFileSync('node', [
    path.join(REPO_ROOT, 'scripts/mark-done.mjs'),
    '--client', client.companyName,
    '--step',   'onboarding_form_submitted',
    '--by',     'ghl_webhook'
  ], { encoding: 'utf8' })

  console.log(`[ghl-webhook] ✅ Marked onboarding_form_submitted for ${client.companyName}`)
  console.log(result)
}
