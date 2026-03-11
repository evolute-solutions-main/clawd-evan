# Daily Boot-Up Notion Doc — Procedure (v2)

**Purpose:** Create a single daily Notion page Max can open each morning for a top-level "Holistic CEO" view, with child pages for operational breakdowns.

---

## Output Structure

Create **one Notion page** titled: `Daily Boot-Up — YYYY-MM-DD`

Contents:
1. **Holistic CEO Summary** (inline at top of parent page)
2. **Child pages** (nested under parent — click to expand):
   - Appointment Setting
   - Client Sweep
   - Davi Breakdown
   - Bilal Breakdown

---

## Section 1 — Holistic CEO Summary

This is a **holistic overview of yesterday**, synthesized from the child pages. It reads like: "here's what happened yesterday + what that implies as we start today."

Blocks:
- **Overview (yesterday):** 3–8 bullets summarizing main takeaways
- **Key follow-ups:** 3–8 bullets (items requiring action/attention)
- **Open questions / decisions:** 0–5 bullets

Rules:
- Pull facts from child pages only — don't invent new initiatives
- Keep it concise and operational

---

## Child Page: Appointment Setting

**Goal:** Report yesterday's appointment setter performance.

### Source of Truth
Reference SOP: `/Users/max/clawd/sops/appointments-kpi-sop.md`

**Data sources (Discord channels):**
- Unconfirmed bookings: `1387098677646196887`
- Confirmed bookings: `1332578941407334430`

**Eligible messages:**
- Author = `Zapier`
- Contains `UNCONFIRMED APPOINTMENT` or `CONFIRMED APPOINTMENT`
- Ignore all non-Zapier messages

### "Added Yesterday" Definition
Use **Discord message timestamp** in America/Bogota.
- Target range: `00:00:00` to `23:59:59` for yesterday's date
- The appointment time inside the message is **NOT** used to determine the date

### Setter Extraction
Parse from message content:
- Look for `Created by:` or `Created By` field
- Known setters: Randy Nadera, Eddie Murillo, Daniel Franco
- If missing/blank → `Unknown`

### Collapse Rule (Duplicate Handling)
`person_key = (setter, phone)`
- If phone missing → fallback to `(setter, normalized_name)`
- For each `person_key` on that day → keep only the **latest** message by Discord timestamp
- EOD status = which channel the latest message came from

**What this means:**
- Person books unconfirmed at 10am, confirmed at 2pm → counts as **1 Confirmed**
- Person books 3 times same day under same setter → counts as **1**
- Same phone under different setters → counts once per setter

### Output for Notion (Collapsed View Only)

**Section A — Summary Totals**
- Confirmed (EOD): X
- Unconfirmed (EOD): Y
- Total (EOD): X + Y

**Section B — By Setter**
```
- Randy Nadera — Confirmed: X | Unconfirmed: Y | Total: Z
- Eddie Murillo — Confirmed: X | Unconfirmed: Y | Total: Z
- Daniel Franco — Confirmed: X | Unconfirmed: Y | Total: Z
- Unknown — Confirmed: X | Unconfirmed: Y | Total: Z
```

**Section C — Collapsed List (One Row Per Person)**
| Status (EOD) | Name | Appt Time | Setter | Phone | Latest Added (Bogota) |
|--------------|------|-----------|--------|-------|----------------------|
| Confirmed | John Smith | 2026-02-26 10:00 | Randy Nadera | +1234567890 | 2026-02-25 14:32 |
| Unconfirmed | Jane Doe | 2026-02-26 11:00 | Eddie Murillo | +0987654321 | 2026-02-25 09:15 |

**Notes / Anomalies:**
- Flag any rows with missing phone (fallback matching used)
- Flag any `Unknown` setter rows
- Note any unusual patterns

---

## Child Page: Client Sweep

**Goal:** Review client status from yesterday so today starts clean.

**Reference docs:**
- Procedure: `/Users/max/clawd/Evolute Solutions/client-sweep-procedure.md`
- Output template: `/Users/max/clawd/Evolute Solutions/client-sweep-output-template.md`

**Data source:**
- Discord client channels under ✅ ACTIVE CLIENTS category (`1334610131647987742`)

**Output:** Follow the Client Sweep template, framed as a yesterday review.

---

## Child Page: Davi Breakdown

**Goal:** What Davi completed yesterday + what's on his plate today.

### Sources
1. **Asana (primary):**
   - CSM Ops project: `1212818114959823`
   - Board: https://app.asana.com/1/1212775946298840/project/1212818114959823/board/1212818134278615
   - Include any other Asana tasks Davi completed

2. **Discord (truth layer):**
   - Davi team chat: `1459289532372357253`
   - Summarize what was discussed yesterday + today's implied plan

### Output Format
- **Yesterday (completed / progressed):** 3–10 bullets with task name, status change, link
- **Today (to-do / focus):** 3–10 bullets, highest-impact first, note blockers
- **Risks / Blockers:** only if applicable
- **Questions for Max:** 0–3 items only if Max must decide/approve

### Conflict Resolution
If Asana and Discord disagree:
- Prefer Discord for stated priorities/commitments
- Prefer Asana for objectively completed tasks

---

## Child Page: Bilal Breakdown

**Goal:** Same as Davi, but for Bilal.

### Sources
1. **Asana (primary):**
   - Media Buyer project: `1212871372765494`
   - Board: https://app.asana.com/1/1212775946298840/project/1212871372765494/board/1212816625728069

2. **Discord (truth layer):**
   - Bilal team chat: `1469019592302006426`

### Output Format
Same as Davi Breakdown.

---

## Implementation Notes

**Workflow:**
1. Create parent page `Daily Boot-Up — YYYY-MM-DD`
2. Add Holistic CEO Summary blocks to parent
3. Create 4 child pages nested under parent, each with its own content

**Naming convention:** Keep consistent for search/history.

**Notion location:**
- Parent page for Daily Boot-Ups: to be defined (or create in workspace root)
