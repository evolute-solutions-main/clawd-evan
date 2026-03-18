#!/usr/bin/env node
/**
 * Fathom (fathom.ai) API client
 * - Loads FATHOM_API_TOKEN or FATHOM_API_KEY from .secrets.env
 * - Provides helpers for common operations
 */

import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_BASE = 'https://api.fathom.ai/external/v1'

function loadSecrets(repoRoot = process.cwd()) {
  try {
    const envPath = path.join(repoRoot, '.secrets.env')
    const text = fs.readFileSync(envPath, 'utf8')
    const out = {}
    for (const line of text.split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
      if (m) out[m[1]] = m[2]
    }
    return out
  } catch {
    return {}
  }
}

function getConfig(repoRoot = process.cwd()) {
  const env = { ...process.env, ...loadSecrets(repoRoot) }
  const token = env.FATHOM_API_TOKEN || env.FATHOM_API_KEY
  const base = env.FATHOM_API_BASE || DEFAULT_BASE
  if (!token) throw new Error('Missing FATHOM_API_TOKEN in .secrets.env')
  return { token, base }
}

async function fetchJson(url, { method = 'GET', headers = {}, body } = {}) {
  const res = await fetch(url, { method, headers, body })
  if (res.status === 204) return null
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Fathom API ${method} ${url} failed: ${res.status} ${text}`)
  }
  const json = await res.json()
  return { json, headers: res.headers }
}

/**
 * List meetings with optional cursor pagination.
 * @param {Object} opts
 * @param {number} [opts.limit=50]
 * @param {string} [opts.cursor]
 * @param {boolean} [opts.includeTranscript=false] - Include full transcript in response
 * @param {boolean} [opts.includeSummary=false] - Include summary in response
 * @param {boolean} [opts.includeActionItems=false] - Include action items in response
 * @param {string} [opts.repoRoot]
 */
export async function listMeetings({ limit = 50, cursor, includeTranscript = false, includeSummary = false, includeActionItems = false, repoRoot } = {}) {
  const { token, base } = getConfig(repoRoot)
  const u = new URL(base.replace(/\/$/, '') + '/meetings')
  if (limit) u.searchParams.set('limit', String(limit))
  if (cursor) u.searchParams.set('cursor', cursor)
  if (includeTranscript) u.searchParams.set('include_transcript', 'true')
  if (includeSummary) u.searchParams.set('include_summary', 'true')
  if (includeActionItems) u.searchParams.set('include_action_items', 'true')

  const { json, headers } = await fetchJson(u.toString(), {
    headers: { 'X-Api-Key': token }
  })
  return { ...json, rate: extractRate(headers) }
}

/** Extract basic rate limit headers */
function extractRate(h) {
  return {
    limit: h.get('RateLimit-Limit'),
    remaining: h.get('RateLimit-Remaining'),
    reset: h.get('RateLimit-Reset')
  }
}

/**
 * Format transcript array into readable text
 * @param {Array} transcript - Array of {speaker, text, timestamp} objects
 * @param {Object} [opts]
 * @param {boolean} [opts.includeTimestamps=false]
 * @param {boolean} [opts.includeSpeakerNames=true]
 * @returns {string}
 */
export function formatTranscript(transcript, { includeTimestamps = false, includeSpeakerNames = true } = {}) {
  if (!Array.isArray(transcript)) return ''
  return transcript.map(entry => {
    const parts = []
    if (includeTimestamps && entry.timestamp) parts.push(`[${entry.timestamp}]`)
    if (includeSpeakerNames && entry.speaker?.display_name) parts.push(`${entry.speaker.display_name}:`)
    parts.push(entry.text || '')
    return parts.join(' ')
  }).join('\n')
}

/**
 * Paged iterator for meetings
 * @param {Object} opts
 * @param {number} [opts.pageSize=50]
 * @param {number} [opts.maxPages=100]
 * @param {boolean} [opts.includeTranscript=false]
 * @param {boolean} [opts.includeSummary=false]
 * @param {boolean} [opts.includeActionItems=false]
 * @param {string} [opts.repoRoot]
 */
export async function* iterateMeetings({ pageSize = 50, maxPages = 100, includeTranscript = false, includeSummary = false, includeActionItems = false, repoRoot } = {}) {
  let cursor
  for (let i = 0; i < maxPages; i++) {
    const { items = [], next_cursor } = await listMeetings({ 
      limit: pageSize, 
      cursor, 
      includeTranscript, 
      includeSummary, 
      includeActionItems, 
      repoRoot 
    })
    for (const it of items) yield it
    if (!next_cursor || items.length === 0) break
    cursor = next_cursor
  }
}

// Note: Use agents/fathom/scripts/probe.mjs for CLI testing
