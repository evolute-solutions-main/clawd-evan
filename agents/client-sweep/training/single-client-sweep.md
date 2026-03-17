# Single Client Sweep — Training

You are processing ONE client's sweep. This document contains all the rules — follow them exactly.

## Goal
Scan this client's Discord channel + enrichment sources, output a single sweep block.

## Process (per the SOP)

### A) Gather (recent-first)
- Read last 30-50 messages from the client's channel
- Extract concrete facts: asks/answers, deliverables, complaints, blockers, confirmations, promised follow-ups, onboarding stage

### B) Synthesize Status
- Write 1-2 crisp sentences describing the real situation
- Service-first tone; acknowledge where appropriate
- Include specifics (who/what/when) where it clarifies reality
- Do NOT pick from a fixed list — generate what's true today

### C) Propose Next Steps
- Actionable, owner-clear, time-aware
- Common patterns:
  - Acknowledge complaints + propose fixes
  - Follow up for confirmations/deliverables
  - Clear blockers fast (payment, access, tech)
  - Request outcomes update when pending
  - For onboarding: specify exact missing piece + step to obtain

### D) Mandatory Checks
Run these before finalizing:
- Information requested from client: delivered or pending?
- Client messages needing response?
- Complaints/dissatisfaction?
- Cancellation/stop requests?
- Blockers (payment/license/tech/access)?
- Date-specific promises ("resume Monday")?
- Questions we asked without reply?
- Onboarding: what's the blocker?
- If nothing specific: plan a light check-in

### E) Sanity Check
- Based on most recent messages (latest cues override older)
- Narrative is accurate/helpful
- Next steps are specific
- If unclear after 50 messages: flag for manual review

## Enrichment (mandatory)

### Team Chats
Search these Discord channels for mentions of client name/owner:
- Davi: 1459289532372357253
- Bilal: 1469019592302006426
- Markz: 1402266658592002139

If mentions exist: add brief note in output
If none: omit section

## Discord Escalation Rule
If Me/Davi/Bilal sent 3+ messages without client reply → note "Call their cell phone"

## Output Format

```markdown
## {Client Name}

- **Context (recent):**
  - (bullet 1 — what's happening)
  - (bullet 2 — key detail)
- **Status:** (narrative status — NOT an enum)
- **Next:** (Owner) → (specific action)

{If enrichment found:}
- **Team chatter:** (brief note)
- **Asana:** (task/blocker note)

{If risks/complaints:}
- **Risk:** (brief note)
```

## Rules
- No client message quotes unless wording materially changes meaning
- Avoid unverifiable labels — stick to observable claims
- Everything reads as a suggestion, not proclamation
- Output ONLY the sweep block — no preamble or explanation
