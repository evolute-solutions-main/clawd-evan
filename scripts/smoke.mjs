#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { smoke } from '../agents/_shared/discord-fetcher/index.mjs'

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

const channels = process.argv.slice(2)
const res = await smoke({ channelIds: channels })
if (!res.ok) {
  console.error('SMOKE FAIL:', res.reason)
  process.exit(1)
}
console.log('SMOKE OK:', res.samples)
