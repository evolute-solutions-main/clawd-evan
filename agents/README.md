# Agents Layout

This folder hosts isolated specialists plus shared templates.

- _shared/
  - isolated-specialist.prompt.md — base rules for all specialists
  - preflight.template.md — checklist to embed/execute before work
- sales-tracker/
  - SOP.md — exact steps to produce daily sales rollup
  - manifest.json — inputs/outputs/publish
  - templates/
- client-sweep/
  - SOP.md — daily client sweep steps
  - manifest.json — inputs/outputs/publish
- appointments/
  - SOP.md — daily appointments report steps
  - manifest.json — inputs/outputs/publish
- personal-admin/
  - SOP.md — morning plan
  - manifest.json — draft-only by default

Conventions
- Each specialist is stateless; durable knowledge lives in SOPs and manifests.
- All write to deterministic output paths. Re-runs overwrite for the same date.
- Fail fast on missing connections (see CONNECTIONS.md).

---

# Client Sweep Ops (One‑Page)

## Purpose
Generate a daily sweep for **all clients** by reading the **live Discord roster**.

## Canonical Inclusion Rule (Dynamic)
The client sweep list is the **union** of:
- **ACTIVE CLIENTS** category
- **ONBOARDING‑IN‑PROGRESS** category

**Never** use cached lists or hardcoded names. The live Discord channel roster is the source of truth.

## Required Access
The bot must be able to **see** all channels under both categories. If any category resolves to 0 channels, output:
> "no access to this channel, please update this"

## Error Handling
- If category visibility is missing or 0 channels are returned, emit the warning above and halt the sweep.
- Do **not** attempt a partial sweep if access is incomplete.

## Implementation Notes
- Client list is built at runtime from Discord categories (Active + Onboarding).
- `tasks.json` is deprecated; do not generate or read it.
- Per‑client analysis uses the trained summarize() logic (signals + precedence).
