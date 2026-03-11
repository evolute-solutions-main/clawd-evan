# Daily Boot-Up Report — Master Documentation

**Version:** 2.2  
**Last Updated:** 2026-02-25  
**Owner:** Evolute Solutions

---

## Overview

The **Daily Boot-Up Report** is a daily Notion page created each morning that gives Max a holistic CEO-level view of operations. It synthesizes data from multiple sources into a single actionable document.

**Naming Convention:** `Daily Boot-Up — YYYY-MM-DD`

**Notion Location:** Created as child of Client Sweeps parent page  
**Example:** [2026-02-25 — Daily Boot-Up](https://www.notion.so/2026-02-25-Daily-Boot-Up-31250a671a8f8193a36bf09db68479ec)

---

## Document Structure

```
Daily Boot-Up — YYYY-MM-DD (Parent Page)
├── Holistic CEO Summary (inline at top)
├── Appointment Setting (child page)
├── Client Sweep (child page)
├── Davi Breakdown (child page)
└── Bilal Breakdown (child page)
```

---

## Data Sources Reference

| Section | Primary Source | Channel/Project ID | Secondary Source |
|---------|---------------|-------------------|------------------|
| Appointment Setting | Discord (Zapier msgs) | Unconfirmed: `1387098677646196887`, Confirmed: `1332578941407334430` | — |
| Client Sweep | Discord client channels | Category: `1334610131647987742` | Asana Client Hub |
| Davi Breakdown | Asana CSM Ops | Project: `1212818114959823` | Discord: `1459289532372357253` |
| Bilal Breakdown | Asana Media Buyer | Project: `1212871372765494` | Discord: `1469019592302006426` |

---

# SECTION 1: Appointment Setting (DRY)

Follow these external SOPs — do not duplicate steps here:
- Logic: `/Users/max/clawd/sops/appointments-kpi-sop.md`
- Output format: `/Users/max/clawd/sops/appointment-setting-daily-report.md`

Child page content is generated strictly per the above.

---

# SECTION 2: Client Sweep (DRY)

Follow these external SOPs — do not duplicate steps here:
- Procedure: `/Users/max/clawd/Evolute Solutions/client-sweep-procedure.md`
- Output template: `/Users/max/clawd/Evolute Solutions/client-sweep-output-template.md`
- Active clients list/IDs: `/Users/max/clawd/Evolute Solutions/active-clients.md`

Child page content is generated strictly per the above.

---

# SECTION 3: Davi Breakdown (DRY)

Follow these external SOPs — do not duplicate steps here:
- Shared rules: `/Users/max/clawd/sops/employee-breakdown.md`
- Davi-specific SOP: `/Users/max/clawd/sops/davi-breakdown-sop.md`

Child page content is generated strictly per the above.

---

# SECTION 4: Bilal Breakdown (DRY)

Follow these external SOPs — do not duplicate steps here:
- Shared rules: `/Users/max/clawd/sops/employee-breakdown.md`
- Bilal-specific SOP: `/Users/max/clawd/sops/bilal-breakdown-sop.md`

Child page content is generated strictly per the above.

---

# SECTION 0: Daily Brief (Holistic CEO Summary)

Source of truth: synthesize only from the four child sections above. No net-new content. One concise paragraph and/or bullets answering: What happened yesterday? What matters today? What changed? What’s next?

---

# Notion API Implementation (DRY)

Implementation details live here:
- `/Users/max/clawd/sops/notion-daily-bootup-impl.md`

---

# Execution Checklist (DRY)

Run each section via its SOP, then write the Holistic CEO Summary:
- Appointment Setting → `sops/appointments-kpi-sop.md` + `sops/appointment-setting-daily-report.md`
- Client Sweep → `Evolute Solutions/client-sweep-procedure.md` + `client-sweep-output-template.md`
- Davi Breakdown → `sops/employee-breakdown.md` + `sops/davi-breakdown-sop.md`
- Bilal Breakdown → `sops/employee-breakdown.md` + `sops/bilal-breakdown-sop.md`
- Create Notion pages → `sops/notion-daily-bootup-impl.md`

---

# Related Files

| File | Purpose |
|------|---------|
| `/Users/max/clawd/sops/appointments-kpi-sop.md` | Appointment counting logic |
| `/Users/max/clawd/sops/appointment-setting-daily-report.md` | Appointment report output |
| `/Users/max/clawd/Evolute Solutions/client-sweep-procedure.md` | Client sweep process |
| `/Users/max/clawd/Evolute Solutions/client-sweep-output-template.md` | Client sweep output format |
| `/Users/max/clawd/Evolute Solutions/active-clients.md` | Active client channel list/IDs |
| `/Users/max/clawd/sops/employee-breakdown.md` | Shared employee breakdown rules |
| `/Users/max/clawd/sops/davi-breakdown-sop.md` | Davi-specific SOP |
| `/Users/max/clawd/sops/bilal-breakdown-sop.md` | Bilal-specific SOP |
| `/Users/max/clawd/sops/notion-daily-bootup-impl.md` | Notion API implementation for Boot‑Up |
| `/Users/max/clawd/CONNECTIONS.md` | All integration credentials/IDs |
| `/Users/max/clawd/Evolute Solutions/asana-map.md` | Asana project/board mappings |
| `/Users/max/clawd/Evolute Solutions/discord-map.md` | Discord channel mappings |

---

# Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.2 | 2026-02-25 | DRY refactor: replaced embedded procedures with references to external SOP files; added per-employee SOPs and Notion impl SOP. |
| 2.1 | 2026-02-25 | Finalized SOP: unified Daily Brief, Appointment Setting tables/visuals order, strict Client Sweep SOP reference, Employee Breakdown data sources/reconciliation and hub mapping. |
| 2.0 | 2026-02-25 | Complete rewrite. Added detailed appointment collapse logic, exact data collection steps, Notion format specifications. |
| 1.0 | 2026-02-25 | Initial version with basic structure. |
