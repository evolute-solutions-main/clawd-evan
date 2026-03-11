# Release Notes — 2026-03-11

feat(core): shared Discord fetcher + complete Cold SMS report pipeline; routing, timezone, cleanup

Overview
- Introduces a generic, shared Discord history fetcher usable by any agent (token+tz standardized).
- Completes the Cold SMS Appointment Tracking pipeline end-to-end (fetch → parse → collapse → final report).
- Centralizes routing rules (Evan → appointment-tracking) and timezone (SETTINGS.md).
- Cleans up outdated stubs/files and documents the new standards.
- Adds a smoke test script for token/channel verification.

Why
- Eliminate configuration drift by standardizing Discord access and timezone usage.
- Make Discord reads reusable for all agents.
- Ensure Cold SMS reporting is deterministic and verifiable from a single command.

Key Changes
- Shared Discord fetcher: agents/_shared/discord-fetcher (index.mjs, README.md)
- Token standard: .secrets.env → DISCORD_BOT_TOKEN (fetchers); Clawdbot gateway token remains separate for posting
- Timezone standard: SETTINGS.md (America/Sao_Paulo)
- Appointment-tracking runner: agents/appointment-tracking/scripts/run.mjs
- Parser + collapse + final report per SOP
- Routing: AGENTS.md — natural-language triggers delegate to appointment-tracking
- CONNECTIONS.md: document Discord fetch standard
- scripts/smoke.mjs: quick token/channel verification
- Removed stale stub: agents/appointment-tracking/scripts/fetch-discord.NOT_WIRED.md

Verification
- smoke.mjs confirms token and channel access
- run.mjs writes appointments.raw.md, cold-sms.appointments.collapsed.md, cold-sms.appointments.report.md

How to Run
- node scripts/smoke.mjs <channelId>
- node agents/appointment-tracking/scripts/run.mjs --date=YYYY-MM-DD

Future
- Optional: GitHub Actions cron for always-on (use repo secret DISCORD_BOT_TOKEN)
- Enhanced setter inference if Zapier payload expands
