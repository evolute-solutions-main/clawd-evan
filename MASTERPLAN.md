# MASTERPLAN.md — Evolute Solutions AI Automation

**Goal:** Every business function systematized in AI. Max's job = review & decide, not execute. Everything surfaces in Discord + dashboard with live reminders.

Last updated: 2026-03-25

---

## Current State

**What exists:**
- Sales tracker dashboard (GHL + Fathom → show rates, CAC, P&L, setter attribution)
- Client sweep (daily Discord → LLM analysis → Notion)
- Appointment tracking (cold SMS Discord → reports)
- Data layer: `data/sales_data.json`, `data/expenses.json`, `data/transactions.json`
- Integrations ready: Discord, GHL, Fathom, Google Sheets, Google Calendar, Notion, Asana, Stripe

**What's manual / not automated:**
- Onboarding (getting access, building ads, following up, fixing issues)
- Checking Meta ads manager (CPL, payment issues, campaign health)
- Payroll & commissions calculation
- Payment collections from clients
- Daily "what needs my attention" — lives in Max's head

---

## Business Domains & Automation Plan

---

### 1. ONBOARDING — High Priority

**Problem:** Manually tracking who has given access, what ads are built, what's launched, what's blocked. Nothing prompts Max to follow up.

**Goal:** Zero manual tracking. Every onboarding client has a live checklist. Blockers surface automatically every day until resolved.

**What to build:**
- Onboarding checklist per client stored in `data/onboarding.json`:
  - Steps: contract signed → payment collected → intake form received → GHL access granted → ad account access → ads built → ads launched → first results review
  - Each step: `{ step, status, assignee, dueDate, completedAt, notes }`
- Daily onboarding agent (runs each morning):
  - Scans all active onboarding clients
  - Identifies blockers (step overdue, access not received, etc.)
  - Posts a concise follow-up list to Discord with names, stuck step, days overdue
  - Optionally: draft follow-up messages for Max to send (or send automatically)
- Dashboard panel: Onboarding tracker tab showing all clients + step statuses

**Data sources:** Manual input to start; eventually pull from GHL pipeline stages + Asana

---

### 2. CLIENT SUCCESS (CSM SWEEP) — Medium Priority

**Problem:** Sweep gives status but doesn't know context — doesn't know what worked last time, how similar situations were handled, what tone works for which client.

**Goal:** Sweep that advises on action, not just reports status. Trained on actual history.

**What to build:**
- **CSM knowledge base:** Extract past Discord complaint handling from client channels
  - For each significant event: what happened, what action was taken, outcome
  - Store as structured data in `data/csm-knowledge.json`
  - Use this as context in the sweep LLM prompt ("similar situation with X in [date], handled by doing Y")
- **Escalation detection:** Auto-flag clients showing distress signals (negative sentiment, no activity, slow results)
- **Action recommendations per client:** Not just "here's what's happening" but "here's what to do about it"
- **Sweep intelligence upgrade:** Update `analyze-client.mjs` prompt to use CSM knowledge base

---

### 3. SALES & ACQUISITION

**Problem:** Meta ads checked manually; no alerts for payment failures or underperforming campaigns.

**Goal:** Daily ads health check, auto-alert on anomalies.

**What to build:**
- **Meta integration agent:**
  - CPL by campaign/ad set
  - Budget pacing (on track vs. overspending)
  - Payment method status (flag failed payments before campaigns pause)
  - Campaign active/paused status
  - Comparison to prior week
- **GHL webhook receiver** (already in TODO):
  - Replace polling for appointments with real-time webhook
  - Auto-update `data/sales_data.json` on new appointments, status changes
- **Show/close rate alerts:**
  - If show rate drops below threshold → Discord alert
  - If no closes in X days → alert

**Data sources:** Meta Marketing API (new), GHL webhooks (new)

---

### 4. PAYROLL & COMMISSIONS — Medium Priority

**Problem:** Payroll is calculated manually. Commission math is in Max's head.

**Goal:** Run once a week/month, outputs exact amounts owed to each person.

