# Appointments Daily Report (single canonical compute)

Entry: appointmentsDailyReport.mjs
- Function: appointmentsDailyReport(date, { tz }) → Report
- Usage:
  1) Build rawRows from Zapier Discord posts in the day window (00:00–23:59 local repo timezone from SETTINGS.md) using the shared fetcher at agents/_shared/discord-fetcher.
     - Channels (hardcoded):
       - UNCONFIRMED: 1387098677646196887
       - CONFIRMED:   1332578941407334430
     - Each RawRow: { id, addedTsUtc, channelType: 'confirmed'|'unconfirmed', setter?, name?, phone?, apptTimeText? }
  2) report.setRawRows(rawRows)
  3) report.renderMarkdown({ includeRaw?: false }) → string

Outputs on Report:
- date, window: { startIso, endIso, tz }
- totals: { confirmed, unconfirmed, totalKeys }
- perSetter: [{ setter, confirmed, unconfirmed, total }]
- collapsedRows: [{ setter, phone|fallbackName, latestStatus, latestAddedTs, apptTimeText }]
- rawRows: original records (for audit)
- notes: anomalies/attribution notes

This module holds the logic; presentation is via renderMarkdown().
