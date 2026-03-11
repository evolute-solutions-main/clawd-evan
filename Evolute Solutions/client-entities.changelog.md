# Client Entities — Changelog

This file logs every change made to `client-entities.json`.

## Format
- Timestamp (America/Bogota)
- Client id(s)
- Change summary (before → after)
- Why (evidence: Discord message id / Asana task gid / manual instruction)
- Confidence (high|med|low)

---

## 2026-02-23
- Clients: all
- Change: created initial `client-entities.json` seeded from `active-clients.md` (Discord channel IDs only)
- Why: establish canonical client entity database as source of truth
- Evidence: setup work in this repo; Discord mapping file
- Confidence: high

- Clients: 16/18
- Change: mapped `asana.clientHubTaskGid` by matching business names to tasks in Asana project `Client Hub 3.0` (`1213220062504456`)
- Why: enable permanent Asana comment syncing per client entity log
- Evidence: Asana API read of project tasks; mapper script `Evolute Solutions/asana_clienthub_mapper.py`
- Confidence: high (name-based matching; 2 clients unmatched because no obvious task found)

- Clients: all
- Change: added `clientHub` mirror fields + per-client `logs[]` container to make each client entity self-contained and ready for ongoing sync
- Why: client entity should hold both (a) action log and (b) latest Client Hub field state
- Evidence: schema update + JSON migration in repo
- Confidence: high
