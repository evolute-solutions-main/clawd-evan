// appointmentsDailyReport.mjs
// Single canonical compute for one day of appointment activity (Zapier posts → collapsed KPIs).
// Input
//   - date (YYYY-MM-DD)
//   - tz (default: America/Bogota)
//   - Channels are hardcoded (Zapier):
//       UNCONFIRMED: 1387098677646196887
//       CONFIRMED:   1332578941407334430
// Output (Report object)
//   - date, window { startIso, endIso, tz }
//   - totals: { confirmed, unconfirmed, totalKeys }
//   - perSetter: [{ setter, confirmed, unconfirmed, total }]
//   - collapsedRows: [{ setter, phone|fallbackName, latestStatus, latestAddedTs, apptTimeText }]
//   - rawRows: original parsed rows (for audit)
//   - notes: [strings] anomalies/attribution notes
//   - renderMarkdown(): returns a deterministic Markdown with EXACT sections:
//       1) "## Summary totals" — Confirmed, Unconfirmed, Total unique
//       2) "## By setter" — one bullet per setter with Confirmed | Unconfirmed | Total
//       3) "## Collapsed counted view" — one bullet per collapsed row (latest same-day status)
//       4) "## Notes" (optional) — only if notes[] non-empty
//       5) "## Raw list (audit)" (optional when includeRaw=true) — every eligible Zapier row
// Behavior
//   - Strict day window: 00:00–23:59 America/Bogota
//   - Dual-channel fetch required by runner; setRawRows() will hard-fail on empty input
//   - Collapse by personKey = (setter||"Unknown", phone||normalizedName), keep latest by Added TS
//   - Sanity: collapsed ≤ raw (note if violated); Confirmed > Unconfirmed is atypical → note
//   - Unknown attribution counted (when Created by missing)

const TZ = 'America/Bogota';
const CHANNELS = {
  unconfirmed: '1387098677646196887',
  confirmed: '1332578941407334430'
};

function startEndIso(date, tz = TZ) {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59`);
  return { startIso: start.toISOString(), endIso: end.toISOString(), tz };
}

function normalizeRow(row) {
  return {
    id: String(row.id),
    addedTsUtc: row.addedTsUtc,
    channelType: row.channelType === 'confirmed' ? 'confirmed' : 'unconfirmed',
    setter: row.setter && row.setter.trim() ? row.setter.trim() : 'Unknown',
    name: row.name && row.name.trim() ? row.name.trim() : undefined,
    phone: row.phone && row.phone.trim() ? row.phone.trim() : undefined,
    apptTimeText: row.apptTimeText || undefined
  };
}

function personKey(setter, phone, name) {
  if (phone) return `${setter}||${phone}`;
  const fallback = (name || 'MISSING_NAME').replace(/\s+/g, ' ').toLowerCase();
  return `${setter}||name:${fallback}`;
}

function collapseRows(rawRows) {
  const byKey = new Map();
  for (const r0 of rawRows) {
    const r = normalizeRow(r0);
    const key = personKey(r.setter, r.phone, r.name);
    const prev = byKey.get(key);
    if (!prev || new Date(r.addedTsUtc) > new Date(prev.addedTsUtc)) {
      byKey.set(key, r);
    }
  }
  const collapsed = [];
  for (const [key, r] of byKey.entries()) {
    collapsed.push({
      personKey: key,
      setter: r.setter,
      phone: r.phone,
      fallbackName: r.phone ? undefined : (r.name || 'MISSING_NAME'),
      latestStatus: r.channelType === 'confirmed' ? 'Confirmed' : 'Unconfirmed',
      latestAddedTs: r.addedTsUtc,
      apptTimeText: r.apptTimeText
    });
  }
  return collapsed;
}

function aggregate(collapsed) {
  const perSetterMap = new Map();
  let confirmed = 0, unconfirmed = 0;
  for (const c of collapsed) {
    const s = c.setter || 'Unknown';
    const rec = perSetterMap.get(s) || { setter: s, confirmed: 0, unconfirmed: 0, total: 0 };
    if (c.latestStatus === 'Confirmed') { rec.confirmed++; confirmed++; }
    else { rec.unconfirmed++; unconfirmed++; }
    rec.total++;
    perSetterMap.set(s, rec);
  }
  const perSetter = Array.from(perSetterMap.values()).sort((a,b)=>a.setter.localeCompare(b.setter));
  return { totals: { confirmed, unconfirmed, totalKeys: collapsed.length }, perSetter };
}

function appointmentsDailyReport(date, { tz = TZ } = {}) {
  const window = startEndIso(date, tz);
  const report = {
    date, window,
    rawRows: [],
    collapsedRows: [],
    perSetter: [],
    totals: { confirmed: 0, unconfirmed: 0, totalKeys: 0 },
    notes: [],
    setRawRows(rows) {
      this.rawRows = Array.isArray(rows) ? rows : [];
      if (this.rawRows.length === 0) throw new Error('No raw rows provided for appointmentsDailyReport');
      const collapsed = collapseRows(this.rawRows);
      this.collapsedRows = collapsed.sort((a,b)=>new Date(b.latestAddedTs)-new Date(a.latestAddedTs));
      const agg = aggregate(this.collapsedRows);
      this.perSetter = agg.perSetter;
      this.totals = agg.totals;
      if (this.collapsedRows.length > this.rawRows.length) this.notes.push('Collapsed > raw anomaly');
      if (this.totals.confirmed > this.totals.unconfirmed) this.notes.push('Confirmed exceeds Unconfirmed (atypical) — verify window or source.');
      const unknownCount = this.collapsedRows.filter(r=>r.setter==='Unknown').length;
      if (unknownCount>0) this.notes.push(`${unknownCount} collapsed entries attributed to Unknown setter (missing Created by).`);
      return this;
    },
    renderMarkdown({ includeRaw = false } = {}) {
      const lines = [];
      lines.push(`# Appointment Setting — ${date} (Collapsed per SOP)`);
      lines.push('');
      lines.push('## Summary totals');
      lines.push(`- Confirmed: ${this.totals.confirmed}`);
      lines.push(`- Unconfirmed: ${this.totals.unconfirmed}`);
      lines.push(`- Total unique person_keys: ${this.totals.totalKeys}`);
      lines.push('');
      lines.push('## By setter');
      for (const s of this.perSetter) {
        lines.push(`- ${s.setter} — Confirmed: ${s.confirmed} | Unconfirmed: ${s.unconfirmed} | Total: ${s.total}`);
      }
      lines.push('');
      lines.push('## Collapsed counted view');
      for (const c of this.collapsedRows) {
        const who = c.phone || (c.fallbackName || 'MISSING_NAME');
        const appt = c.apptTimeText ? ` — ${c.apptTimeText}` : '';
        lines.push(`- ${c.latestStatus} — ${who}${appt} — ${c.setter} — ${new Date(c.latestAddedTs).toISOString()}`);
      }
      if (this.notes.length) {
        lines.push('');
        lines.push('## Notes');
        for (const n of this.notes) lines.push(`- ${n}`);
      }
      if (includeRaw) {
        lines.push('');
        lines.push('## Raw list (audit)');
        for (const r of this.rawRows) {
          const who = r.phone || (r.name || 'MISSING_NAME');
          lines.push(`- ${r.channelType} — ${who} — ${r.setter||'Unknown'} — ${r.addedTsUtc}`);
        }
      }
      return lines.join('\n');
    }
  };
  return report;
}

export { appointmentsDailyReport, CHANNELS, TZ };
