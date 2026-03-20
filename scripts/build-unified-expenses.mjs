import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(fileURLToPath(import.meta.url), '../../')
const data = path.join(root, 'data')
const busExp = JSON.parse(fs.readFileSync(path.join(data, 'business_expenses.json'), 'utf8'))
const curExp = JSON.parse(fs.readFileSync(path.join(data, 'expenses.json'), 'utf8'))

// Payroll entries from expenses.json (manual records, Jan-Mar 2026)
const payrollRecords = curExp.filter(e => e.category === 'payroll' && e.date)
  .map(e => ({ ...e, _matched: false }))

function matchPayroll(date, amount) {
  // Prefer exact date match first, then within 7 days — among those pick closest amount
  let best = null, bestScore = Infinity
  for (const p of payrollRecords) {
    if (p._matched) continue
    const dayDiff = Math.abs(new Date(date) - new Date(p.date)) / 86400000
    const amtDiff = Math.abs(amount - p.amount)
    if (dayDiff <= 7 && amtDiff <= 5) {
      const score = dayDiff * 10 + amtDiff
      if (score < bestScore) { best = p; bestScore = score }
    }
  }
  if (best) best._matched = true
  return best
}

function classifyBank(e) {
  const n = (e.name || '').toLowerCase()
  const amt = e.amount

  if (amt < 0) {
    const isGHL = n.includes('highlevel') || n.includes('high level')
    return { vendor: isGHL ? 'GoHighLevel' : e.name, description: isGHL ? 'GHL affiliate payout' : 'Refund', category: 'refund', channel: null, department: null, excludeFromCAC: true }
  }

  if (n.includes('rrdnadera'))
    return { vendor: 'Randy Ray Nadera', description: 'Setter payroll', category: 'payroll', channel: 'cold_sms', department: 'Setter', excludeFromCAC: false }

  if (n.includes('highlevel') || n.includes('gohigh'))
    return { vendor: 'GoHighLevel', description: 'GHL subscription / sub-accounts', category: 'software', channel: 'cold_sms', department: null, excludeFromCAC: false }

  if (n.includes('facebk') || n.includes('facebook'))
    return { vendor: 'Meta', description: 'Meta ad spend', category: 'ad_spend', channel: 'ads', department: null, excludeFromCAC: false }

  if (n.includes('avry') || n.includes('stroeve'))
    return { vendor: 'Avry Stroeve', description: 'Growth specialist payroll', category: 'payroll', channel: null, department: 'Growth', excludeFromCAC: true }

  if (n.includes('s.g.s.ai'))
    return { vendor: 'S.G.S.ai', description: 'Consulting', category: 'consulting', channel: null, department: null, excludeFromCAC: true }

  if (n.includes('backedbyads'))
    return { vendor: 'BackedByAds.com', description: 'Ads consulting', category: 'consulting', channel: 'ads', department: null, excludeFromCAC: true }

  if (n.includes('whop') && n.includes('clientacquisition'))
    return { vendor: 'Whop / Client Acquisition', description: 'Acquisition consulting', category: 'consulting', channel: null, department: null, excludeFromCAC: true }

  if (n.includes('mason mahoney'))
    return { vendor: 'Mason Mahoney', description: 'Closer commission', category: 'payroll', channel: 'cold_sms', department: 'Closer', excludeFromCAC: false }

  if (n.includes('appointwise'))
    return { vendor: 'Appointwise', description: 'Scheduling software', category: 'software', channel: null, department: null, excludeFromCAC: true }

  if (n.includes('wise') && !n.includes('appointwise')) {
    // Try to match to a specific employee
    const p = matchPayroll(e.date, e.amount)
    if (p) {
      return { vendor: p.vendor, description: `${p.department || 'Employee'} payroll (via Wise)`, category: 'payroll', channel: p.channel || 'cold_sms', department: p.department || null, excludeFromCAC: p.excludeFromCAC || false }
    }
    return { vendor: 'Wise Payroll', description: 'Employee payroll via Wise', category: 'payroll', channel: 'cold_sms', department: 'Setter', excludeFromCAC: false }
  }

  const softwareMap = {
    openai: 'OpenAI', anthropic: 'Anthropic', chatgpt: 'OpenAI',
    loom: 'Loom', zapier: 'Zapier', notion: 'Notion',
    vercel: 'Vercel', pandadoc: 'PandaDoc', elevenlabs: 'ElevenLabs',
    fathom: 'Fathom', submagic: 'Submagic',
    clearout: 'Clearout', outscraper: 'Outscraper',
    onlinejobsph: 'OnlineJobsPH', workspace: 'Google Workspace',
  }
  for (const [k, v] of Object.entries(softwareMap)) {
    if (n.includes(k)) {
      const isAcq = ['clearout','outscraper','onlinejobsph'].includes(k)
      return { vendor: v, description: v, category: 'software', channel: isAcq ? 'cold_sms' : null, department: null, excludeFromCAC: !isAcq }
    }
  }

  if (n.includes('upwrk') || n.includes('upwork'))
    return { vendor: 'Upwork', description: 'Contractor payroll', category: 'payroll', channel: null, department: null, excludeFromCAC: true }

  return { vendor: e.name, description: e.name, category: 'other', channel: null, department: null, excludeFromCAC: true }
}

