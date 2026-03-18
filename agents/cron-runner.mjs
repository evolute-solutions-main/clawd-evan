#!/usr/bin/env node
/**
 * Simple cron runner - executes workflows and posts results to Discord
 * 
 * Usage:
 *   node cron-runner.mjs sweep          # Client sweep → post Notion link
 *   node cron-runner.mjs appt-report    # Appt setter report → post summary
 *   node cron-runner.mjs appt-collect   # Appt data collection (no post)
 */

// Load secrets first
import './_shared/env-loader.mjs'

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { postMessage } from './_shared/discord/index.mjs'

// Note: This file is at /root/clawd/agents/cron-runner.mjs
// Imports are relative to that location

const REPO_ROOT = '/root/clawd'
const DISCORD_CHANNEL = '1475336170916544524'

// Post to Discord — uses correct token automatically
async function postToDiscord(message) {
  return postMessage(DISCORD_CHANNEL, message)
}

// Get yesterday's date in São Paulo timezone
function getYesterdayDate() {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const fmt = new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'America/Sao_Paulo', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  })
  return fmt.format(yesterday)
}

// Get today's date in São Paulo timezone
function getTodayDate() {
  const fmt = new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'America/Sao_Paulo', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  })
  return fmt.format(new Date())
}

// Run client sweep
async function runSweep() {
  console.log('Running client sweep...')
  
  const result = execSync(
    `cd ${REPO_ROOT} && node agents/client-sweep/scripts/run-pipeline.mjs 2>&1`,
    { encoding: 'utf8', timeout: 600000 } // 10 min timeout
  )
  
  console.log(result)
  
  // Extract Notion URL from output
  const notionMatch = result.match(/NOTION_PAGE_URL\s+(https:\/\/www\.notion\.so\/[^\s]+)/)
  const notionUrl = notionMatch ? notionMatch[1] : null
  
  // Count clients
  const clientMatch = result.match(/Found (\d+) clients/)
  const clientCount = clientMatch ? clientMatch[1] : '?'
  
  // Check for failures
  const failMatch = result.match(/(\d+) client\(s\) failed/)
  const failCount = failMatch ? failMatch[1] : '0'
  
  const date = getTodayDate()
  let message = `📋 **Client Sweep Complete** — ${date}\n`
  message += `Processed ${clientCount} clients`
  if (failCount !== '0') message += ` (${failCount} failed)`
  message += `\n`
  if (notionUrl) message += `\n${notionUrl}`
  
  await postToDiscord(message)
  console.log('Posted to Discord')
}

// Run appointment setter report
async function runApptReport() {
  const yesterday = getYesterdayDate()
  console.log(`Running appt setter report for ${yesterday}...`)
  
  const result = execSync(
    `cd ${REPO_ROOT} && node agents/appointment-tracking/scripts/run.mjs --date=${yesterday} 2>&1`,
    { encoding: 'utf8', timeout: 300000 } // 5 min timeout
  )
  
  console.log(result)
  
  // Read the generated report
  const reportPath = path.join(REPO_ROOT, `agents/appointment-tracking/outputs/${yesterday}/cold-sms.appointments.report.md`)
  
  let message
  if (fs.existsSync(reportPath)) {
    const report = fs.readFileSync(reportPath, 'utf8')
    
    // Convert to Discord-friendly format (truncate if needed)
    message = `📞 **Appointment Setter Report** — ${yesterday}\n\n`
    
    // Extract key stats from the report
    const lines = report.split('\n')
    const statsSection = []
    let inStats = false
    
    for (const line of lines) {
      if (line.includes('## Summary') || line.includes('# ') || line.match(/^\*\*Total/)) {
        inStats = true
      }
      if (inStats && line.trim()) {
        statsSection.push(line)
        if (statsSection.length > 20) break // Limit length
      }
    }
    
    message += statsSection.join('\n') || report.slice(0, 1500)
    
    // Truncate if too long for Discord
    if (message.length > 1900) {
      message = message.slice(0, 1900) + '\n\n_(truncated)_'
    }
  } else {
    message = `📞 **Appointment Setter Report** — ${yesterday}\n\nNo data found for this date.`
  }
  
  await postToDiscord(message)
  console.log('Posted to Discord')
}

// Run appointment data collection (no Discord post)
async function runApptCollect() {
  const today = getTodayDate()
  console.log(`Collecting appointment data for ${today}...`)
  
  const result = execSync(
    `cd ${REPO_ROOT} && node agents/appointment-tracking/scripts/run.mjs --date=${today} 2>&1`,
    { encoding: 'utf8', timeout: 300000 }
  )
  
  console.log(result)
  console.log('Data collection complete (no Discord post)')
}

// Main
async function main() {
  // Secrets already loaded by env-loader.mjs import
  const cmd = process.argv[2]
  
  switch (cmd) {
    case 'sweep':
      await runSweep()
      break
    case 'appt-report':
      await runApptReport()
      break
    case 'appt-collect':
      await runApptCollect()
      break
    default:
      console.error('Usage: node cron-runner.mjs <sweep|appt-report|appt-collect>')
      process.exit(1)
  }
}

main().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
