#!/usr/bin/env node
/**
 * serve.mjs — Local dashboard server
 *
 * Serves the dashboard on http://localhost:3847 and accepts API requests
 * from the browser to update data files.
 *
 * Usage:
 *   node scripts/serve.mjs          (inject data + start server)
 *   node scripts/serve.mjs --no-open (skip opening browser)
 */

import fs          from 'fs'
import http        from 'http'
import path        from 'path'
import crypto      from 'crypto'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const root      = path.resolve(fileURLToPath(import.meta.url), '../../')
const dataDir   = path.join(root, 'data')
const htmlFile  = path.join(root, 'dashboard.html')
const PORT      = 3847
const noOpen    = process.argv.includes('--no-open')

// ── Auth ──────────────────────────────────────────────────────────────────────
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'banana'
const COOKIE_SECRET      = 'ev-dash-2026'
const SESSION_COOKIE     = 'ev_dash_session'

function makeToken() {
  return crypto.createHmac('sha256', COOKIE_SECRET).update(DASHBOARD_PASSWORD).digest('hex')
}

function isAuthed(req) {
  const cookieHeader = req.headers.cookie || ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';')
      .map(c => c.trim().split('='))
      .filter(p => p.length === 2)
      .map(([k, v]) => [k.trim(), decodeURIComponent(v.trim())])
  )
  return cookies[SESSION_COOKIE] === makeToken()
}

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Evolute Dashboard</title>
<style>
* { box-sizing:border-box; margin:0; padding:0; }
body { background:#080a12; color:#e2e8f0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; min-height:100vh; display:flex; align-items:center; justify-content:center; }
.box { background:#0e1018; border:1px solid #1a1d2e; border-radius:14px; padding:40px; width:320px; }
h1 { font-size:1rem; font-weight:700; margin-bottom:4px; }
p { font-size:0.75rem; color:#4a5568; margin-bottom:28px; }
input { background:#080a12; border:1px solid #232640; color:#e2e8f0; padding:11px 14px; border-radius:8px; width:100%; font-size:0.9rem; margin-bottom:12px; outline:none; }
input:focus { border-color:#818cf8; }
input::placeholder { color:#4a5568; }
button { background:#818cf8; border:none; color:#fff; padding:11px; border-radius:8px; width:100%; font-size:0.9rem; font-weight:600; cursor:pointer; }
button:hover { opacity:.9; }
.err { color:#f87171; font-size:0.78rem; margin-bottom:12px; __DISPLAY__ }
</style>
</head>
<body>
<div class="box">
  <h1>Evolute Dashboard</h1>
  <p>Enter password to continue</p>
  <div class="err">Incorrect password</div>
  <form method="POST" action="/login">
    <input type="password" name="password" placeholder="Password" autofocus autocomplete="current-password">
    <button type="submit">Enter</button>
  </form>
</div>
</body>
</html>`

const LOGIN_PAGE       = LOGIN_HTML.replace('__DISPLAY__', 'display:none')
const LOGIN_PAGE_ERROR = LOGIN_HTML.replace('__DISPLAY__', 'display:block')

// ── Inject fresh data into HTML first ────────────────────────────────────────
console.log('Injecting data...')
execSync('node scripts/inject-and-open.mjs --no-open', { cwd: root, stdio: 'ignore' })

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadSalesData() {
  const raw = JSON.parse(fs.readFileSync(path.join(dataDir, 'sales_data.json'), 'utf8'))
  return Array.isArray(raw) ? { appointments: raw, dials: [] } : raw
}

function loadOnboarding() {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, 'onboarding.json'), 'utf8'))
  } catch {
    return { clients: [], alerts: [] }
  }
}

function saveOnboarding(data) {
  fs.writeFileSync(path.join(dataDir, 'onboarding.json'), JSON.stringify(data, null, 2))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end',  ()    => resolve(body))
    req.on('error', reject)
  })
}

function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
  res.end(JSON.stringify(obj))
}

// ── SSE reload ────────────────────────────────────────────────────────────────
const sseClients = new Set()
function broadcastReload() {
  for (const client of sseClients) {
    try { client.write('event: reload\ndata: {}\n\n') } catch {}
  }
}
function broadcastOnboardingUpdate() {
  const payload = JSON.stringify(loadOnboarding())
  for (const client of sseClients) {
    try { client.write(`event: onboarding-update\ndata: ${payload}\n\n`) } catch {}
  }
}

// ── Request handler ───────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {

  // Login page
  if (req.method === 'GET' && req.url === '/login') {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    return res.end(LOGIN_PAGE)
  }

  // Login form submit
  if (req.method === 'POST' && req.url === '/login') {
    const body = await readBody(req)
    const params = new URLSearchParams(body)
    if (params.get('password') === DASHBOARD_PASSWORD) {
      const token = makeToken()
      const maxAge = 30 * 24 * 60 * 60  // 30 days
      res.writeHead(302, {
        'Location': '/',
        'Set-Cookie': `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`
      })
      return res.end()
    }
    res.writeHead(200, { 'Content-Type': 'text/html' })
    return res.end(LOGIN_PAGE_ERROR)
  }

  // Auth check for all other routes
  if (!isAuthed(req)) {
    res.writeHead(302, { Location: '/login' })
    return res.end()
  }

  // SSE: live reload events
  if (req.method === 'GET' && req.url === '/api/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'Access-Control-Allow-Origin': '*' })
    res.write('data: connected\n\n')
    sseClients.add(res)
    req.on('close', () => sseClients.delete(res))
    return
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST' })
    return res.end()
  }

  // Serve dashboard HTML
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const html = fs.readFileSync(htmlFile, 'utf8')
    const patched = html.replace('</head>',
      `<script>window.API_BASE="";` +
      `(function(){const es=new EventSource("/api/events");` +
      `es.addEventListener("reload",()=>location.reload());` +
      `es.addEventListener("onboarding-update",function(e){` +
        `try{window.ONBOARDING_DATA=JSON.parse(e.data);` +
        `if(document.body.classList.contains("ops-mode")&&typeof renderOnboarding==="function")renderOnboarding();}` +
        `catch(err){}` +
      `});` +
      `})()</script></head>`)
    res.writeHead(200, { 'Content-Type': 'text/html' })
    return res.end(patched)
  }

  // API: update a single appointment's outcome fields
  if (req.method === 'POST' && req.url === '/api/update-appointment') {
    try {
      const body    = JSON.parse(await readBody(req))
      const { id, fields } = body
      if (!id || !fields) return json(res, 400, { error: 'id and fields required' })

      const data   = loadSalesData()
      const idx    = data.appointments.findIndex(a => a.id === id)
      if (idx === -1) return json(res, 404, { error: 'appointment not found' })

      const allowed = ['status','source','closer','cashCollected','cashCollectedAfterFirstCall','contractRevenue','followUpBooked','fathomLink','offerMade','excluded','fathomConflictNote','noFathomNote']
      const VALID_STATUSES = ['new','confirmed','closed','not_closed','no_show','cancelled']
      const VALID_SOURCES  = ['Cold SMS','Ads','Referral','Organic']
      const NUM_FIELDS     = ['cashCollected','cashCollectedAfterFirstCall','contractRevenue']

      if (fields.status !== undefined && !VALID_STATUSES.includes(fields.status))
        return json(res, 400, { error: `invalid status '${fields.status}' — must be one of: ${VALID_STATUSES.join(', ')}` })
      if (fields.source !== undefined && !VALID_SOURCES.includes(fields.source))
        return json(res, 400, { error: `invalid source '${fields.source}' — must be one of: ${VALID_SOURCES.join(', ')}` })
      for (const f of NUM_FIELDS) {
        if (fields[f] !== undefined && fields[f] !== null && fields[f] !== '') {
          const n = Number(fields[f])
          if (isNaN(n) || n < 0) return json(res, 400, { error: `${f} must be a non-negative number` })
          fields[f] = n
        }
      }

      const appt = data.appointments[idx]
      const newStatus = fields.status ?? appt.status
      if (['no_show','cancelled'].includes(newStatus) && (fields.fathomLink || appt.fathomLink)) {
        console.warn(`  ⚠ ${appt.contactName}: status set to ${newStatus} but fathomLink exists — flagged for review`)
      }

      if (fields.status && fields.status !== appt.status) {
        appt.statusHistory = appt.statusHistory || []
        appt.statusHistory.push({ status: fields.status, at: new Date().toISOString(), source: 'manual' })
      }

      for (const [k, v] of Object.entries(fields)) {
        if (allowed.includes(k)) data.appointments[idx][k] = v
      }

      fs.writeFileSync(path.join(dataDir, 'sales_data.json'), JSON.stringify(data, null, 2))
      console.log(`[update] ${data.appointments[idx].contactName} — ${JSON.stringify(fields)}`)
      execSync('node scripts/inject-and-open.mjs --no-open', { cwd: root, stdio: 'ignore' })
      broadcastReload()
      return json(res, 200, { ok: true, appointment: data.appointments[idx] })
    } catch (e) {
      return json(res, 500, { error: e.message })
    }
  }

  // API: reload HTML with fresh data
  if (req.method === 'POST' && req.url === '/api/reload') {
    try {
      execSync('node scripts/inject-and-open.mjs --no-open', { cwd: root, stdio: 'ignore' })
      broadcastReload()
      return json(res, 200, { ok: true })
    } catch (e) {
      return json(res, 500, { error: e.message })
    }
  }

  // API: update dials count for a specific week
  if (req.method === 'POST' && req.url === '/api/update-dials') {
    try {
      const body = JSON.parse(await readBody(req))
      const { week, dials } = body
      if (!week || dials === undefined) return json(res, 400, { error: 'week and dials required' })

      const file = path.join(dataDir, 'weekly_dials.json')
      const data = JSON.parse(fs.readFileSync(file, 'utf8'))
      const idx  = data.findIndex(w => w.week === week)
      if (idx !== -1) {
        data[idx].dials = Number(dials)
      } else {
        data.push({ week, dials: Number(dials) })
        data.sort((a, b) => a.week.localeCompare(b.week))
      }
      fs.writeFileSync(file, JSON.stringify(data, null, 2))
      execSync('node scripts/inject-and-open.mjs --no-open', { cwd: root, stdio: 'ignore' })
      broadcastReload()
      console.log(`[dials] ${week} → ${dials}`)
      return json(res, 200, { ok: true })
    } catch (e) {
      return json(res, 500, { error: e.message })
    }
  }

  // API: mark an onboarding step complete
  if (req.method === 'POST' && req.url === '/api/onboarding/mark-done') {
    try {
      const body = JSON.parse(await readBody(req))
      const { clientId, step, deliverable } = body
      if (!clientId || !step) return json(res, 400, { error: 'clientId and step required' })

      const data = loadOnboarding()
      const client = data.clients.find(c => c.id === clientId)
      if (!client) return json(res, 404, { error: 'client not found' })

      const stepObj = client.steps[step]
      if (!stepObj) return json(res, 404, { error: 'step not found' })
      if (stepObj.status === 'complete') return json(res, 200, { ok: true, alreadyDone: true })

      const now   = new Date().toISOString()
      const today = now.split('T')[0]

      stepObj.status      = 'complete'
      stepObj.completedAt = today
      if (deliverable) stepObj.deliverable = deliverable

      client.log = client.log || []
      client.log.push({ timestamp: now, event: 'step_completed', step, by: 'dashboard' })

      if (step === 'campaigns_launched') {
        client.status             = 'launched'
        client.launchedDate       = today
        client.campaignsLaunchedAt = now
      }

      saveOnboarding(data)
      console.log(`[onboarding] ${client.companyName} — "${step}" marked done`)
      execSync('node scripts/inject-and-open.mjs --no-open', { cwd: root, stdio: 'ignore' })
      broadcastOnboardingUpdate()
      return json(res, 200, { ok: true })
    } catch (e) {
      return json(res, 500, { error: e.message })
    }
  }

  // API: log a follow-up attempt on a client step
  if (req.method === 'POST' && req.url === '/api/onboarding/followed-up') {
    try {
      const body = JSON.parse(await readBody(req))
      const { clientId, step } = body
      if (!clientId || !step) return json(res, 400, { error: 'clientId and step required' })

      const data = loadOnboarding()
      const client = data.clients.find(c => c.id === clientId)
      if (!client) return json(res, 404, { error: 'client not found' })

      const stepObj = client.steps[step]
      if (!stepObj) return json(res, 404, { error: 'step not found' })

      const now = new Date().toISOString()
      stepObj.followUpLog = stepObj.followUpLog || []
      stepObj.followUpLog.push({ at: now })

      client.log = client.log || []
      client.log.push({ timestamp: now, event: 'followed_up', step, by: 'dashboard' })

      saveOnboarding(data)
      console.log(`[onboarding] ${client.companyName} — follow-up logged for "${step}"`)
      execSync('node scripts/inject-and-open.mjs --no-open', { cwd: root, stdio: 'ignore' })
      broadcastOnboardingUpdate()
      return json(res, 200, { ok: true })
    } catch (e) {
      return json(res, 500, { error: e.message })
    }
  }

  res.writeHead(404)
  res.end('Not found')
})

server.listen(PORT, () => {
  console.log(`Dashboard: http://localhost:${PORT}`)
  if (!noOpen) {
    try { execSync(`open http://localhost:${PORT}`) } catch {}
  }
})

process.on('SIGINT', () => { server.close(); process.exit() })