let idN = 1
const unified = []

// 1. All bank entries
for (const e of busExp) {
  const meta = classifyBank(e)
  unified.push({
    id: `bank_${String(idN++).padStart(4,'0')}`,
    date: e.date,
    vendor: meta.vendor,
    description: meta.description,
    amount: e.amount,
    category: meta.category,
    channel: meta.channel,
    department: meta.department,
    excludeFromCAC: meta.excludeFromCAC,
    source: 'bank',
  })
}

// 2. Curated expenses.json entries not covered by bank:
//    - Drop Meta (bank has it), Drop Randy/RANDY (bank has Rrdnadera)
//    - Drop payroll entries that were matched to a Wise bank entry
//    - Keep everything else (GHL wallet, Asana, Bilal, Bishal, video editor,
//      Eddie/Daniel/Davi/Juan entries that did NOT match a Wise entry)
const SKIP_VENDORS = ['Meta', 'Randy Ray Nadera', 'RANDY RAY DOLON NADERA'] // Randy covered by Rrdnadera bank entries

for (const e of curExp) {
  if (SKIP_VENDORS.includes(e.vendor)) continue
  if (e.category === 'payroll') {
    const pr = payrollRecords.find(p => p === e || (p.vendor === e.vendor && p.date === e.date && p.amount === e.amount))
    if (pr && pr._matched) continue  // already represented by a Wise bank entry
  }
  unified.push({
    id: e.id || `manual_${String(idN++).padStart(4,'0')}`,
    date: e.date || e.dateFrom || null,
    vendor: e.vendor,
    description: e.description || e.vendor,
    amount: e.amount,
    category: e.category || 'other',
    channel: e.channel || null,
    department: e.department || null,
    excludeFromCAC: e.excludeFromCAC || false,
    source: 'manual',
  })
}

unified.sort((a,b) => {
  if (!a.date && !b.date) return 0
  if (!a.date) return 1; if (!b.date) return -1
  return a.date.localeCompare(b.date)
})

// Summary
const pos = unified.filter(e=>e.amount>0)
const byCat = {}
pos.forEach(e => { byCat[e.category]=(byCat[e.category]||0)+e.amount })
console.log(`Total entries: ${unified.length}  (${pos.length} positive)\n`)
console.log('By category:')
Object.entries(byCat).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(' ',k.padEnd(15),'$'+Math.round(v).toLocaleString()))

const byV = {}
pos.forEach(e=>{ byV[e.vendor]=(byV[e.vendor]||0)+e.amount })
console.log('\nTop vendors:')
Object.entries(byV).sort((a,b)=>b[1]-a[1]).slice(0,18).forEach(([k,v])=>console.log(' ',k.padEnd(35),'$'+Math.round(v).toLocaleString()))

// Unmatched payroll from expenses.json
const unmatched = payrollRecords.filter(p=>!p._matched)
if (unmatched.length) {
  console.log('\nexpenses.json payroll NOT matched to Wise (kept as manual):')
  unmatched.forEach(p=>console.log(' ',p.date,p.vendor,'$'+p.amount))
}

fs.writeFileSync(path.join(data, 'expenses_unified.json'), JSON.stringify(unified, null, 2))
console.log(`\nWrote expenses_unified.json (${unified.length} entries)`)
