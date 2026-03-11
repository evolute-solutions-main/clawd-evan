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
