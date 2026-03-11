# Client Sweep — SOP

Goal: Generate the daily Client Sweep per SOP and publish to the reports channel.

Window: Yesterday in the Global Timezone (see SETTINGS.md) 00:00–23:59.

Inputs:
- Discord (guild 1164939432722440282):
  - Categories: ACTIVE CLIENTS 1334610131647987742; ONBOARDING IN PROGRESS 1478798565810770104
- Enrichment checks (include sections only if any hits):
  - Team chats: davi 1459289532372357253, bilal 1469019592302006426, markz 1402266658592002139
  - Asana Client Hub project: 1213220062504456

Outputs:
- agents/client-sweep/outputs/YYYY-MM-DD/sweep.md (SOP-conformant blocks)

Publish:
- Post sweep.md content to discord:1475336170916544524

Steps:
1) Preflight
2) Enumerate all channels in the two categories and summarize activity per client
3) Run enrichment checks and include sections only if non-empty
4) Render via agents/client-sweep/scripts/clientSweepDaily.mjs
5) Write sweep.md
6) Publish to reports channel

Failure policy: Blocker if any fetch fails; no partials.
