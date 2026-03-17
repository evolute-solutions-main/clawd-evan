/**
 * fetch-messages.mjs
 *
 * Deterministic Discord message fetcher for the client-sweep pipeline.
 * Fetches the last N days of messages from a client channel (oldest→newest),
 * then fetches team chat mentions of that client from enrichment channels.
 *
 * No business logic here — pure data retrieval.
 */

import fs from 'node:fs'
import path from 'node:path'

// ── Timezone helper (mirrors shared discord-fetcher) ──────────────────────────

function readTimezone(repoRoot) {
  try {
    const p = path.join(repoRoot, 'SETTINGS.md')
    const text = fs.readFileSync(p, 'utf8')
    const m = /value:\s*([^\n]+)/i.exec(text)
    return (m && m[1].trim()) || 'UTC'
  } catch {
    return 'UTC'
  }
}

// ── Discord API ───────────────────────────────────────────────────────────────

async function discordRequest(pathname, { token, query } = {}) {
  const url = new URL(`https://discord.com/api/v10${pathname}`)
  if (query) Object.entries(query).forEach(([k, v]) => v != null && url.searchParams.set(k, String(v)))
  while (true) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bot ${token}`,
        'User-Agent': 'EvanFetcher/1.0 (+https://evolute.local)'
      }
    })
    if (res.status === 429) {
      const retry = Number(res.headers.get('retry-after')) || 1
      await new Promise(r => setTimeout(r, (retry + 0.25) * 1000))
      continue
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Discord API ${url.pathname} failed: ${res.status} ${res.statusText} ${text}`)
    }
    return res.json()
  }
}

function buildPermalink({ guildId, channelId, messageId }) {
  if (!guildId) return undefined
  return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`
}

/**
 * Fetch all messages in a channel since `cutoff` (Date).
 * Paginates backwards, stops when a message timestamp is older than the cutoff.
 * Returns messages sorted oldest-first (chronological order).
 */
async function fetchSince({ channelId, cutoff, token, guildId, tz }) {
  const rows = []
  let before = undefined

  while (true) {
    const page = await discordRequest(`/channels/${channelId}/messages`, {
      token,
      query: { limit: 100, ...(before ? { before } : {}) }
    })
    if (!Array.isArray(page) || page.length === 0) break

    let hitCutoff = false
    for (const m of page) {
      if (new Date(m.timestamp) < cutoff) {
        hitCutoff = true
        break
      }
      rows.push({
        id: m.id,
        channelId,
        author: m.author?.username || 'Unknown',
        content: m.content || '',
        tsUtc: m.timestamp,
        permalink: buildPermalink({ guildId, channelId, messageId: m.id })
      })
      before = m.id
    }
    if (hitCutoff || page.length < 100) break
  }

  // Return oldest-first (chronological) for LLM readability
  return rows.reverse()
}

// ── Client name → search tokens ───────────────────────────────────────────────

/**
 * Extract meaningful search tokens from a Discord channel name.
 * Used to find client mentions in team chats.
 *
 * Examples:
 *   "🌭-flh-services"         → ["flh", "services"]
 *   "🅱️-braymiller-builders"  → ["braymiller", "builders"]
 *   "🍕-velento-electric-company" → ["velento", "electric", "company"]
 */
export function extractSearchTokens(channelName) {
  // Strip leading emoji / symbol characters and leading hyphens
  const cleaned = channelName.replace(/^[\p{Emoji}\p{So}\u{FE0F}\u{20E3}-]+/u, '').replace(/^-+/, '')
  return cleaned
    .split('-')
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 2)
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Fetch client channel messages and team chat mentions for the past `windowDays`.
 *
 * @param {object}   opts
 * @param {string}   opts.clientChannelId  Discord channel ID for this client
 * @param {string}   opts.clientName       Channel name (used for team chat mention matching)
 * @param {string[]} opts.teamChatIds      Team chat channel IDs to search for mentions
 * @param {string}   opts.guildId          Discord guild ID (used for message permalinks)
 * @param {number}   [opts.windowDays=7]   How many days back to fetch
 * @param {string}   [opts.repoRoot]       Repo root path (for SETTINGS.md timezone read)
 *
 * @returns {{ clientMessages: object[], teamMentions: object[], searchTokens: string[] }}
 */
export async function fetchClientMessages({
  clientChannelId,
  clientName,
  teamChatIds = [],
  guildId,
  windowDays = 7,
  repoRoot = process.cwd()
}) {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) throw new Error('Missing DISCORD_BOT_TOKEN in environment')

  const tz = readTimezone(repoRoot)
  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)

  // Fetch client channel messages
  const clientMessages = await fetchSince({ channelId: clientChannelId, cutoff, token, guildId, tz })

  // Fetch team chat mentions (search each team chat for client name tokens)
  const searchTokens = extractSearchTokens(clientName)
  const teamMentions = []

  if (searchTokens.length > 0 && teamChatIds.length > 0) {
    for (const chatId of teamChatIds) {
      const msgs = await fetchSince({ channelId: chatId, cutoff, token, guildId, tz })
      const matches = msgs.filter(m => {
        const lc = m.content.toLowerCase()
        return searchTokens.some(tok => lc.includes(tok))
      })
      teamMentions.push(...matches)
    }
    // Keep oldest-first across all team chats
    teamMentions.sort((a, b) => a.tsUtc.localeCompare(b.tsUtc))
  }

  return { clientMessages, teamMentions, searchTokens }
}
