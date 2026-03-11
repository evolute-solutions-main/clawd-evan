# INDEX.md — Workspace Command Map (Daily Reports + SOPs)

This index maps the three independent daily outputs and their single sources of truth (SOPs, templates, maps). No master “boot‑up” orchestration — each runs as a separate job.

## Daily Outputs (independent jobs)
- Client Sweep → Evolute Solutions/client-sweep-procedure.md, Evolute Solutions/client-sweep-output-template.md, Evolute Solutions/active-clients.md
- Appointment Setting → sops/appointments-kpi-sop.md, sops/appointment-setting-daily-report.md
- Employee Breakdowns → sops/employee-breakdown.md, sops/davi-breakdown-sop.md, sops/bilal-breakdown-sop.md

## Implementation Notes
- Client Sweep canonical compute: workflows/clients/clientSweepDaily.mjs (renders SOP-conformant per‑client blocks)
- Appointments: see sops/appointments-kpi-sop.md for logic and sops/appointment-setting-daily-report.md for output format
- Employees (Davi/Bilal): sops/employee-breakdown.md shared structure + person‑specific SOPs

## Maps (IDs / routing)
- Asana projects: Evolute Solutions/asana-map.md
- Discord categories/channels: Evolute Solutions/discord-map.md
- Active clients list/IDs: Evolute Solutions/active-clients.md

## Run Commands (what you can ask Evan)
- "Run a client sweep for [date or window]"
- "Appointment setter report for [yesterday/today]"
- "Davi breakdown for [YYYY‑MM‑DD]" / "Bilal breakdown for [YYYY‑MM‑DD]"

## Notes
- DRY: master docs should reference SOPs instead of duplicating steps.
- If you add/change a process, update the SOP and then update this INDEX.md with the new path.
