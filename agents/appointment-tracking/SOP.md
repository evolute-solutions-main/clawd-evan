# Appointment Tracking — Daily Report SOP

Goal: Produce yesterday’s appointments breakdown per setter, include unique person_keys and latest timestamps; publish to Discord.

Window (Global):
- Read timezone from SETTINGS.md
- Use inclusive bounds: [YYYY-MM-DD 00:00:00, YYYY-MM-DD 23:59:59] in that timezone
- Use the Discord POST timestamp (not the appointment time printed inside the message)

Inputs:
- Discord channels:
  - Unconfirmed: 1387098677646196887
  - Confirmed:   1332578941407334430
- Eligible messages (case-insensitive markers):
  - Author is Zapier (webhook/bot ok)
  - Contains "UNCONFIRMED APPOINTMENT" (unconfirmed) or "CONFIRMED APPOINTMENT" (confirmed)

Raw collection rules (robust):
- Paginate across the ENTIRE day window (start→end) so near‑midnight posts are never missed
- Do NOT deduplicate in raw — include every qualifying message row
- Extract fields: message_id, ts_utc, ts_local (global tz), channel_id, channel_type, setter (or Unknown), name (can be blank), phone (if present), calendar (for confirmed)
- Write to appointments.raw.md in chronological order

Collapse + Cold SMS filter (same-day reschedules):
- Build from appointments.raw.md
- person_key = (setter, phone). If phone missing → (setter, normalized_name). If setter missing → Unknown.
- For a given day_added (global tz date of POST TS), keep only the latest message per person_key by POST timestamp.
- EOD status = channel_type of that latest message.
- Cold SMS filter: Unconfirmed → include; Confirmed → include only if calendar contains "cold sms" (case-insensitive)
- Write the result to cold-sms.appointments.collapsed.md

Identity notes:
- person_key = (setter, phone). If phone missing → (setter, normalized_name). If setter missing → Unknown.
- For a given day_added (global tz date of Discord POST TS), keep only the latest message per person_key by POST timestamp.
- EOD status assignment: retained latest message from Confirmed channel → Confirmed; else → Unconfirmed.
- If the same phone appears under different setters, it counts once per setter.

Outputs (filenames):
- agents/appointment-tracking/outputs/YYYY-MM-DD/appointments.raw.md — ALL qualifying Zapier posts (unconfirmed+confirmed), no filtering, no dedupe
- agents/appointment-tracking/outputs/YYYY-MM-DD/cold-sms.appointments.collapsed.md — Cold SMS–only collapsed set (unconfirmed included; confirmed filtered by Calendar contains "cold sms", case-insensitive)
- agents/appointment-tracking/outputs/YYYY-MM-DD/cold-sms.appointments.report.md — Final report built STRICTLY from cold-sms.appointments.collapsed.md

Publish (optional):
- Title: "Cold SMS Appointments Report — YYYY-MM-DD (Global Timezone)"
- Body: contents of cold-sms.appointments.report.md

Steps:
1) Preflight (read SETTINGS.md tz; confirm Discord read; create outputs dir for date)
2) Fetch messages from both channels across the full inclusive window; write cold-sms.appointments.raw.md exactly as collected
3) Collapse and filter to Cold SMS (per rules above); write cold-sms.appointments.collapsed.md
4) Build final report cold-sms.appointments.report.md from the collapsed file using Markdown tables:
   - Totals table: columns → Metric | Count (Confirmed, Unconfirmed)
   - Setter report table (alphabetical): columns → Setter | Confirmed | Unconfirmed | Total
   - Collapsed appointments tables (two blocks, chronological within each):
     • Unconfirmed: columns → Time | Setter | Name | Phone | Permalink
     • Confirmed:   columns → Time | Setter | Name | Phone | Permalink
5) Optional: publish the report (title/body in Publish section)

Verification:
- raw.md lists every Zapier row used (local TS, channel, setter, name, phone, message id)
- collapsed.md shows retained person_keys and mapping to Confirmed/Unconfirmed
- sales.summary.md shows high-level counts by event type for the day

Failure policy: Blocker if any fetch fails; no partials.
