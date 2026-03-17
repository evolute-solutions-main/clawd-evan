// Centralized messaging policy wrapper
// Allowlist: only channel 1475336170916544524 (server 1475336170048065538)
// Denylist: block any send to server 1164939432722440282

import { appendOutbound } from '../chat/index.mjs'

export function allowSend({ guildId, channelId }) {
  const ALLOW_GUILD = '1475336170048065538'
  const ALLOW_CHANNEL = '1475336170916544524'
  const DENY_GUILD = '1164939432722440282'

  if (String(guildId) === DENY_GUILD) return { ok: false, reason: 'denied_guild' }
  if (String(guildId) !== ALLOW_GUILD) return { ok: false, reason: 'not_allowlisted_guild' }
  if (String(channelId) !== ALLOW_CHANNEL) return { ok: false, reason: 'not_allowlisted_channel' }
  return { ok: true }
}

export function logSend({ surface='discord', guildId, channelId, threadId, messageId, text, meta }) {
  try { appendOutbound({ surface, guildId, channelId, threadId, messageId, text, meta }) } catch {}
}

// Usage pattern:
// const gate = allowSend({ guildId, channelId })
// if (!gate.ok) throw new Error(`SEND_BLOCKED: ${gate.reason}`)
// logSend({ surface: 'discord', guildId, channelId, text })
