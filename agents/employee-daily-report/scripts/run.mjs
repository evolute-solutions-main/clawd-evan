#!/usr/bin/env node
// Employee Daily Report runner (Davi + Bilal)
// - Gathers Discord updates for each person
// - Gathers recent Asana activity from configured projects
// - Writes outputs/YYYY-MM-DD/{davi.md,bilal.md}

import fs from 'node:fs'
import path from 'node:path'
import { listGuildChannels, fetchRecentChannel } from '../../_shared/discord-fetcher/index.mjs'
import { asanaListProjectTasks, asanaListStories } from '../../_shared/asana/index.mjs'

function loadSecrets(repoRoot) {
  try {
    const p = path.join(repoRoot, '.secrets.env')
    const text = fs.readFileSync(p, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
      if (m) {
        const [, k, v] = m
        if (!process.env[k]) process.env[k] = v
      }
    }
  } catch {}
}

const repoRoot = process.cwd()
loadSecrets(repoRoot)

const SOP = {
  asanaProjects: ['1212818114959823', '1212871372765494'],
  discord: {
    davi: '1459289532372357253',
    bilal: '1469019592302006426'
  },
  guildId: '1164939432722440282'
}

function ensureDir(p){ fs.mkdirSync(p, { recursive: true }) }

function parseArgs(){
  const dateArg = process.argv.find(a => a.startsWith('--date='))
  if (!dateArg) throw new Error('Usage: run.mjs --date=YYYY-MM-DD')
  return dateArg.split('=')[1]
}

function fmtLines(lines){ return (lines||[]).filter(Boolean).join('\n') }

async function gatherDiscordSummary(channelId, token, limit=100){
  const msgs = await fetchRecentChannel({ channelId, limit, token })
  const top = msgs.slice(0, 50)
  const bullets = []
  for (const m of top) {
    const txt = (m.content||'').replace(/\s+/g,' ').trim()
    if (!txt) continue
    const ts = new Date(m.timestamp||m.tsUtc||m.ts).toISOString()
    bullets.push(`- ${ts} — ${txt.slice(0, 180)}`)
    if (bullets.length >= 10) break
  }
  return bullets
}

async function gatherAsanaWindowSummary({ projects, date }){
  // Simple heuristic: list tasks modified since the window start; pull top few stories
  const startIso = `${date}T00:00:00Z`
  const items = []
  for (const pid of projects) {
    try {
      const tasks = await asanaListProjectTasks({ projectGid: pid, opt_fields: 'gid,name,modified_at,completed,completed_at', modified_since: startIso })
      for (const t of (tasks||[]).slice(0, 20)) {
        let note = `${t.name} ${t.completed ? '(completed)' : ''}`
        try {
          const stories = await asanaListStories({ taskGid: t.gid, limit: 5 })
          const recent = (stories||[]).slice(-2).map(s=> s.text || s.html_text || '').filter(Boolean)
          if (recent.length) note += ` — ${recent.join(' | ').slice(0, 160)}`
        } catch {}
        items.push(`- ${new Date(t.modified_at).toISOString()} — ${note}`)
        if (items.length >= 20) break
      }
    } catch (e) {
      items.push(`- Asana fetch error: ${String(e.message||e).slice(0,180)}`)
    }
  }
  return items
}

function renderPerson(name, asanaBullets, discordBullets){
  const lines = []
  lines.push(`# ${name} — Daily Report`)
  lines.push('')
  lines.push('## Yesterday (completed/progressed)')
  lines.push(asanaBullets.length ? fmtLines(asanaBullets) : '- (no notable changes found)')
  lines.push('')
  lines.push('## Today (to‑do / focus)')
  lines.push('- (from Discord context)')
  lines.push(discordBullets.length ? fmtLines(discordBullets) : '- (no explicit statements found)')
  lines.push('')
  lines.push('## Risks/Blockers (optional)')
  lines.push('- (none flagged)')
  lines.push('')
  lines.push('## Questions for Max (optional)')
  lines.push('- (none)')
  return lines.join('\n')
}

;(async () => {
  try {
    const date = parseArgs()
    const outDir = path.join(repoRoot, 'agents/employee-daily-report/outputs', date)
    ensureDir(outDir)

    const token = process.env.DISCORD_BOT_TOKEN
    if (!token) throw new Error('Missing DISCORD_BOT_TOKEN')

    const asanaBullets = await gatherAsanaWindowSummary({ projects: SOP.asanaProjects, date })

    const daviDiscord = await gatherDiscordSummary(SOP.discord.davi, token)
    const bilalDiscord = await gatherDiscordSummary(SOP.discord.bilal, token)

    const daviMd = renderPerson('Davi', asanaBullets, daviDiscord)
    const bilalMd = renderPerson('Bilal', asanaBullets, bilalDiscord)

    fs.writeFileSync(path.join(outDir, 'davi.md'), daviMd)
    fs.writeFileSync(path.join(outDir, 'bilal.md'), bilalMd)

    console.log('WROTE', path.join(outDir, 'davi.md'))
    console.log('WROTE', path.join(outDir, 'bilal.md'))
  } catch (e) {
    const date = (process.argv.find(a=>a.startsWith('--date='))||'').split('=')[1] || 'unknown'
    const outDir = path.join(repoRoot, 'agents/employee-daily-report/outputs', date)
    ensureDir(outDir)
    fs.writeFileSync(path.join(outDir, 'BLOCKER.txt'), `runner_error: ${String(e.stack||e)}`)
    console.error('EMPLOYEE_DAILY_ERROR:', e)
    process.exit(1)
  }
})()
