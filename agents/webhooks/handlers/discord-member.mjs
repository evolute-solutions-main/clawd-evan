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

import { getClients, updateClient, upsertAlert } from '../../_shared/db.mjs'
import { postMessage } from '../../_shared/discord/index.mjs'

const GUILD_ID            = '1164939432722440282'  // Evolute HQ
const CLIENTS_CATEGORY_ID = process.env.DISCORD_CLIENTS_CATEGORY_ID || null
const OPS_CHANNEL_ID      = process.env.DISCORD_OPS_CHANNEL_ID || '1475336170916544524'
// Set DISCORD_CLIENTS_CATEGORY_ID in .secrets.env — the category where client channels live

// ── Step completion helper (inlined from mark-done logic) ─────────────────────

function completeStep(client, stepKey, actor) {
  const step = client.onboarding?.steps?.[stepKey]
  if (!step || step.status === 'complete') return false

  const now   = new Date().toISOString()
  const today = now.split('T')[0]

  step.status      = 'complete'
  step.completedAt = today

  client.onboarding.log = client.onboarding.log || []
  client.onboarding.log.push({
    timestamp: now,
    event:     'step_completed',
    step:      stepKey,
    by:        actor
  })

  // Check if onboarding_call_booked is newly unlocked
  const steps = client.onboarding.steps
  const callStep = steps['onboarding_call_booked']
  if (callStep && callStep.status !== 'complete' && callStep.readyToBookTrigger) {
    const deps = callStep.dependsOn || []
    const allDone = deps.every(d => steps[d]?.status === 'complete')
    if (allDone && !client.onboarding.readyToBookCallAt) {
      client.onboarding.readyToBookCallAt = now
      client.onboarding.log.push({
        timestamp: now,
        event:     'ready_to_book_call',
        note:      'All pre-call deps met. Send booking link to client in Discord. Dashboard task created.'
      })
    }
  }

  return true
}

export async function handleMemberJoin(member) {
  if (member.guild.id !== GUILD_ID) return  // Only handle Evolute HQ

  const userId      = member.user.id
  const displayName = member.displayName?.toLowerCase()
  const username    = member.user.username?.toLowerCase()

  console.log(`[discord-member] New member joined: ${member.displayName} (${userId})`)

  // Try to match to an onboarding client
  const clients = await getClients()
  const match = findMatchingClient(clients, displayName, username)

  if (!match) {
    console.warn(`[discord-member] No onboarding client matched for ${member.displayName} (${userId})`)
    await upsertAlert({
      id:         `alert_${Date.now()}`,
      type:       'discord_join_no_match',
      status:     'pending',
      message:    `Discord member joined with no onboarding client match. Display name: ${member.displayName} | Username: ${member.user.username} | User ID: ${userId}`,
      receivedAt: new Date().toISOString(),
      resolvedAt: null,
      payload:    { userId, displayName: member.displayName, username: member.user.username }
    })
    try {
      await postMessage(OPS_CHANNEL_ID, `⚠️ **New Discord member — no onboarding match**\nDisplay name: ${member.displayName} | Username: ${member.user.username}\n\nIf this is a client, resolve with:\n\`node scripts/mark-done.mjs --client "Company Name" --step client_joined_discord\`\nThen manually create their channel if needed.`)
    } catch (err) {
      console.error('[discord-member] Failed to post alert:', err.message)
    }
    return
  }

  const { client, confident, lowConfidence } = match

  // Low-confidence match: one expecting client but no name match — save as pending and ask for manual confirmation
  if (lowConfidence) {
    console.warn(`[discord-member] Low-confidence match: ${member.displayName} → ${client.companyName}`)
    await upsertAlert({
      id:         `alert_${Date.now()}`,
      type:       'discord_join_pending_match',
      status:     'pending',
      message:    `Discord member joined — possible match: **${member.displayName}** → **${client.companyName}**. Please confirm in dashboard.`,
      receivedAt: new Date().toISOString(),
      resolvedAt: null,
      payload:    { userId, displayName: member.displayName, username: member.user.username, suggestedClientId: client.id, suggestedClientName: client.companyName }
    })
    try {
      await postMessage(OPS_CHANNEL_ID, `❓ **New Discord member — confirm match**\nDisplay name: ${member.displayName} | Username: ${member.user.username}\n\nPossible match: **${client.companyName}** (submitted form but no name match)\n\nConfirm with:\n\`node scripts/mark-done.mjs --client "${client.companyName}" --step client_joined_discord\`\nThen create their channel if confirmed.`)
    } catch (err) {
      console.error('[discord-member] Failed to post alert:', err.message)
    }
    return
  }

  console.log(`[discord-member] Matched to client: ${client.companyName} (confident: ${confident})`)

  // Mark client_joined_discord inline
  completeStep(client, 'client_joined_discord', 'discord_event')
  await updateClient(client.id, { onboarding: client.onboarding })
  console.log(`[discord-member] ✅ Marked client_joined_discord for ${client.companyName}`)

  // Create their channel and add them
  await createClientChannel(member, client, userId)
}

function findMatchingClient(clients, displayName, username) {
  // Priority 1: clients who submitted the form but haven't joined Discord yet
  // These are the most likely candidates for a new join
  const expecting = clients.filter(c =>
    c.onboarding?.status === 'onboarding' &&
    c.onboarding.steps?.onboarding_form_submitted?.status === 'complete' &&
    c.onboarding.steps?.client_joined_discord?.status !== 'complete'
  )

  // Priority 2: all other onboarding clients (signed but form not yet submitted)
  const others = clients.filter(c =>
    c.onboarding?.status === 'onboarding' &&
    c.onboarding.steps?.client_joined_discord?.status !== 'complete' &&
    !expecting.find(e => e.id === c.id)
  )

  const ordered = [...expecting, ...others]

  for (const c of ordered) {
    const company   = c.companyName.toLowerCase()
    const name      = c.name.toLowerCase()
    const firstName = name.split(' ')[0]

    const matched = (
      displayName?.includes(firstName) ||
      displayName?.includes(company.split(' ')[0]) ||
      username?.includes(firstName) ||
      username?.includes(company.replace(/\s+/g, '').slice(0, 6))
    )

    if (matched) return { client: c, confident: expecting.includes(c) }
  }

  // No name match — if there is exactly one "expecting" client, return as low-confidence
  if (expecting.length === 1) {
    return { client: expecting[0], confident: false, lowConfidence: true }
  }

  return null
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

  // Save channel ID to client record and mark discord_channel_created
  completeStep(client, 'discord_channel_created', 'auto')
  await updateClient(client.id, { discordChannelId: channel.id, onboarding: client.onboarding })

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
