// clientSweepDaily.mjs
// Single canonical compute for one day of Client Sweep (data-first, deterministic).
// If no date is passed, default = previous calendar day in America/Bogota.
// Hard-coded IDs per spec:
//   Guild: 1164939432722440282
//   Active Clients category: 1334610131647987742
//   Team chats: Davi 1459289532372357253, Bilal 1469019592302006426
//   Asana Client Hub: 1213220062504456
// Output: Report with clients[] and renderMarkdown() that emits SOP-conformant per-client blocks.

const TZ = process.env.GLOBAL_TZ || 'America/Bogota';
const DISCORD = {
  guildId: process.env.EVOLUTE_GUILD_ID || '1164939432722440282',
  categories: {
    activeClients: process.env.ACTIVE_CLIENTS_CATEGORY_ID || '1334610131647987742',
    onboardingInProgress: process.env.ONBOARDING_IN_PROGRESS_CATEGORY_ID || '1478798565810770104'
  },
  teamChats: { davi: '1459289532372357253', bilal: '1469019592302006426', markz: '1402266658592002139' }
};
const ASANA = { clientHubProjectGid: process.env.ASANA_CLIENT_HUB_PROJECT_GID || '1213220062504456' };

function prevDayIsoLocal(tz = TZ) {
  const now = new Date();
  // Take local midnight boundaries for yesterday (simple approach; runners handle tz-aware fetch)
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  const yyyy = y.getFullYear();
  const mm = String(y.getMonth() + 1).padStart(2, '0');
  const dd = String(y.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function startEndIso(date, tz = TZ) {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59`);
  return { startIso: start.toISOString(), endIso: end.toISOString(), tz };
}

function clientSweepDaily(date, { tz = TZ } = {}) {
  const day = date || prevDayIsoLocal(tz);
  const window = startEndIso(day, tz);

  const report = {
    date: day, window,
    discord: DISCORD, asana: ASANA,
    // clients: array of computed per-client data
    clients: [],
    notes: [],

    // Inject computed client blocks (runner populates this after fetching Discord/Asana)
    setClients(clientsArray) {
      // Each client: { name, context:[], status, suggestedNext, criteria?:[], chatter?:[], blockers?:[], escalation?:boolean }
      if (!Array.isArray(clientsArray) || clientsArray.length === 0) {
        throw new Error('clientSweepDaily.setClients: received empty clients array');
      }
      // Minimal field validation
      const required = ['name', 'status'];
      const bad = [];
      for (const c of clientsArray) {
        for (const k of required) if (!c || !c[k]) bad.push(c);
      }
      if (bad.length) throw new Error(`clientSweepDaily.setClients: missing required fields on ${bad.length} client(s)`);
      this.clients = clientsArray;
      // Sort by SOP order: Needs response → Onboarding in progress → Needs follow-up → Stable
      const order = new Map([
        ['Needs response', 0],
        ['Onboarding in progress', 1],
        ['Needs follow-up', 2],
        ['Stable', 3]
      ]);
      this.clients.sort((a,b)=>{
        const ao = order.has(a.status) ? order.get(a.status) : 99;
        const bo = order.has(b.status) ? order.get(b.status) : 99;
        if (ao !== bo) return ao - bo;
        return (a.name||'').localeCompare(b.name||'');
      });
      return this;
    },

    renderMarkdown() {
      const lines = [];
      lines.push(`# Client Sweep — ${this.date}`);
      lines.push('');
      lines.push('Sorted top → bottom (highest urgency → lowest)');
      lines.push('');
      for (const c of this.clients) {
        lines.push(`## ${c.name}`);
        // Context
        lines.push('- **Context (recent):**');
        if (c.context && c.context.length) {
          for (const b of c.context) lines.push(`  - ${b}`);
        } else {
          lines.push('  - (none observed in window)');
        }
        // Status
        lines.push(`- **Status:** ${c.status}`);
        // Suggested next action
        lines.push(`- **Suggested next action:** ${c.suggestedNext || '(none)'}`);
        // Successful response criteria (only when Needs response)
        if (c.status === 'Needs response' && c.criteria && c.criteria.length) {
          lines.push('- **Successful response criteria:**');
          for (const r of c.criteria) lines.push(`  - ${r}`);
        }
        // External team chatter (Discord)
        if (c.chatter && c.chatter.length) {
          lines.push('- **External team chatter (Discord):**');
          for (const ch of c.chatter) {
            // Expect { channel, who, date, link }
            const seg = [ch.channel, ch.who, ch.date, ch.link].filter(Boolean).join(' • ');
            lines.push(`  - ${seg}`);
          }
        }
        // Asana blockers
        if (c.blockers && c.blockers.length) {
          lines.push('- **Asana blockers:**');
          for (const bk of c.blockers) {
            // Expect { task, assignee, due, status, link }
            const seg = [bk.task, `→ ${bk.assignee||'Unassigned'}`, bk.due ? `• ${bk.due}` : '', bk.status ? `• ${bk.status}` : '', bk.link ? `• ${bk.link}` : '']
              .filter(Boolean).join(' ');
            lines.push(`  - ${seg}`);
          }
        }
        // Escalation note
        if (c.escalation) lines.push('- Call their cell phone (3+ outbound with no client reply).');
        lines.push('');
      }
      if (this.notes.length) {
        lines.push('---');
        lines.push('Notes:');
        for (const n of this.notes) lines.push(`- ${n}`);
      }
      return lines.join('\n');
    }
  };

  return report;
}

export { clientSweepDaily, DISCORD, ASANA, TZ };
