#!/usr/bin/env node
/**
 * Discord Gateway Bot
 *
 * Connects to Discord and listens for server events.
 * Currently handles:
 *   - guildMemberAdd → creates client channel, marks onboarding steps
 *
 * Runs as a persistent systemd service: discord-bot.service
 *
 * Requires: DISCORD_CHAT_BOT_TOKEN, DISCORD_CLIENTS_CATEGORY_ID in .secrets.env
 */

import '../../agents/_shared/env-loader.mjs'

import { Client, GatewayIntentBits, Events } from 'discord.js'
import { handleMemberJoin } from '../webhooks/handlers/discord-member.mjs'

const GUILD_ID = '1164939432722440282'  // Evolute HQ

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ]
})

client.once(Events.ClientReady, (c) => {
  console.log(`[discord-bot] Ready as ${c.user.tag}`)
  console.log(`[discord-bot] Watching guild ${GUILD_ID} for member joins`)
})

client.on(Events.GuildMemberAdd, async (member) => {
  if (member.guild.id !== GUILD_ID) return
  console.log(`[discord-bot] Member joined: ${member.displayName} (${member.user.id})`)
  try {
    await handleMemberJoin(member)
  } catch (err) {
    console.error(`[discord-bot] Error handling member join for ${member.displayName}:`, err.message)
  }
})

client.on(Events.Error, (err) => {
  console.error('[discord-bot] Client error:', err.message)
})

const token = process.env.DISCORD_CHAT_BOT_TOKEN
if (!token) {
  console.error('[discord-bot] FATAL: DISCORD_CHAT_BOT_TOKEN not set')
  process.exit(1)
}

client.login(token)
