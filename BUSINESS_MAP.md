# BUSINESS MAP — Evolute Solutions
# Every moving part. What exists, what doesn't, what needs to be built.

Last updated: 2026-03-25
Status key: ✅ Built | 🔧 Partial | ⬜ Not built

---

## 1. LEAD GENERATION (Your Own Acquisition)

Getting leads into Evolute's own pipeline.

### Meta Ads (Inbound)
- ⬜ Daily campaign health check (CPL, spend pacing, ROAS)
- ⬜ Payment method status — alert before campaigns pause
- ⬜ Campaign active/paused status
- ⬜ Week-over-week performance comparison
- ⬜ Alert when CPL spikes or lead volume drops

### Cold SMS (Outbound)
- ✅ Appointment reports per setter per day
- ✅ Show rate / close rate tracking
- ✅ Setter attribution (who set the appointment)
- ⬜ Daily setter KPI dashboard (dials, sets, show rate, close rate per person)
- ⬜ Alert when setter activity drops below threshold

### Lead Tracking in GHL (Your Own Leads)
- ✅ Appointments pulled from GHL calendars
- ⬜ Lead response rate (how many replied after opt-in)
- ⬜ Lead-to-booked rate
- ⬜ Follow-up tracking — notes, next steps, last contact per lead
- ⬜ Stale lead alerts — leads with no activity in X days

---

## 2. SALES PIPELINE

Converting leads into paying clients.

### Appointment Management
- ✅ GHL appointment sync (polling)
- ⬜ GHL webhooks — real-time appointment sync (replace polling)
- ✅ Status tracking: new → confirmed → showed → closed/not_closed
- ✅ No-show / cancellation tracking
- ✅ Fathom call matching (showed = recording exists)

### Follow-Up Tracking
- ⬜ Follow-up notes per lead (what was said, what was promised)
- ⬜ Next follow-up date per lead
- ⬜ Alert when follow-up is due or overdue
- ⬜ Follow-up sequence tracking (attempt 1, 2, 3...)

### Close Tracking
- ✅ Cash collected (upfront + after first call)
- ✅ Contract revenue logged
- ✅ Closer attribution
- ⬜ Close rate by lead source (ads vs cold SMS)
- ⬜ Close rate by closer

---

## 3. CLIENT ONBOARDING

From signed deal to fully launched.

### Contract & Payment
- ⬜ Contract sent / signed tracking per client
- ⬜ Upfront payment collected confirmation
- ⬜ Onboarding status: deal closed → contract signed → payment collected