**What to build:**
- Payroll calculator agent:
  - **Setters:** base pay (from expenses.json historical patterns) + commission per confirmed appointment or close
  - **Media buyer:** flat rate or performance-based (define structure)
  - **Others:** any other contractors (configurable per-person rules in `data/payroll-config.json`)
- Commission rules stored in `data/payroll-config.json`:
  - Per setter: rate per confirmed appt, bonus per close, base if applicable
  - Lookback period configurable (weekly/bi-weekly/monthly)
- Output: payroll report to Discord + CSV for records
- Dashboard tab: Payroll / Commissions

---

### 5. PAYMENT COLLECTIONS — Medium Priority

**Problem:** No systematic tracking of who owes money, when it's due, what's overdue.

**Goal:** Never forget a collection. Auto-reminders for overdue amounts.

**What to build:**
- Collections tracker in `data/collections.json`:
  - Per client: total contracted, installments, amount paid, amount due, due dates, payment status, notes
  - Statuses: `on_track | overdue | paid_in_full | at_risk | in_dispute`
- Daily collections check agent:
  - Flag any payment due in next 7 days
  - Flag any overdue payments
  - Post summary to Discord
- Dashboard tab: Collections (who owes what, days overdue, total outstanding)
- Optionally: draft collection follow-up messages for Max to send

**Data sources:** `data/transactions.json` (what's been paid), manual input for contract terms

---

### 6. DAILY BRIEFING — Foundation Layer

**Problem:** Max has to pull everything together himself each morning.

**Goal:** One morning message to Discord that tells Max exactly what needs attention today, across all domains.

**What to build:**
- Morning briefing agent (runs ~8am BRT):
  - Onboarding: X clients stuck, needs follow-up
  - Collections: X payments overdue, Y due this week
  - Ads: campaign health status, any alerts
  - Appointments today: who's showing up, what to prep
  - Client health: any escalations from yesterday's sweep
  - Payroll: if it's payroll week, reminder of amounts owed
- Single Discord message, compact, action-focused

---

### 7. OPS DASHBOARD — Ongoing

**Problem:** Dashboard is sales-only. No ops visibility.

**Goal:** Extend `sales_tracker.html` into full ops hub.

**Tabs to add:**
- Onboarding tracker
- Collections / Outstanding payments
- Payroll / Commissions
- Meta Ads health
- P&L (already partially exists)
- Team performance (dials, show rates by setter)

---

## Build Roadmap

### Phase 1 — Foundation (High Impact, Low Complexity)
1. **Onboarding tracker** — data model + daily Discord alert (no new integrations needed)
2. **Collections tracker** — data model + daily Discord alert
3. **Payroll calculator** — rules-based, reads existing data

### Phase 2 — Intelligence
4. **CSM knowledge base** — extract Discord history, update sweep prompt
5. **Morning briefing agent** — aggregate all Phase 1 outputs
6. **Dashboard: Onboarding + Collections + Payroll tabs**

### Phase 3 — New Integrations
7. **Meta ads integration** — Meta Marketing API
8. **GHL webhooks** — replace polling

### Phase 4 — Full Automation
9. **Auto-follow-up drafting** — onboarding + collections
10. **Fathom follow-up agent** — post-call action plans
11. **CSM escalation auto-response** — draft responses to client issues

---

## Architecture Principles

- **Data lives in `data/*.json`** — single source of truth, human-readable
- **Agents read data, post to Discord** — Discord is the ops surface
- **Dashboard renders from JSON** — rebuild via `inject-and-open.mjs`
- **Max reviews, doesn't execute** — agents surface actions, Max approves or ignores
- **New integrations via `agents/_shared/`** — shared clients, not per-agent copies

---

## Open Questions for Max

1. **Setter commission structure:** Is it per confirmed appointment, per show, per close, or some combo? What's the current rate?
2. **Media buyer pay:** Flat monthly? Performance %? Who is the current media buyer?
3. **Onboarding steps:** What are the actual steps in your onboarding process? (e.g. intake → access → creative brief → ads built → launched)
4. **Collection terms:** Are client contracts installment-based? Upfront + residual? Need to know structure to model it.
5. **Meta API access:** Do you have a Meta Business Manager token / system user token we can use?
