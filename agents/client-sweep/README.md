# Client Sweep — Single Canonical Compute

Entry: scripts/clientSweepDaily.mjs
- Function: clientSweepDaily(date?) → Report
  - If date omitted, uses previous calendar day in GLOBAL_TZ (from .env; defaults to America/Bogota).
- IDs (from env, with sane defaults):
  - Guild: EVOLUTE_GUILD_ID
  - Categories: ACTIVE_CLIENTS_CATEGORY_ID and ONBOARDING_IN_PROGRESS_CATEGORY_ID
  - Team chats: Davi 1459289532372357253, Bilal 1469019592302006426, MarkZ 1402266658592002139
  - Asana Client Hub: ASANA_CLIENT_HUB_PROJECT_GID

Runner responsibilities (fetch+classify then inject):
1) Enumerate client channels under BOTH categories (Active Clients + Onboarding In Progress)
2) For each client in the day window (00:00–23:59 GLOBAL_TZ):
   - Build Context (1–2 factual bullets)
   - Classify Status (Needs response | Onboarding in progress | Needs follow-up | Stable) using strict rules
   - Suggested next action: only from explicit asks/promises; no invented actions
   - If Needs response → Successful response criteria from the explicit ask
   - Optional: team chatter hits (Davi/Bilal/MarkZ posts mentioning client) and Asana blockers
   - Escalation: mark if ≥3 outbound by us with no client reply that day
3) report.setClients(clients[]) then report.renderMarkdown()

Output: SOP-conformant per-client blocks ready for Markdown/Discord.