### Access Collection
- ⬜ Checklist: Meta Business Manager access, ad account access, GHL access, any other tools
- ⬜ Daily alert for missing access items (name, what's missing, days waiting)
- ⬜ Follow-up draft messages for Max to send when access is stalled

### Creative Production
- ⬜ Intake form received tracking
- ⬜ Ad script generated (see Ad Script Generator below)
- ⬜ Video/photo assets received or scheduled
- ⬜ Scripts written and approved

### Ad Setup & Launch
- ⬜ Ads built in Meta Ads Manager
- ⬜ GHL integration connected (pipeline, forms, automations)
- ⬜ Tracking / pixel verified
- ⬜ Campaigns launched
- ⬜ First results review scheduled

### Onboarding Dashboard
- ⬜ Per-client checklist view: every step, status, who's responsible, days since last update
- ⬜ Stuck client alerts — any step overdue X days → Discord ping

---

## 4. CLIENT FULFILLMENT

Ongoing delivery after launch.

### Ad Script Generator
- ⬜ Bot trained on all past ad scripts written for clients
- ⬜ Takes onboarding intake info as input
- ⬜ Generates personalized scripts per client (hooks, body, CTA)
- ⬜ Output: ready-to-record scripts for video team

### Creative Pipeline
- ⬜ Track status of video/photo production per client
- ⬜ Creative revision tracking
- ⬜ Asset delivery to client or upload to ads manager

### Ads Management
- ⬜ Campaign performance review cadence (weekly / bi-weekly)
- ⬜ Campaign update log (what was changed, when, why)
- ⬜ A/B test tracking
- ⬜ Budget change log

### GHL / CRM Setup
- ⬜ Pipeline stages configured per client
- ⬜ Automations live and tested
- ⬜ Integration health check (forms → GHL → notifications)

---

## 5. CLIENT SUCCESS (CSM)

Keeping clients healthy and retained.

### Client Health Monitoring
- 🔧 Daily Discord sweep — reads client channels, LLM analysis, posts to Notion
- ⬜ Sentiment scoring per client over time (getting better/worse?)
- ⬜ Escalation detection — flag distressed clients automatically
- ⬜ CSM knowledge base — historical complaint handling, what worked, tone per client
- ⬜ Action recommendations per client (not just status, but "do this")

### Client Ad Performance (Their Pipeline)
- ⬜ GHL lead volume per client — how many leads coming in
- ⬜ Lead quality tracking — fake/invalid leads flagged
- ⬜ Lead response rate — how many replied
- ⬜ Lead-to-booked rate — how many booked appointments
- ⬜ Estimate / proposal sent rate
- ⬜ Weekly performance summary per client

### Client Check-Ins
- ⬜ Check-in cadence tracker (when was the last call, when is the next one)
- ⬜ Fathom call summaries — what was discussed, what was promised
- ⬜ Follow-up on promises made in calls
- ⬜ Renewal date tracker — when does each client's contract end

### Software / Integration Health
- ⬜ GHL integration status per client (are automations firing?)
- ⬜ Ad account health (campaigns active, no payment issues)
- ⬜ Alert if client ad account goes dark or has errors

---

## 6. PAYMENTS & FINANCE

Money in, money out, money owed.

### Client Payment Collections
- ⬜ Contract value per client logged
- ⬜ Payment schedule (installments, upfront + residual, etc.)
- ⬜ Amount paid to date per client
- ⬜ Amount outstanding per client
- ⬜ Upcoming payment reminders (7 days out)
- ⬜ Overdue payment alerts with days overdue
- ⬜ Failed payment handling — detect and flag immediately
- ⬜ Renewal date reminders — before contract expires

### Payroll & Commissions
- ⬜ Setter pay rules (base + commission per confirmed appt or close)
- ⬜ Commission calculation per setter per period
- ⬜ Media buyer pay (flat or performance-based)
- ⬜ Other contractor pay
- ⬜ Payroll report generated on schedule (weekly/bi-weekly/monthly)
- ⬜ Payment log — who was paid, when, how much

### Business Financials
- ✅ Expense tracking (expenses.json — bank + manual)
- ✅ Revenue tracking (transactions.json — Stripe + Fanbasis)
- ✅ P&L calculation (in dashboard)
- ✅ CAC calculation
- ⬜ Ad spend auto-import (currently manual — pull from Meta API)
- ⬜ Monthly P&L report to Discord
- ⬜ Cash flow view (what's coming in vs. going out this month)

---

## 7. TEAM & PEOPLE

Hiring, onboarding, and managing the team.

### Setter Management
- ✅ Setter attribution on appointments
- ✅ Dials tracking (manual input)
- ⬜ Daily/weekly KPI report per setter (dials, sets, shows, closes, commission earned)
- ⬜ Performance threshold alerts (setter below X dials or sets this week)
- ⬜ Setter scorecard over time

### Media Buyer Management
- ⬜ Weekly performance review (CPL, ROAS, spend vs. budget)
- ⬜ Campaign change log (what they updated and when)
- ⬜ Accountability check-in cadence

### Hiring
- ⬜ Hiring pipeline tracker (applicants, stage, notes per candidate)
- ⬜ Interview scheduling and tracking
- ⬜ Hiring criteria / scorecard per role
- ⬜ Offer tracking

### Team Onboarding (Setters + Others)
- ⬜ Setter contract sent / signed tracking
- ⬜ Onboarding checklist (SOP exists — needs to be codified in system)
- ⬜ Training materials / resource delivery
- ⬜ First week check-in

---

## 8. OPS & REPORTING

The visibility layer — everything surfaced without Max having to look.

### Daily Briefing
- ⬜ Morning Discord message (~8am BRT) covering:
  - Onboarding blockers
  - Overdue collections
  - Ads health (your own)
  - Today's appointments
  - Client escalations
  - Payroll reminders (on payroll week)
  - Setter KPIs

### Dashboard (sales_tracker.html)
- ✅ Sales overview (closes, revenue, show rate, CAC)
- ✅ Setter performance tab
- ✅ Appointments tab
- ✅ P&L tab
- ✅ Costs & CAC tab
- ⬜ Onboarding tracker tab
- ⬜ Collections / outstanding payments tab
- ⬜ Payroll tab
- ⬜ Client ad performance tab (their GHL pipelines)
- ⬜ Team KPIs tab

### Reporting
- 🔧 Client sweep → Notion (daily)
- ⬜ Weekly business summary (revenue, closes, collections, client health)
- ⬜ Monthly P&L report

---

## TOOLS & INTEGRATIONS

What's connected vs. what needs to be added.

| Tool | Status | Used For |
|------|--------|----------|
| GHL | ✅ Connected | Your appointments, eventually client pipeline data |
| Meta Ads API | ⬜ Not connected | Your ad health, client ad health |
| Fathom | ✅ Connected | Call recordings, show detection, follow-up |
| Discord | ✅ Connected | Client channels, team comms, all alerts surface here |
| Notion | ✅ Connected | Sweep reports |
| Google Sheets | ✅ Connected | Data backup / export |
| Google Calendar | ✅ Connected | Upcoming meetings |
| Asana | 🔧 Partial | Task management (removed from sweep, still configured) |
| Stripe / Fanbasis | 🔧 Manual import | Client payments |
| DocuSign / contract tool | ⬜ Not connected | Contract tracking |

---

## SUMMARY COUNTS

- ✅ Built: ~15 items
- 🔧 Partial: ~5 items
- ⬜ Not built: ~65 items

The gaps are real but they're systematic — most of them cluster around 4 themes:
1. Onboarding (client + team) — zero automation today
2. Collections & payments — zero automation today
3. Client ad performance (their GHL data) — zero visibility today
4. Daily proactive alerting — everything is pull, nothing is push
