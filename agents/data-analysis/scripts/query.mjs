#!/usr/bin/env node
/**
 * query.mjs — Evolute business analytics CLI
 *
 * Reads data/*.json, computes metrics, outputs a single JSON object to stdout.
 * No writes, no external dependencies, no dashboard edits.
 *
 * Usage:
 *   node agents/data-analysis/scripts/query.mjs --metric=revenue --from 2026-02-01 --to 2026-03-18
 *   node agents/data-analysis/scripts/query.mjs --metric=show-rate --source "Cold SMS" --from 2026-01-01 --to 2026-03-31
 *   node agents/data-analysis/scripts/query.mjs --metric=cac --source Ads --from 2026-02-01 --to 2026-03-18
 *   node agents/data-analysis/scripts/query.mjs --metric=p&l --month 2026-03
 *   node agents/data-analysis/scripts/query.mjs --metric=ltv
 *   node agents/data-analysis/scripts/query.mjs --metric=roas --source Ads --from 2026-01-01 --to 2026-03-31
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(fileURLToPath(import.meta.url), '../../../../')
const dataDir = path.join(root, 'data')

// ── Load data ────────────────────────────────────────────────────────────────
const salesData    = JSON.parse(fs.readFileSync(path.join(dataDir, 'sales_data.json'),   'utf8'))
const expenses     = JSON.parse(fs.readFileSync(path.join(dataDir, 'expenses.json'),     'utf8'))
const transactions = JSON.parse(fs.readFileSync(path.join(dataDir, 'transactions.json'), 'utf8'))

const appointments = salesData.appointments
const dials        = salesData.dials

// ── Arg parsing ──────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const [k, ...rest] = a.slice(2).split('=')
      args[k] = rest.length ? rest.join('=') : (argv[i+1] && !argv[i+1].startsWith('--') ? argv[++i] : true)
    }
  }
  return args
}

const args   = parseArgs(process.argv.slice(2))
const metric = (args.metric || args.m || '').toLowerCase().replace('&', '&')
const source = args.source  // "Ads" | "Cold SMS" | undefined
const month  = args.month   // "2026-03"
const human  = args.human === true || args.human === 'true'

// ── Date helpers ─────────────────────────────────────────────────────────────
function parseDate(s) {
  if (!s) return null
  // MM/DD/YYYY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2,'0')}-${mdy[2].padStart(2,'0')}`
  // YYYY-MM-DD or YYYY-MM-DDTHH...
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/)
  if (iso) return iso[1]
  return null
}

let fromDate = parseDate(args.from)
let toDate   = parseDate(args.to)

if (month) {
  const [y, m] = month.split('-').map(Number)
  fromDate = `${month}-01`
  const lastDay = new Date(y, m, 0).getDate()
  toDate   = `${month}-${String(lastDay).padStart(2,'0')}`
}

function inWindow(dateStr) {
  const d = parseDate(dateStr)
  if (!d) return false
  if (fromDate && d < fromDate) return false
  if (toDate   && d > toDate)   return false
  return true
}

// ── Source filtering (calendarName) ─────────────────────────────────────────
// calendarName: "Cold SMS" | "AI Strategy Session (Meta Inbound)" (= Ads)
function isAds(appt)     { return appt.calendarName && !appt.calendarName.toLowerCase().includes('cold') }
function isColdSMS(appt) { return appt.calendarName &&  appt.calendarName.toLowerCase().includes('cold') }

function matchSource(appt) {
  if (!source) return true
  const s = source.toLowerCase()
  if (s === 'ads' || s === 'ad')         return isAds(appt)
  if (s === 'cold sms' || s === 'sms')   return isColdSMS(appt)
  return true
}

// expense channel: 'ads' | 'cold_sms'
function matchExpenseSource(exp) {
  if (!source) return true
  const s = source.toLowerCase()
  if (s === 'ads' || s === 'ad')       return exp.channel === 'ads'
  if (s === 'cold sms' || s === 'sms') return exp.channel === 'cold_sms'
  return true
}

// ── Metric: revenue ──────────────────────────────────────────────────────────
function metricRevenue() {
  const appts = appointments.filter(a => inWindow(a.startTime) && matchSource(a))

  const booked  = appts.length
  const showed  = appts.filter(a => ['showed','closed','not_closed'].includes(a.status)).length
  const closed  = appts.filter(a => a.status === 'closed').length
  const noShow  = appts.filter(a => a.status === 'no_show').length
  const cancelled = appts.filter(a => a.status === 'cancelled').length

  const cashCollected = appts.reduce((s,a) => s + (a.cashCollected||0) + (a.cashCollectedAfterFirstCall||0), 0)
  const contractRevenue = appts.reduce((s,a) => s + (a.contractRevenue||0), 0)

  return {
    metric: 'revenue',
    window: { from: fromDate, to: toDate, source: source || 'all' },
    booked, showed, closed, noShow, cancelled,
    cashCollected:    Math.round(cashCollected * 100) / 100,
    contractRevenue:  Math.round(contractRevenue * 100) / 100,
    avgCashPerClose:  closed ? Math.round(cashCollected / closed) : null,
  }
}

// ── Metric: show-rate ────────────────────────────────────────────────────────
function metricShowRate() {
  const appts = appointments.filter(a => inWindow(a.startTime) && matchSource(a))
  const showed   = appts.filter(a => ['showed','closed','not_closed'].includes(a.status)).length
  const noShow   = appts.filter(a => a.status === 'no_show').length
  const cancelled= appts.filter(a => a.status === 'cancelled').length
  const denom    = showed + noShow + cancelled
  const showRate = denom ? showed / denom : null

  // By setter
  const setters = {}
  appts.forEach(a => {
    const setter = a.createdBy || 'Unknown'
    if (!setters[setter]) setters[setter] = { showed:0, noShow:0, cancelled:0, booked:0 }
    setters[setter].booked++
    if (['showed','closed','not_closed'].includes(a.status)) setters[setter].showed++
    if (a.status === 'no_show')   setters[setter].noShow++
    if (a.status === 'cancelled') setters[setter].cancelled++
  })

  const byGetter = Object.entries(setters).map(([setter, s]) => {
    const d = s.showed + s.noShow + s.cancelled
    return { setter, booked: s.booked, showed: s.showed, noShow: s.noShow, cancelled: s.cancelled, showRate: d ? +(s.showed/d).toFixed(3) : null }
  }).sort((a,b) => (b.showed||0) - (a.showed||0))

  return {
    metric: 'show-rate',
    window: { from: fromDate, to: toDate, source: source || 'all' },
    showed, noShow, cancelled, denom,
    showRate: showRate !== null ? +showRate.toFixed(3) : null,
    showRatePct: showRate !== null ? +(showRate * 100).toFixed(1) + '%' : null,
    bySetter: byGetter,
  }
}

// ── Metric: cac ──────────────────────────────────────────────────────────────
function metricCAC() {
  const appts  = appointments.filter(a => inWindow(a.startTime) && matchSource(a))
  const closes = appts.filter(a => a.status === 'closed').length

  const spend = expenses
    .filter(e => !e.excludeFromCAC && inWindow(e.date) && matchExpenseSource(e) && e.amount > 0)
    .reduce((s,e) => s + e.amount, 0)

  const cac = closes ? spend / closes : null

  return {
    metric: 'cac',
    window: { from: fromDate, to: toDate, source: source || 'all' },
    closes,
    spend:  Math.round(spend * 100) / 100,
    cac:    cac !== null ? Math.round(cac * 100) / 100 : null,
  }
}

// ── Metric: roas ─────────────────────────────────────────────────────────────
function metricROAS() {
  const appts = appointments.filter(a => inWindow(a.startTime) && matchSource(a))
  const cash  = appts.reduce((s,a) => s + (a.cashCollected||0) + (a.cashCollectedAfterFirstCall||0), 0)

  const spend = expenses
    .filter(e => !e.excludeFromCAC && inWindow(e.date) && matchExpenseSource(e) && e.amount > 0)
    .reduce((s,e) => s + e.amount, 0)

  const roas = spend ? cash / spend : null

  return {
    metric: 'roas',
    window: { from: fromDate, to: toDate, source: source || 'all' },
    cashCollected: Math.round(cash * 100) / 100,
    spend: Math.round(spend * 100) / 100,
    roas: roas !== null ? +roas.toFixed(3) : null,
    roasX: roas !== null ? +roas.toFixed(2) + 'x' : null,
  }
}

// ── Metric: p&l ──────────────────────────────────────────────────────────────
function metricPL() {
  const rev = transactions
    .filter(t => t.date && inWindow(t.date))
    .reduce((s,t) => s + (parseFloat(t.amount)||0), 0)

  const exp = expenses
    .filter(e => e.date && inWindow(e.date) && e.amount > 0)
    .reduce((s,e) => s + e.amount, 0)

  const profit = rev - exp

  // Monthly breakdown
  const months = {}
  transactions.filter(t => t.date && inWindow(t.date)).forEach(t => {
    const m = t.date.slice(0,7)
    months[m] = months[m] || { month: m, revenue: 0, expenses: 0, profit: 0 }
    months[m].revenue += parseFloat(t.amount)||0
  })
  expenses.filter(e => e.date && inWindow(e.date) && e.amount > 0).forEach(e => {
    const m = e.date.slice(0,7)
    months[m] = months[m] || { month: m, revenue: 0, expenses: 0, profit: 0 }
    months[m].expenses += e.amount
  })
  const byMonth = Object.values(months)
    .map(m => ({ ...m, revenue: +m.revenue.toFixed(2), expenses: +m.expenses.toFixed(2), profit: +(m.revenue - m.expenses).toFixed(2) }))
    .sort((a,b) => a.month.localeCompare(b.month))

  return {
    metric: 'p&l',
    window: { from: fromDate, to: toDate },
    revenue:  +rev.toFixed(2),
    expenses: +exp.toFixed(2),
    profit:   +profit.toFixed(2),
    margin:   rev ? +(profit/rev*100).toFixed(1) + '%' : null,
    byMonth,
  }
}

// ── Metric: ltv ──────────────────────────────────────────────────────────────
function metricLTV() {
  // Group by normalized name, merge emails
  const buckets = {}
  transactions.forEach(t => {
    const key = (t.name || t.email || '').toLowerCase().trim()
    if (!key) return
    if (!buckets[key]) buckets[key] = { name: t.name || t.email, emails: new Set(), total: 0, payments: 0 }
    buckets[key].total    += parseFloat(t.amount)||0
    buckets[key].payments += 1
    if (t.email) buckets[key].emails.add(t.email.toLowerCase())
  })

  const clients = Object.values(buckets)
    .map(b => ({ name: b.name, emails: [...b.emails], total: +b.total.toFixed(2), payments: b.payments }))
    .sort((a,b) => b.total - a.total)

  const totalRevenue = clients.reduce((s,c) => s + c.total, 0)
  const avgLTV = clients.length ? totalRevenue / clients.length : 0

  return {
    metric: 'ltv',
    clientCount: clients.length,
    totalRevenue: +totalRevenue.toFixed(2),
    avgLTV: +avgLTV.toFixed(2),
    clients,
  }
}

// ── Dispatch ─────────────────────────────────────────────────────────────────
const METRICS = {
  'revenue':   metricRevenue,
  'show-rate': metricShowRate,
  'showrate':  metricShowRate,
  'cac':       metricCAC,
  'p&l':       metricPL,
  'pl':        metricPL,
  'roas':      metricROAS,
  'ltv':       metricLTV,
}

if (!metric || !METRICS[metric]) {
  console.error(JSON.stringify({ error: `Unknown metric: "${metric}"`, available: Object.keys(METRICS) }))
  process.exit(1)
}

const result = METRICS[metric]()

if (human) {
  // Human-readable summary
  const r = result
  const w = r.window ? `${r.window.from||'?'} → ${r.window.to||'?'}` : ''
  const src = r.window?.source !== 'all' ? ` [${r.window?.source}]` : ''
  console.log(`\n── ${r.metric.toUpperCase()}${src} ${w} ──`)
  if (r.metric === 'revenue')   console.log(`Booked: ${r.booked} | Showed: ${r.showed} | Closed: ${r.closed}\nCash Collected: $${r.cashCollected?.toLocaleString()} | Contract: $${r.contractRevenue?.toLocaleString()} | Avg/close: $${r.avgCashPerClose?.toLocaleString()}`)
  if (r.metric === 'show-rate') console.log(`Show rate: ${r.showRatePct} (${r.showed}/${r.denom})`)
  if (r.metric === 'cac')       console.log(`Closes: ${r.closes} | Spend: $${r.spend?.toLocaleString()} | CAC: $${r.cac?.toLocaleString()}`)
  if (r.metric === 'roas')      console.log(`Cash: $${r.cashCollected?.toLocaleString()} | Spend: $${r.spend?.toLocaleString()} | ROAS: ${r.roasX}`)
  if (r.metric === 'p&l')       console.log(`Revenue: $${r.revenue?.toLocaleString()} | Expenses: $${r.expenses?.toLocaleString()} | Profit: $${r.profit?.toLocaleString()} | Margin: ${r.margin}`)
  if (r.metric === 'ltv')       console.log(`${r.clientCount} clients | Total: $${r.totalRevenue?.toLocaleString()} | Avg LTV: $${r.avgLTV?.toLocaleString()}`)
  console.log()
  r.bySetter?.forEach(s => console.log(`  ${s.setter}: ${s.showed}/${s.booked} (${(s.showRate*100).toFixed(0)}%)`))
  r.byMonth?.forEach(m => console.log(`  ${m.month}: rev $${m.revenue?.toLocaleString()} | exp $${m.expenses?.toLocaleString()} | net $${m.profit?.toLocaleString()}`))
  r.clients?.slice(0,10).forEach(c => console.log(`  ${c.name}: $${c.total?.toLocaleString()} (${c.payments} payments)`))
  console.log()
}

console.log(JSON.stringify(result, null, 2))
