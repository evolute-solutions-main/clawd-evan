import fs from 'node:fs'
import path from 'node:path'

const CHAT_DIR = path.resolve(process.cwd(), 'state/chats')
const GLOBAL_PATH = path.join(CHAT_DIR, 'global.jsonl')

function ensureDir() { fs.mkdirSync(CHAT_DIR, { recursive: true }) }

export function appendChat(evt) {
  ensureDir()
  const now = new Date().toISOString()
  const rec = {
    ts: now,
    surface: evt.surface || 'unknown',
    guildId: evt.guildId || null,
    channelId: evt.channelId || null,
    threadId: evt.threadId || null,
    messageId: evt.messageId || null,
    direction: evt.direction || 'in', // 'in' | 'out'
    author: evt.author || null,       // { id, name } or string id
    role: evt.role || null,           // 'user'|'assistant'|'system'|'bot'
    text: evt.text || '',
    meta: evt.meta || null
  }
  const line = JSON.stringify(rec) + '\n'
  fs.appendFileSync(GLOBAL_PATH, line)
}

export function appendOutbound({ surface, guildId, channelId, threadId, messageId, text, meta }) {
  appendChat({ surface, guildId, channelId, threadId, messageId, direction: 'out', author: 'evan', role: 'assistant', text, meta })
}

export function appendInbound({ surface, guildId, channelId, threadId, messageId, author, role='user', text, meta }) {
  appendChat({ surface, guildId, channelId, threadId, messageId, direction: 'in', author, role, text, meta })
}
