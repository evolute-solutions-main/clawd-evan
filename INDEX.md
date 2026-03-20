# INDEX.md — Workspace Command Map

This repo serves two purposes: **business data analytics** (JSON databases + dashboard) and **daily AI operations** (Evan's agent tasks). Both are described here.

---

## Business Data — Canonical JSON Databases

These three files are the single source of truth for all Evolute Solutions business data. Read them directly when answering any question about revenue, expenses, clients, appointments, or P&L.

| File | Contents | Key fields |
|---|---|---|
| `sales_data.json` | All GHL appointments + monthly dial counts | `{ appointments: [{id, contactName, status, startTime, setter, channel, closer, cashCollected, contractRevenue, followUpBooked}], dials: [{setter, date, dials}] }` |
| `expenses.json` | All business expenses 2022–2026 (1,066 entries, unified from bank statements + manual records) | `{ id, date, vendor, amount, category, channel, department, excludeFromCAC, source }` — categories: ad_spend, software, payroll, consulting, refund, other |
| `transactions.json` | All client payments 2025+ (Stripe + Fanbasis, 153 records) | `{ email, name, amount, net, fee, date, source }` |

### How to answer business questions using the data

| Question | Where to look |
|---|---|
| Closes, show rate, CAC this month | `sales_data.json → appointments` filtered by date + status |
| Ad spend or SMS spend | `expenses.json` where category=ad_spend or channel=cold_sms |
| Client LTV / payment history | `transactions.json` grouped by email then normalized name |
| Outbound dials per setter | `sales_data.json → dials` |
| Monthly P&L | `transactions.json` (revenue) minus `expenses.json` (costs) by month |

### Dashboard
`sales_tracker.html` is a self-contained analytics dashboard. It's updated by running:
```bash
node scripts/inject-and-open.mjs
```
Never edit data directly in the HTML — the inject script overwrites it.

---

## Daily Outputs — Evan's Agent Tasks (independent jobs)

- Client Sweep → Evolute Solutions/client-sweep-procedure.md, Evolute Solutions/client-sweep-output-template.md, Evolute Solutions/active-clients.md
- Appointment Setting → sops/appointments-kpi-sop.md, sops/appointment-setting-daily-report.md
- Employee Breakdowns → sops/employee-breakdown.md, sops/davi-breakdown-sop.md, sops/bilal-breakdown-sop.md

## Implementation Notes
- Client Sweep canonical compute: `node agents/client-sweep/scripts/run-pipeline.mjs` — deterministic pipeline (fetches Discord messages in code, LLM interprets, code assembles report). SOP: agents/client-sweep/SOP.md
- Appointments: see sops/appointments-kpi-sop.md for logic and sops/appointment-setting-daily-report.md for output format
- Employees (Davi/Bilal): sops/employee-breakdown.md shared structure + person‑specific SOPs

## Maps (IDs / routing)
- Asana projects: Evolute Solutions/asana-map.md
- Discord categories/channels: Evolute Solutions/discord-map.md
- Active clients list/IDs: Evolute Solutions/active-clients.md

## Run Commands (what you can ask Evan)
- "Run a client sweep for [date or window]"
- "Appointment setter report for [yesterday/today]"
- "Davi breakdown for [YYYY‑MM‑DD]" / "Bilal breakdown for [YYYY‑MM‑DD]"

## Notes
- DRY: master docs should reference SOPs instead of duplicating steps.
- If you add/change a process, update the SOP and then update this INDEX.md with the new path.
