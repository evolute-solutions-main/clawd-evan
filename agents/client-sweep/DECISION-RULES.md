# Client Sweep — Decision Rules (Narrative, Recent-First)

This file is the canonical decision-making spec for the Client Sweep agent. It replaces fixed enums with a narrative status and tailored next steps per client.

## Core Principles
- Recent-first: Base today’s determination on the most recent explicit messages (last 10–50). Latest cues override older context.
- Service-first: Acknowledge clearly, propose practical fixes, and bias toward helpful follow-ups.
- No generics: Compose a client-specific status narrative; do not emit bucket labels.
- Deterministic: If unclear after 50 messages, flag for manual review (don’t guess).

## Per-Client Process

A) Gather (recent-first)
1) Read the last 10–50 messages in the client’s channel (start with ~10; expand only if unclear).
2) Extract concrete facts from the most recent exchanges:
   - Information we requested; whether it was delivered
   - Messages from client that need a response
   - Complaints/dissatisfaction/budget distress
   - Cancellation/stop requests
   - Blockers: payment, license/permit, tech, ads access, CRM/login
   - Date-specific promises (e.g., resume Monday)
   - Questions we asked without reply (follow-up needed)
   - Post-launch actions (CRM access resend/reset)
   - Optimization signals (report shared; low conversions)
   - Outcomes/feedback acknowledgements ("on my list", "I’ll get back")
   - Onboarding stage + specific blocker
   - Any other material cues (open scan)

B) Synthesize a status narrative (case-by-case)
- Write 1–2 sentences that state the true current situation using specific recents (who/what/when) when it clarifies.
- Examples of phrasing (illustrative, not exhaustive):
  - "Launched last week; client shared a performance report noting low conversions; optimization pass needed."
  - "Asked for feedback on lead quality yesterday; client said it’s on their list—awaiting their outcomes update."
  - "Ads paused per client due to budget; acknowledged concerns; next is a resolution plan if/when they resume."
  - "CRM access was resent and login reset; need to confirm teammate successfully logged in and that everything is clear."

C) Propose next steps (guided, not limited)
- Actionable, owner-clear, time-aware. Use the toolkit below when relevant:
  - Acknowledge complaints; propose 2–3 concrete optimizations; offer quick call if helpful
  - Follow up for confirmations/deliverables; resend tests/access where applicable
  - Clear blockers fast (schedule payment call; confirm license readiness; grant access; fix tech)
  - If optimization needed, reference the report and propose 2–3 changes; ask constraints/preferences
  - If outcomes pending, ask for a brief outcomes update and confirm handling process
  - For onboarding, specify the exact missing piece and the fastest unblock step
  - For launch-ready "ensure-on", verify campaigns are on and confirm to the client that everything is live

D) Mandatory checks (must run) + Open scan
- Info requested: delivered or pending? If pending, remind/follow up
- Messages needing response: respond ASAP (include acknowledgment/fixes if complaint)
- Complaints/dissatisfaction/budget: acknowledge + propose fixes
- Cancellation/stop: offboard (confirm ads/billing stop; final summary; closure; reactivation path; feedback)
- Blockers: clear quickly (schedule/confirm/action)
- Date-specific actions: plan and note
- Unanswered questions we asked: follow up
- Onboarding stage: identify blocker + fastest unblock step
- If no specific actions: plan a light check-in to gauge performance/state
- Open scan: include other material cues not on the list

E) Sanity checks (before emitting)
- Narrative clearly references current facts from the recent messages
- Most recent cues override older talk
- Next steps are specific and aligned to client results; no boilerplate
- If still unclear after 50 messages: flag for manual review (no guess)

## Rendering Rules
For each client, output:
- Context (recent): 1–2 bullets (no quotes unless wording changes meaning)
- Status: a short narrative line (not an enum)
- Next: single owner + concrete action(s)

## Examples → Mappings (Illustrative)
These are patterns used by tests to prevent regressions. They illustrate the narrative you should arrive at, not fixed labels:
- "Stop ads / cancel" → Offboarding narrative + closure steps
- "Dissatisfied / ran out of money" → Acknowledge-then-restore narrative + fixes proposal
- "Resend CRM / reset login" post-launch → Confirm-login narrative + light results check
- "Performance report; low conversions" → Optimization narrative + 2–3 concrete changes
- "Feedback on leads; I’ll get back" → Outcomes-awaiting narrative + follow-up
- "Resume Monday" → Resume-date narrative + re-launch steps
- "Ensure everything is on" → Ensure-on narrative + client confirmation

## Implementation Notes
- The generator should treat signal detectors as inputs into a narrative builder, not as final buckets.
- Generic fallbacks are disabled; when insufficiently clear, raise a review flag.
- Tests validate that known patterns still map to the correct narrative/next (regression only; tests don’t freeze live status).
