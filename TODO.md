# TODO

Work tasks for Evolute Solutions. Updated 2026-03-25.
See `MASTERPLAN.md` for full vision, roadmap, and open questions.

---

## Phase 1 — Foundation (High Impact, Low Complexity)

- [ ] **Onboarding tracker** — data model (`data/onboarding.json`) + daily Discord alert for stuck/overdue steps; each client has a per-step checklist (access, ads built, launched, etc.)
- [ ] **Payment collections tracker** — `data/collections.json` per client (contracted, paid, due dates, overdue status) + daily Discord alert for upcoming/overdue payments; agent handles failed payments, disputes/chargebacks (detection + workflow + resolution tracking), subscription cancellations
- [ ] **Payroll calculator** — `data/payroll-config.json` rules per person; calculate setter base + commissions, media buyer, other contractors; output payroll report to Discord

## Phase 2 — Intelligence

- [ ] **Morning briefing agent** — daily ~8am Discord summary: onboarding blockers, overdue collections, ads health, today's appointments, any client escalations
- [ ] **Client sweep CSM intelligence** — extract historical Discord complaint handling into knowledge base; update sweep prompt with context-aware action recommendations
- [ ] **Dashboard: Ops tabs** — add Onboarding, Collections, Payroll tabs to sales_tracker.html

## Phase 3 — New Integrations

- [ ] **GHL webhooks** — replace polling (fetch-raw-appts.mjs) with real-time GHL API webhooks for automatic appointment sync
- [ ] **Meta integration** — Meta Marketing API: CPL by campaign, budget pacing, payment status, campaign health, week-over-week comparison

## Phase 4 — Full Automation

- [ ] **Fathom follow-up agent** — AI scans Fathom calls, generates follow-up action plan per call
- [ ] **Auto-follow-up drafting** — draft outreach messages for onboarding blockers + overdue collections for Max to review/send
- [ ] **CSM escalation detection** — flag distressed clients from sweep, draft response recommendations
- [ ] **Fathom call knowledge base** — store all transcripts/summaries for searchable reference

---

## Someday / Ideas

- [ ] Asana visibility — surface overdue/stalled tasks in sweeps
- [ ] Calendar proactive alerts — flag upcoming meetings, prep reminders
- [ ] Service term tracker — when contracts expire, renewal reminders
- [ ] Meta Ads auto-pause rules — pause campaigns below ROAS threshold

---

## Completed

- [x] **Fix Google OAuth** — ✅ Fixed 2026-03-18 (re-authorized, new refresh token)
- [x] **Fathom → Sales Tracking pipeline** — detects sales calls from Fathom, matches to appointments, logs fathom links (fathom-match.mjs)
- [x] **Data dashboard** — ✅ Built as full sales tracker (sales_tracker.html). Vision: expand into full ops hub
- [x] **GHL Calendar appointments** — fetch-raw-appts.mjs pulls all appointments from GHL
- [x] **Show rate calculation** — built into dashboard metrics
- [x] **Closing tracker: "Created By" column** — createdBy tracked per appointment, setter attribution in place

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
