#!/usr/bin/env node
/**
 * Export closing tracker data to Google Sheets
 * Exports to "All Booked Calls Data" sheet
 * 
 * Usage:
 *   node agents/closing-tracker/scripts/export-to-sheets.mjs --days=7
 *   node agents/closing-tracker/scripts/export-to-sheets.mjs --date=2026-03-17
 */

import '../../_shared/env-loader.mjs'
import { getClosingData, TRACKED_CALENDARS } from '../lib/get-closing-data.mjs'
import { appendRows, readSheet } from '../../_shared/google-sheets/index.mjs'

const SPREADSHEET_ID = '1lZzukpw0VTm-TZDBPzzNUW2hYK69nWlx1JsmF_BZ_yI'
const SHEET_NAME = 'All Booked Calls Data'

// Map calendar ID to source name
const CALENDAR_SOURCE = {
  'FITm7fIlhVTworbpJArx': 'Cold SMS',
  '8OhPnPLb8e6czA50rozN': 'Ads',  // Meta Inbound = Ads
}

// Parse args
const args = process.argv.slice(2)
const getArg = (name, def) => {
  const arg = args.find(a => a.startsWith(`--${name}=`))
  return arg ? arg.split('=')[1] : def
}

const daysBack = parseInt(getArg('days', '1'))
const specificDate = getArg('date', null)

/**
 * Format a date as MM/DD/YYYY for the sheet
 */
function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-')
  return `${month}/${day}/${year}`
}

/**
 * Get month number from date string
 */
function getMonthNum(dateStr) {
  return parseInt(dateStr.split('-')[1])
}

/**
 * Get year from date string
 */
function getYear(dateStr) {
  return parseInt(dateStr.split('-')[0])
}

/**
 * Map GHL createdBy to setter name
 */
function getSetterName(createdBy, source) {
  if (source === 'Ads') {
    return 'Ads - No Setter'
  }
  
  // Map known user IDs to names (we can expand this)
  const userMap = {
    'GheOd0K8eB8qosL2Z8RP': 'Max',
    'ddUpjf6Fj9k9efSf874G': 'Eddie',
    'YQcDJN2MiXUJfaAiKqyj': 'Daniel',
    'VwnP4BSH4oQR6yWOaV4Q': 'Randy',
    'KHUC7ccubjjmR4sV5DOa': 'Richard',
  }
  
  const userId = createdBy?.userId
  if (userId && userMap[userId]) {
    return userMap[userId]
  }
  
  // Default unknown to Ads
  return 'Ads - No Setter'
}

/**
 * Convert appointment to sheet row
 */
function toSheetRow(appt, dateStr) {
  const source = CALENDAR_SOURCE[appt.calendarId] || 'Unknown'
  const setter = getSetterName(appt.createdBy, source)
  const status = appt.showStatus === 'showed' ? 'Showed' : 'No-Show'
  const fathomLink = appt.matchedFathomCall?.recordingUrl || ''
  
  // Columns: Date, ID, Client/Lead Name, Source, Setter, Status, Closer, Outcome, 
  //          Cash Collected, Revenue, Follow Up?, Offer Made, Notes/Follow-up, 
  //          Fathom Link, Entered By, Entry Timestamp, MonthNum, Year
  return [
    formatDate(dateStr),           // Date
    appt.id || '',                 // ID
    appt.contactName || '',        // Client / Lead Name
    source,                        // Source
    setter,                        // Setter
    status,                        // Status
    '',                            // Closer (manual)
    '',                            // Outcome (manual)
    '',                            // Cash Collected (manual)
    '',                            // Revenue (manual)
    '',                            // Follow Up? (manual)
    '',                            // Offer Made (manual)
    '',                            // Notes / Follow-up (manual)
    fathomLink,                    // Fathom Link
    'Evan (Auto)',                 // Entered By
    new Date().toISOString(),      // Entry Timestamp
    getMonthNum(dateStr),          // MonthNum
    getYear(dateStr),              // Year
  ]
}

async function main() {
  console.log('🚀 Closing Tracker → Google Sheets Export')
  console.log('─'.repeat(60))
  
  // Determine dates to process
  const dates = []
  if (specificDate) {
    dates.push(specificDate)
  } else {
    for (let i = 1; i <= daysBack; i++) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      dates.push(d.toISOString().slice(0, 10))
    }
  }
  
  console.log(`Processing dates: ${dates.join(', ')}`)
  console.log('')
  
  // Collect all rows
  const allRows = []
  
  for (const date of dates) {
    console.log(`📅 ${date}...`)
    
    try {
      const data = await getClosingData(date)
      console.log(`   Found ${data.appointments.length} appointments (${data.summary.showed} showed, ${data.summary.noShow} no-show)`)
      
      for (const appt of data.appointments) {
        allRows.push(toSheetRow(appt, date))
      }
    } catch (err) {
      console.log(`   Error: ${err.message}`)
    }
  }
  
  console.log('')
  console.log(`Total rows to export: ${allRows.length}`)
  
  if (allRows.length === 0) {
    console.log('No data to export.')
    return
  }
  
  // Sort by date (oldest first)
  allRows.sort((a, b) => {
    const dateA = new Date(a[0])
    const dateB = new Date(b[0])
    return dateA - dateB
  })
  
  // Append to sheet
  console.log('')
  console.log(`Appending to "${SHEET_NAME}"...`)
  
  try {
    const result = await appendRows({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_NAME,
      values: allRows
    })
    
    console.log('✅ Success!')
    console.log(`   Updated range: ${result.updates?.updatedRange || 'unknown'}`)
    console.log(`   Rows added: ${result.updates?.updatedRows || allRows.length}`)
  } catch (err) {
    console.error('❌ Failed to append:', err.message)
    process.exit(1)
  }
}

main()
