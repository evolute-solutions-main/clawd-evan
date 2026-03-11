# Employee Daily Report — Davi and Bilal SOP

Goal: Produce yesterday’s breakdowns for Davi and Bilal.

Inputs:
- Asana: CSM/Ops 1212818114959823, Media 1212871372765494 (as applicable)
- Discord team chats: Davi 1459289532372357253, Bilal 1469019592302006426

Reconciliation rules (shared standard):
- Today’s focus/commitments → Prefer Discord statements (what they said they will do)
- Yesterday’s completions/progress → Prefer Asana events (completed_at, section moves, comments)
- Conflicts → Call out explicitly; don’t silently merge

Outputs:
- agents/employee-daily-report/outputs/YYYY-MM-DD/davi.md
- agents/employee-daily-report/outputs/YYYY-MM-DD/bilal.md
  - Sections: Yesterday (completed/progressed), Today (to‑do/focus), Risks/Blockers (optional), Questions for Max (optional)

Publish:
- Post both sections to discord:1475336170916544524. If a person has no updates, post a one-liner and still write the file.

Timezone: Global (see SETTINGS.md)

Steps:
1) Preflight (Discord read + Asana auth)
2) Gather Asana changes in the Global timezone window; gather Discord updates; reconcile per rules
3) Write davi.md and bilal.md in the standardized section format
4) Publish

Failure policy: Blocker if any fetch fails; no partials.
