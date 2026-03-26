# TODO

Work tasks for Evolute Solutions. Updated 2026-03-26.

## Urgent / Infrastructure

- [ ] **Claude Code on VM** — set up Claude Code directly on the DigitalOcean VM so there's no local/remote discrepancy. Claude should be able to read, edit, and run code on the VM directly.
- [ ] **Dashboard domain + serving** — expose dashboard via Caddy on a real domain so Bilal and team can access it from anywhere. Currently only accessible locally.

---

## In Progress

- [ ] **Ops Dashboard** — rename sales_tracker.html → dashboard.html; restructure into Sales view and Ops view at the top level; build Onboarding tab under Ops

---

## Onboarding Tab (next up)

- [ ] **Onboarding tab UI** — role switcher (Account Manager / Media Buyer), action-first checklist per role, alerts block at top, per-client expandable detail below
- [ ] **Step deliverables** — text input for ad scripts, Google Drive link field for creatives/screenshots; step only marks complete on submission, not checkbox alone
- [ ] **Mark-done API endpoint** — `POST /api/onboarding/mark-done` wires dashboard checkbox/submit to mark-done.mjs
- [ ] **GHL setup interactive wizard** — step-by-step guided tutorial for GHL subaccount configuration, inline instructions, mark each micro-step done as you go; replaces static Notion checklist

---

## Phase 1 — Foundation

- [ ] **Payment collections tracker** — `data/collections.json` per client (contracted, paid, due dates, overdue status); dashboard Collections tab; alerts for upcoming/overdue payments
- [ ] **Payroll calculator** — `data/payroll-config.json` rules per person; calculate setter base + commissions, media buyer, contractors; output payroll report

## Phase 2 — Intelligence

- [ ] **Client sweep CSM intelligence** — extract historical Discord complaint handling into knowledge base; update sweep prompt with context-aware action recommendations

## Phase 3 — New Integrations

- [ ] **GHL webhooks** — replace polling (fetch-raw-appts.mjs) with real-time GHL API webhooks for automatic appointment sync
- [ ] **Meta integration** — Meta Marketing API: CPL by campaign, budget pacing, payment status, campaign health, week-over-week comparison

## Phase 4 — Full Automation

- [ ] **Fathom follow-up agent** — AI scans Fathom calls, generates follow-up action plan per call
- [ ] **Auto-follow-up drafting** — draft outreach messages for onboarding blockers + overdue collections for Max to review/send
- [ ] **CSM escalation detection** — flag distressed clients from sweep, draft response recommendations
- [ ] **Fathom call knowledge base** — store all transcripts/summaries for searchable reference

---

## Onboarding — Future Rebuilds

- [ ] **Rebuild onboarding funnel** — current funnel sent to client after signing needs a full rebuild; must include: onboarding form, Discord join, meta setup, onboarding call scheduling, AND client media submission (photos/videos). Currently media is requested in Discord which is too late and easy to miss.
- [ ] **Onboarding call scheduling logic** — call should only be schedulable once team is ready to launch, not upfront in the funnel; currently funnel sends it too early
- [ ] **Meta connection interactive wizard** — client-facing step-by-step wizard for Meta/Facebook access setup; replaces current manual process

---

## Someday / Ideas

- [ ] Asana visibility — surface overdue/stalled tasks in sweeps
- [ ] Calendar proactive alerts — flag upcoming meetings, prep reminders
- [ ] Service term tracker — when contracts expire, renewal reminders
- [ ] Meta Ads auto-pause rules — pause campaigns below ROAS threshold
- [ ] Client-side follow-up automation — ping clients who haven't completed their steps (Facebook access, media submission) after X days

---

## Completed

- [x] **Fix Google OAuth** — ✅ Fixed 2026-03-18
- [x] **Fathom → Sales Tracking pipeline** — detects sales calls, matches to appointments, logs fathom links
- [x] **Data dashboard (Sales)** — built as sales_tracker.html with Overview, Trends, Acquisition, Revenue, Setters, Pipeline, Appointments, Costs, Clients, P&L, Raw Data, Weekly, Needs Review tabs
- [x] **GHL Calendar appointments** — fetch-raw-appts.mjs pulls all appointments from GHL
- [x] **Show rate calculation** — built into dashboard metrics
- [x] **Closing tracker: "Created By" column** — setter attribution in place
- [x] **Onboarding tracker (backend)** — data/onboarding.json, new-client.mjs, mark-done.mjs, resolve-alert.mjs, full step dependency graph, auto-detection via Stripe/GHL/Discord webhooks, alerts system, team.json role assignments, daily briefing via run.mjs

---

## Architecture Notes

**Appointments & Show Rates:**
- GHL Calendar = scheduled appointments (who was supposed to show)
- Fathom = actual shows (recording exists → they showed)
- Pipeline: fetch-raw-appts.mjs → fathom-match.mjs → sales_tracker.html

**Existing agents:**
- `client-sweep` — daily sweep, runs 06:00 BRT, posts to Discord
- `appointment-tracking` — cold SMS appointment reports
- `fathom` — Fathom API client + scripts
