/**
 * Discord Member Join Handler
 *
 * Called when a new member joins the Evolute HQ Discord server.
 * - Matches them to an onboarding client by username/display name
 * - Marks client_joined_discord as complete
 * - Creates a private channel for their company
 * - Adds the client to that channel
 *
 * This is NOT an HTTP webhook — it's called from the Discord gateway
 * bot when a guildMemberAdd event fires.
 *
 * Integration point in gateway:
 *   client.on('guildMemberAdd', member => handleMemberJoin(member))
 *
 * Requires DISCORD_CHAT_BOT_TOKEN (write permissions) — not the read-only fetcher bot.
 *
 * Discord API used:
 *   POST /guilds/{guildId}/channels  — create channel
 *   PUT  /channels/{channelId}/permissions/{userId}  — grant access
 */

import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT  = path.resolve(__dirname, '../../..')
const ONBOARDING_FILE = path.join(REPO_ROOT, 'data/onboarding.json')

const GUILD_ID        = '1164939432722440282'  // Evolute HQ
const CLIENTS_CATEGORY_ID = process.env.DISCORD_CLIENTS_CATEGORY_ID || null
// Set DISCORD_CLIENTS_CATEGORY_ID in .secrets.env — the category where client channels live

export async function handleMemberJoin(member) {
  if (member.guild.id !== GUILD_ID) return  // Only handle Evolute HQ

  const userId      = member.user.id
  const displayName = member.displayName?.toLowerCase()
  const username    = member.user.username?.toLowerCase()

  console.log(`[discord-member] New member joined: ${member.displayName} (${userId})`)

  // Try to match to an onboarding client
  const data   = JSON.parse(fs.readFileSync(ONBOARDING_FILE, 'utf8'))
  const client = findMatchingClient(data.clients, displayName, username)

  if (!client) {
    console.log(`[discord-member] No onboarding client matched for ${member.displayName} — no action taken`)
    return
  }

  console.log(`[discord-member] Matched to client: ${client.companyName}`)

  // Mark client_joined_discord
  execFileSync('node', [
    path.join(REPO_ROOT, 'scripts/mark-done.mjs'),
    '--client', client.companyName,
    '--step',   'client_joined_discord',
    '--by',     'discord_event'
  ], { encoding: 'utf8' })

  console.log(`[discord-member] ✅ Marked client_joined_discord for ${client.companyName}`)

  // Create their channel and add them
  await createClientChannel(member, client, userId)
}

function findMatchingClient(clients, displayName, username) {
  return clients.find(c => {
    if (c.status !== 'onboarding') return false
    const company = c.companyName.toLowerCase()
    const name    = c.name.toLowerCase()
    // Match on company name, client name, or first name
    return (
      displayName?.includes(name.split(' ')[0]) ||
      displayName?.includes(company.split(' ')[0]) ||
      username?.includes(name.split(' ')[0]) ||
      username?.includes(company.replace(/\s+/g, '').slice(0, 6))
    )
  })
}

async function createClientChannel(member, client, userId) {
  const token     = process.env.DISCORD_CHAT_BOT_TOKEN
  const channelName = client.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  // Create the channel
  const createPayload = {
    name:      channelName,
    type:      0,  // GUILD_TEXT
    topic:     `${client.companyName} — client channel`,
    parent_id: CLIENTS_CATEGORY_ID || undefined,
    permission_overwrites: [
      // Deny @everyone
      { id: GUILD_ID, type: 0, deny: '1024' },
      // Allow the client
      { id: userId,   type: 1, allow: '3072' }  // VIEW_CHANNEL + SEND_MESSAGES
    ]
  }

  const createRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/channels`, {
    method: 'POST',
    headers: {
      'Authorization': `Bot ${token}`,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify(createPayload)
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    console.error(`[discord-member] Failed to create channel for ${client.companyName}:`, err)
    return
  }

  const channel = await createRes.json()
  console.log(`[discord-member] ✅ Created channel #${channelName} (${channel.id}) for ${client.companyName}`)

  // Save channel ID to onboarding record
  const data   = JSON.parse(fs.readFileSync(ONBOARDING_FILE, 'utf8'))
  const record = data.clients.find(c => c.id === client.id)
  if (record) {
    record.discordChannelId = channel.id
    fs.writeFileSync(ONBOARDING_FILE, JSON.stringify(data, null, 2))
  }

  // Mark discord_channel_created
  execFileSync('node', [
    path.join(REPO_ROOT, 'scripts/mark-done.mjs'),
    '--client', client.companyName,
    '--step',   'discord_channel_created',
    '--by',     'auto'
  ], { encoding: 'utf8' })

  // Send welcome message in the new channel
  await fetch(`https://discord.com/api/v10/channels/${channel.id}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bot ${token}`,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify({
      content: `Welcome, ${member.displayName}! This is your dedicated channel. Your onboarding is underway — we'll keep you updated here as things progress.`
    })
  })
}
