# SETTINGS.md — Global Settings for This Repo

Timezone
- key: timezone
- value: America/Sao_Paulo
- meaning: All specialists use this timezone for date windows and EOD calculations.

How to change it
- Edit this file and set `value` to a valid IANA timezone (e.g., America/Bogota, UTC, Europe/London).
- Then ask me to “apply timezone setting” and I will:
  1) Update all cron jobs’ schedule.tz to match
  2) Confirm SOPs reference the global timezone (no hardcoded tz in SOP text)

Notes
- Cron jobs require an explicit tz on each job; I keep them in sync with this setting.
- Specialists compute daily windows by reading this setting at run-time.
