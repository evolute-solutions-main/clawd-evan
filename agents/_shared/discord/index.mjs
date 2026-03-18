/**
 * Discord helper — automatically uses correct token for each operation
 * 
 * READ operations (fetch, list) → DISCORD_BOT_TOKEN
 * WRITE operations (post, send) → DISCORD_CHAT_BOT_TOKEN
 * 
 * Usage:
 *   import { fetchMessages, postMessage, listChannels } from '../_shared/discord/index.mjs'
 */

function getReadToken() {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) throw new Error('Missing DISCORD_BOT_TOKEN')
  return token
}

function getWriteToken() {
  const token = process.env.DISCORD_CHAT_BOT_TOKEN
  if (!token) throw new Error('Missing DISCORD_CHAT_BOT_TOKEN')
  return token
}

async function discordRequest(pathname, { token, method = 'GET', body, query } = {}) {
  const url = new URL(`https://discord.com/api/v10${pathname}`)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v != null) url.searchParams.set(k, String(v))
    }
  }
  
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bot ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'EvanBot/1.0'
    },
    body: body ? JSON.stringify(body) : undefined
  })
  
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Discord ${method} ${pathname} failed: ${res.status} ${text}`)
  }
  
  return res.status === 204 ? null : res.json()
}

// ═══════════════════════════════════════════════════════════════════════════════
// READ operations — use fetcher bot (DISCORD_BOT_TOKEN)
// ═══════════════════════════════════════════════════════════════════════════════

export async function listGuildChannels(guildId) {
  return discordRequest(`/guilds/${guildId}/channels`, { token: getReadToken() })
}

export async function fetchMessages(channelId, { limit = 100, before, after } = {}) {
  return discordRequest(`/channels/${channelId}/messages`, {
    token: getReadToken(),
    query: { limit, before, after }
  })
}

export async function getChannel(channelId) {
  return discordRequest(`/channels/${channelId}`, { token: getReadToken() })
}

export async function getGuild(guildId) {
  return discordRequest(`/guilds/${guildId}`, { token: getReadToken() })
}

// ═══════════════════════════════════════════════════════════════════════════════
// WRITE operations — use chat bot (DISCORD_CHAT_BOT_TOKEN)
// ═══════════════════════════════════════════════════════════════════════════════

export async function postMessage(channelId, content) {
  const body = typeof content === 'string' ? { content } : content
  return discordRequest(`/channels/${channelId}/messages`, {
    token: getWriteToken(),
    method: 'POST',
    body
  })
}

export async function editMessage(channelId, messageId, content) {
  const body = typeof content === 'string' ? { content } : content
  return discordRequest(`/channels/${channelId}/messages/${messageId}`, {
    token: getWriteToken(),
    method: 'PATCH',
    body
  })
}

export async function deleteMessage(channelId, messageId) {
  return discordRequest(`/channels/${channelId}/messages/${messageId}`, {
    token: getWriteToken(),
    method: 'DELETE'
  })
}

export async function addReaction(channelId, messageId, emoji) {
  const encoded = encodeURIComponent(emoji)
  return discordRequest(`/channels/${channelId}/messages/${messageId}/reactions/${encoded}/@me`, {
    token: getWriteToken(),
    method: 'PUT'
  })
}
