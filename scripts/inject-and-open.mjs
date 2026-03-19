import fs from 'fs'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const root = path.resolve(fileURLToPath(import.meta.url), '../../')
const dataFile = path.join(root, 'raw_appts_march.json')
const htmlFile = path.join(root, 'appts_march.html')

const data = fs.readFileSync(dataFile, 'utf8').trim()
let html = fs.readFileSync(htmlFile, 'utf8')
html = html.replace(/const RAW = \[[\s\S]*?\];/, 'const RAW = ' + data + ';')
fs.writeFileSync(htmlFile, html)
execSync(`open "${htmlFile}"`)
console.log('Done.')
