#!/usr/bin/env node
/**
 * Google Sheets helper using OAuth refresh token
 * Expects env-loader.mjs to have populated process.env with:
 * GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN
 */

async function getAccessToken() {
  const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN } = process.env
  if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET || !GOOGLE_OAUTH_REFRESH_TOKEN) {
    throw new Error('Missing Google OAuth credentials - ensure env-loader.mjs was imported first')
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: GOOGLE_OAUTH_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to refresh token: ${res.status} ${text}`)
  }

  const data = await res.json()
  return data.access_token
}

/**
 * Append rows to a Google Sheet
 * @param {Object} opts
 * @param {string} opts.spreadsheetId - The spreadsheet ID from the URL
 * @param {string} opts.range - Sheet range like "Sheet1!A:F" or just "Sheet1"
 * @param {Array<Array<any>>} opts.values - 2D array of row values
 */
export async function appendRows({ spreadsheetId, range, values }) {
  const accessToken = await getAccessToken()

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to append rows: ${res.status} ${text}`)
  }

  return res.json()
}

/**
 * Read values from a Google Sheet
 * @param {Object} opts
 * @param {string} opts.spreadsheetId
 * @param {string} opts.range
 */
export async function readSheet({ spreadsheetId, range }) {
  const accessToken = await getAccessToken()

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`

  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to read sheet: ${res.status} ${text}`)
  }

  return res.json()
}

/**
 * Update values in a Google Sheet (overwrite existing)
 * @param {Object} opts
 * @param {string} opts.spreadsheetId
 * @param {string} opts.range
 * @param {Array<Array<any>>} opts.values
 */
export async function updateRange({ spreadsheetId, range, values }) {
  const accessToken = await getAccessToken()

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to update range: ${res.status} ${text}`)
  }

  return res.json()
}

/**
 * Get spreadsheet metadata (sheet names, etc.)
 * @param {Object} opts
 * @param {string} opts.spreadsheetId
 */
export async function getSpreadsheetInfo({ spreadsheetId }) {
  const accessToken = await getAccessToken()

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`

  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to get spreadsheet info: ${res.status} ${text}`)
  }

  return res.json()
}
