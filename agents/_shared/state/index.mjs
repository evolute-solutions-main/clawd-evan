import fs from 'node:fs'
import path from 'node:path'

const SESS_DIR = path.resolve(process.cwd(), 'state/session')
const EVENTS_DIR = path.resolve(process.cwd(), 'state/events')

function ensureDirs() {
  fs.mkdirSync(SESS_DIR, { recursive: true })
  fs.mkdirSync(EVENTS_DIR, { recursive: true })
}

function statePath(key) { return path.join(SESS_DIR, `${key}.json`) }
function eventsPath(key) { return path.join(EVENTS_DIR, `${key}.jsonl`) }

export function loadState(key) {
  ensureDirs()
  const p = statePath(key)
  if (!fs.existsSync(p)) return null
  const txt = fs.readFileSync(p, 'utf8')
  try { return JSON.parse(txt) } catch { return null }
}

export function saveState(key, draftFn, actor='system', surface='local') {
  ensureDirs()
  const p = statePath(key)
  const prev = loadState(key) || { key, asOf: null, meta: { version: 0 } }
  const next = JSON.parse(JSON.stringify(prev))
  draftFn(next)
  next.key = key
  next.asOf = new Date().toISOString()
  next.meta = next.meta || {}
  next.meta.version = (prev.meta?.version || 0) + 1
  next.meta.lastActor = actor
  next.meta.lastSurface = surface
  const tmp = p + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2))
  fs.renameSync(tmp, p)
  return next
}

export function appendEvent(key, event) {
  ensureDirs()
  const p = eventsPath(key)
  const line = JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n'
  fs.appendFileSync(p, line)
}
