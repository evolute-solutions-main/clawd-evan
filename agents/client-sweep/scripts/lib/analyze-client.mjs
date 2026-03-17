/**
 * analyze-client.mjs
 *
 * LLM analysis module for the client-sweep pipeline.
 * Receives pre-fetched messages → calls LLM with structured JSON output → validates.
 *
 * The LLM does interpretation only. No retrieval, no formatting.
 * Primary: OpenAI (structured output / json_schema mode).
 * Fallback: Anthropic (tool-use to enforce schema).
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load schema once at import time
const SCHEMA_PATH = path.join(__dirname, '../../schemas/client-state.schema.json')
const CANONICAL_SCHEMA = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'))

// OpenAI-compatible schema: strip JSON Schema meta fields
const OAI_SCHEMA = (() => {
  const { $schema, title, description, ...rest } = CANONICAL_SCHEMA
  return rest
})()

// ── Prompt ────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `\
You are a client success analyst for a digital marketing agency that runs paid ad campaigns (Meta/Facebook Ads).

You will receive the last 7 days of Discord messages from a client channel.

Your job: output a structured JSON analysis of the CURRENT STATE of this client relationship.

━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CURRENT STATE ONLY. Focus on what is open, unresolved, or recently surfaced right now.
2. IGNORE CLOSED LOOPS. If an issue was raised and resolved earlier in the week, do not mention it unless it affects the current state.
3. RECENCY IS SIGNAL. The most recent messages override older context. Read the thread top-to-bottom; the bottom is now.
4. BE SPECIFIC. Use real names, concrete items, actual dates. No boilerplate.
5. SERVICE-FIRST. Acknowledge issues clearly, propose practical fixes, bias toward helpful follow-ups.
6. context: exactly 1–2 bullets — facts only, no interpretation yet, no quotes unless wording changes meaning.
7. status: 1–2 narrative sentences. What is actually happening today? Not an enum or label.
8. next: one owner (a real person's first name) → specific action(s). No vague tasks.
9. risk: only if there is a genuine risk (churn signal, escalation, access loss, non-payment). null otherwise.

━━━━━━━━━━━━━━━━━━━━━━━━━━
URGENCY SCORE GUIDE
━━━━━━━━━━━━━━━━━━━━━━━━━━
0 = URGENT   — active blocker, active complaint/dissatisfaction, cancellation request, paused with unresolved issue, escalation
1 = AWAITING — pending client deliverable, team owes a response, unresolved follow-up needed
2 = ACTIVE   — campaign running, minor open items need attention
3 = STABLE   — live and running well, no open issues, light check-in only

━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY CHECKS (run before deciding urgency)
━━━━━━━━━━━━━━━━━━━━━━━━━━
- Did client send a message that still needs a response?
- Are there complaints, dissatisfaction, or budget distress?
- Is there a cancellation or pause request?
- Is there an active blocker (payment, license, tech, access, CRM)?
- Is there a deliverable the client was asked for but hasn't provided?
- Is there a date-specific promise ("resume Monday") that needs tracking?
- Are there unanswered questions from the team?
- If nothing specific is open: assign urgencyScore=3 and suggest a light check-in.

If the situation is still unclear after reading all messages, set needsManualReview: true and describe what is unclear in reviewNote.

Output ONLY valid JSON matching the provided schema. No preamble, no explanation, no markdown fencing.`

// ── Message formatter ─────────────────────────────────────────────────────────

function formatMessages(messages, label) {
  if (!messages || messages.length === 0) return `${label}\n(no messages in this period)`
  const lines = messages.map(m => `[${m.tsUtc.slice(0, 10)} ${m.tsUtc.slice(11, 16)}] ${m.author}: ${m.content}`)
  return `${label}\n${lines.join('\n')}`
}

function buildUserContent({ client, clientMessages }) {
  const parts = [
    `Client: ${client.name}`,
    '',
    formatMessages(clientMessages, '=== CLIENT CHANNEL — last 7 days (oldest → newest, most recent at bottom) ==='),
  ]
  return parts.join('\n')
}

// ── OpenAI call ───────────────────────────────────────────────────────────────

async function callOpenAI(messages) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY')

  const model = process.env.SWEEP_MODEL || 'gpt-4o'

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'client_state',
          strict: true,
          schema: OAI_SCHEMA
        }
      },
      temperature: 0.2
    })
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenAI returned empty content')
  return JSON.parse(content)
}

// ── Anthropic fallback ────────────────────────────────────────────────────────

async function callAnthropic(userContent) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [{
        name: 'output_client_state',
        description: 'Output the structured client state analysis',
        input_schema: OAI_SCHEMA
      }],
      tool_choice: { type: 'any' },
      messages: [{ role: 'user', content: userContent }]
    })
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Anthropic ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  const toolUse = data?.content?.find(b => b.type === 'tool_use' && b.name === 'output_client_state')
  if (!toolUse?.input) throw new Error('Anthropic returned no tool_use block')
  return toolUse.input
}

// ── Schema validation ─────────────────────────────────────────────────────────

function validate(obj, clientName) {
  const errs = []
  if (typeof obj !== 'object' || obj === null) { errs.push('not an object'); throw new Error(errs.join('; ')) }
  if (!Array.isArray(obj.context) || obj.context.length === 0) errs.push('context must be non-empty array')
  if (obj.context?.length > 2) errs.push('context must have ≤2 items')
  if (typeof obj.status !== 'string' || !obj.status.trim()) errs.push('status must be non-empty string')
  if (typeof obj.next !== 'string' || !obj.next.trim()) errs.push('next must be non-empty string')
  if (![0, 1, 2, 3].includes(obj.urgencyScore)) errs.push('urgencyScore must be 0–3')
  if (typeof obj.needsManualReview !== 'boolean') errs.push('needsManualReview must be boolean')
  if (errs.length > 0) throw new Error(`ClientState validation failed [${clientName}]: ${errs.join('; ')}`)
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Analyze a single client using the LLM.
 * Returns a validated ClientState object.
 *
 * @param {object} opts
 * @param {{ name: string, channelId: string }} opts.client
 * @param {object[]} opts.clientMessages  Pre-fetched client channel messages
 * @returns {Promise<object>}             Validated ClientState
 */
export async function analyzeClient({ client, clientMessages }) {
  const userContent = buildUserContent({ client, clientMessages })
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userContent }
  ]

  let result
  try {
    result = await callOpenAI(messages)
  } catch (openAiErr) {
    console.warn(`  [${client.name}] OpenAI failed (${openAiErr.message}) — trying Anthropic fallback`)
    result = await callAnthropic(userContent)
  }

  // Enforce correct clientName regardless of what LLM returned
  result.clientName = client.name

  validate(result, client.name)
  return result
}
