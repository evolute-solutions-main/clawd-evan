#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const p = path.join(process.cwd(), 'state/chats/global.jsonl')
const n = Number(process.argv[2]||50)
if (!fs.existsSync(p)) { console.log('No chat log.'); process.exit(0) }
const data = fs.readFileSync(p, 'utf8').trim().split('\n')
const tail = data.slice(-n)
console.log(tail.join('\n'))
