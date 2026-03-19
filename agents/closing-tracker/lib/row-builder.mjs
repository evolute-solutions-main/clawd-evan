/**
 * Shared row-building utilities for the Closing Tracker backfill scripts.
 * Single source of truth for: SETTER_MAP, MANUAL_COLS, date helpers,
 * row construction, merge-key derivation, and sorting.
 */

export const SETTER_MAP = {
  'GheOd0K8eB8qosL2Z8RP': 'Max',
  'ddUpjf6Fj9k9efSf874G': 'Eddie',
  'YQcDJN2MiXUJfaAiKqyj': 'Daniel',
  'VwnP4BSH4oQR6yWOaV4Q': 'Randy',
  'KHUC7ccubjjmR4sV5DOa': 'Richard',
}

/** Column indices (0-based) that are entered manually and must be preserved on merge */
export const MANUAL_COLS = [6, 7, 8, 9, 10, 11, 12]

/** YYYY-MM-DD → MM/DD/YYYY */
export function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-')
  return `${m}/${d}/${y}`
}

export function getMonthNum(dateStr) { return parseInt(dateStr.split('-')[1]) }
export function getYear(dateStr)     { return parseInt(dateStr.split('-')[0]) }

/** Build a full 18-column sheet row from a date string and GHL appointment object */
export function buildRow(dateStr, appt) {
  const source = appt.calendarName || 'Unknown'
  const setter = (() => {
    if (source === 'Meta Inbound') return 'Ads - No Setter'
    const uid = appt.createdBy?.userId
    return (uid && SETTER_MAP[uid]) ? SETTER_MAP[uid] : 'Ads - No Setter'
  })()
  const status = appt.showStatus === 'showed' ? 'Showed' : 'No-Show'
  const fathomLink = appt.matchedFathomCall?.recordingUrl || ''
  return [
    formatDate(dateStr),      // A Date
    appt.id || '',            // B ID
    appt.contactName || '',   // C Client / Lead Name
    source,                   // D Source
    setter,                   // E Setter
    status,                   // F Status
    '', '', '', '', '', '', '', // G..M manual columns (blank by default)
    fathomLink,               // N Fathom Link
    'Evan (Auto)',            // O Entered By
    new Date().toISOString(), // P Entry Timestamp
    getMonthNum(dateStr),     // Q MonthNum
    getYear(dateStr),         // R Year
  ]
}

/** Derive a merge key from an existing sheet row (col B = ID, fallback date|name|source) */
export function rowKey(row) {
  const id = (row[1] || '').trim()
  if (id) return 'id:' + id
  return `dns:${(row[0] || '').trim()}|${(row[2] || '').trim()}|${(row[3] || '').trim()}`
}

/** Derive a merge key from a GHL appointment (ID preferred, fallback date|name|calendarName) */
export function apptKey(dateStr, appt) {
  const id = (appt.id || '').trim()
  if (id) return 'id:' + id
  return `dns:${formatDate(dateStr)}|${(appt.contactName || '').trim()}|${(appt.calendarName || '').trim()}`
}

/**
 * Copy non-empty MANUAL_COLS values from `prev` (existing sheet row) into `base` (new row).
 * Mutates and returns `base`.
 */
export function mergeManualCols(base, prev) {
  if (!prev) return base
  for (const c of MANUAL_COLS) {
    if ((prev[c] || '').toString().trim()) base[c] = prev[c]
  }
  return base
}

/** Generator: yield each YYYY-MM-DD date from `from` to `to` inclusive */
export function* dateRange(from, to) {
  const start = new Date(from + 'T00:00:00Z')
  const end   = new Date(to   + 'T00:00:00Z')
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86400000)) {
    yield d.toISOString().slice(0, 10)
  }
}

/** Sort rows descending by date (col A), then by entry timestamp (col P) desc. Mutates in place. */
export function sortRowsDesc(rows) {
  rows.sort((a, b) => {
    const da = new Date(a[0]); const db = new Date(b[0])
    if (db - da !== 0) return db - da
    const ta = Date.parse(a[15] || ''); const tb = Date.parse(b[15] || '')
    return (tb || 0) - (ta || 0)
  })
  return rows
}
