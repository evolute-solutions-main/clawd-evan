# Client Sweep

## Active pipeline

Entry: `scripts/run-pipeline.mjs`

Architecture (deterministic + LLM interpretation):
1. [Code] Enumerate client channels from Discord categories (Active + Onboarding)
2. [Code] Fetch last 7 days of messages per client channel + team chat mentions
3. [Code] Save raw message snapshots to `outputs/YYYY-MM-DD/raw/` for audit
4. [LLM]  Analyze each client → structured ClientState JSON (validated against schema)
5. [Code] Sort by urgency, assemble sweep.md
6. [Code] Publish to Notion

Output: narrative per-client blocks (no enums/buckets), consistent format.

```
node scripts/run-pipeline.mjs [--dry-run] [--skip-notion] [--client <name>]
```

Env overrides: `SWEEP_WINDOW_DAYS` (default 7), `SWEEP_CONCURRENCY` (default 4), `SWEEP_MODEL` (default gpt-4o).

## Deprecated pipeline

`scripts/run-loop.mjs` — the old gateway-backed LLM orchestrator. Kept for rollback comparison only. Do not extend.
