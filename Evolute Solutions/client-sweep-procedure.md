# Daily Client Sweep - Procedure (v3)

Goal: a fast daily scan of every active client channel, producing a short, readable list sorted by urgency.

## Inputs
- Discord: client channels under **✅ ACTIVE CLIENTS** category.
- Discord (enrichment): scan **team chats** (currently limited to channels: davi `1459289532372357253`, bilal `1469019592302006426`, markz `1402266658592002139`) for mentions of client business/owner names.
- Asana (enrichment): search tasks across Asana for client business/owner names.

## Client set
- Use Discord category id `1334610131647987742` under guild `1164939432722440282`.
- Active client channel IDs live in `active-clients.md`.

## Output rules (keep it clean)
For **each client**, output only:
- **Context (recent):** 1-2 bullets (what's been going on)
- **Status:** one of:
  - **Needs response** (unanswered client ask / complaint / blocker)
  - **Needs follow-up** (we owe a check-in, confirmation, deliverable, or scheduling)
  - **Onboarding in progress** (setup not complete; launch not announced; assets/access pending)
  - **Stable** (no action needed)
- **Suggested next action:** single owner + deadline
- **Successful response criteria:** include **ONLY** when Status = Needs response (these are criteria, not draft wording)

### Discord escalation rule (follow-up)
- If **Me / Davi / Bilal** have sent **3+ outbound messages** in the client's Discord channel **without any client reply**, add a note in that client's sweep block: **Call their cell phone**.

## Sorting (no numeric scoring)
Sort top → bottom by:
1) **Needs response**
2) **Onboarding in progress** (if there's an active blocker)
3) **Needs follow-up**
4) **Stable**

Within a bucket, put the most time-sensitive / highest-impact issues first.

## Guidance
- Do **not** include client message quotes unless the exact wording materially changes the meaning.
- Avoid unverifiable labels. Stick to observable claims (e.g., "client reports accidental/unclear intent leads").
- Everything should read as a **suggestion** (owner + next action), not a proclamation.

## Procedure (per client)
1) Identify last-touch (team → client).
2) Identify any client-authored item that appears unanswered.
3) Decide Status:
   - Needs response if there's an open ask/blocker.
   - Onboarding in progress if setup/launch is still underway.
   - Needs follow-up if no open ask, but we should confirm/acknowledge/check.
   - Stable if none of the above.
4) Write 1-2 context bullets.
5) Add suggested next action.
6) Add success criteria only for Needs response.

## Enrichment (mandatory checks; omit section if empty)
These checks are **required** every sweep. Only omit the *output section* if no results are found.

### A) External team chatter (Discord)
- **Always search** team chats (currently: davi `1459289532372357253`, bilal `1469019592302006426`, markz `1402266658592002139`) for mentions of:
  - client business name
  - client owner name
- Exclude the client's own channel.
- If hits exist: add a short section at the end of that client block:
  - **External team chatter (Discord):** 1–3 bullets max, each with channel + who + date + deep link.
- If no hits: omit this section entirely (don't write "none found").

### B) Launch/Onboarding blockers (Asana)
- **Always search** Asana tasks (for every client, not just onboarding) for:
  - client business name / owner name
  - launch/onboarding keywords (e.g., access, assets, creative, BM, page, pixel, domain, calendar, form, pipeline)
- If tasks exist: add:
  - **Asana blockers:** bullets for the most relevant open items (task name → assignee, due date, status, link).
- If no tasks: omit this section entirely.
