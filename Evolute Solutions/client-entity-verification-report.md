# Client Entity Verification Report (draft)

Generated: 2026-02-23 (America/Bogota)

Scope:
- Inferred owner identities from recent Discord messages in each client channel.
- Asana Client Hub mapping exists for 16 clients; **FLH Services** + **Epic Modulars** have no Client Hub task yet (per Max: onboarding not completed).

Legend:
- **Owner candidate** = most likely business owner contact(s) based on recent client-side posts.
- **Confidence** is heuristic: high when the person is clearly the client and repeatedly posts; med when unclear/multiple; low when no client messages found.

---

## Clients

### American Designer Homes
- Owner candidate(s): `georgemeyer.` (Global name: George Meyer)
- Confidence: high
- Notable context: concerns about lead quality + billing/card issues.

### AZ Remodeling and Rooter
- Owner candidate(s): `philsegev` (Global name: Phil segev)
- Confidence: high
- Notable context: licensing issues; asked to freeze ads.

### Be-Decking and Construction
- Owner candidate(s): `bedeckkings` (Global name: Brian)
- Confidence: high
- Notable context: appointment booking/calendar integration issues.

### Braymiller Builders
- Owner candidate(s): `mikeweb_73081` (Global name: MikeWeb)
- Confidence: high
- Notable context: creative direction (tub/shower only) + asset sharing.

### Concept II Closets
- Owner candidate(s): `rosspino_86865` (Global name: Ross Pino), `trish088059` (Global name: Trish)
- Confidence: high
- Notable context: creative approval + sizing issues; high sensitivity to brand fit.

### FLH Services
- Status: **initial_launch** (onboarding not completed yet)
- Owner candidate(s): _unknown (no recent messages returned)_
- Confidence: low
- Action needed: once onboarding is done, create/link Client Hub task and then infer owner from Discord + Asana.

### Four Seasons Design Build
- Owner candidate(s): `kennyhewitt_59481` (Global name: Kenny Hewitt)
- Confidence: high

### Innavik
- Owner candidate(s): `c_.o_._` (Global name: Christian), `nturk960311` (Global name: Turk0311)
- Confidence: high

### Master Design Construction
- Owner candidate(s): `masterdesignconstruction_30392` (Global name: Master Design Construction)
- Confidence: high
- Notable context: comms lag; requests about GHL stages; concerns about ad messaging.

### Prestige Home Remodeling
- Owner candidate(s): `mike_318564` (Global name: MIke), `kristenbond0646` (Global name: Kristen Bond)
- Confidence: high
- Notable context: wants address required in lead form; ad spend cap request.

### Pro Built Co
- Owner candidate(s): `billasher_` (Global name: Bill Asher)
- Confidence: high
- Notable context: onboarding blocked on Meta Business Manager access.

### Satin Touch
- Owner candidate(s): `chadlange` (Global name: Chad Lange)
- Confidence: high
- Notable context: onboarding + lead spreadsheet request.

### STP Floors (STP4)
- Owner candidate(s): _not inferred in this pass (not yet pulled from Discord in this report)_
- Confidence: low

### Susquehanna Home Solutions
- Owner candidate(s): _not inferred in this pass (not yet pulled from Discord in this report)_
- Confidence: low

### The Perfectionist Construction
- Owner candidate(s): _not inferred in this pass (not yet pulled from Discord in this report)_
- Confidence: low

### The Redwood Exotics
- Owner candidate(s): _not inferred in this pass (not yet pulled from Discord in this report)_
- Confidence: low

### Tillup LLC
- Owner candidate(s): _not inferred in this pass (not yet pulled from Discord in this report)_
- Confidence: low

### Epic Modulars
- Status: **initial_launch** (onboarding not completed yet)
- Owner candidate(s): _unknown (no Client Hub task; Discord not yet inferred in this report)_
- Confidence: low

---

## Next steps to finalize
1) Pull remaining client channels (STP Floors, Susquehanna, Perfectionist, Redwood, Tillup, Epic) and fill owner candidates.
2) For FLH + Epic:
   - when onboarding form is submitted, **create** Client Hub tasks and store their `asana.clientHubTaskGid`.
3) Once owners are verified, write them into `Evolute Solutions/client-entities.json`:
   - `owner.name` (human name)
   - `owner.discordUsername` (username)
   - `status` (initial_launch / making_updates / active / paused / at_risk)
