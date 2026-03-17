#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { listGuildChannels } from '../../_shared/discord-fetcher/index.mjs'

const DISCORD = {
  guildId: '1164939432722440282'
}

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

const token = process.env.DISCORD_BOT_TOKEN
if (!token) {
  console.error('Missing DISCORD_BOT_TOKEN')
  process.exit(1)
}

const guildId = DISCORD.guildId
const channels = await listGuildChannels({ guildId, token })
for (const ch of channels) {
  console.log(JSON.stringify({ id: ch.id, name: ch.name, parent_id: ch.parent_id }))
}
