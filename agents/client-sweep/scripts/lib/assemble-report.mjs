/**
 * assemble-report.mjs
 *
 * Deterministic report assembler for the client-sweep pipeline.
 * Takes a sorted ClientState[] and produces sweep.md content.
 * No LLM involvement — pure formatting.
 */

/**
 * Render a single ClientState object to a markdown block.
 * Matches the format of existing sweep.md outputs.
 *
 * @param {object} cs  ClientState (validated)
 * @returns {string}
 */
export function renderClient(cs) {
  const lines = []

  lines.push(`## ${cs.clientName}`)
  lines.push(`- **Context (recent):**`)
  for (const bullet of cs.context) {
    lines.push(`  - ${bullet}`)
  }
  lines.push(`- **Status:** ${cs.status}`)
  lines.push(`- **Next:** ${cs.next}`)
  if (cs.teamChatter) lines.push(`- **Team chatter:** ${cs.teamChatter}`)
  if (cs.risk) lines.push(`- **Risk:** ${cs.risk}`)
  if (cs.needsManualReview) {
    const note = cs.reviewNote || 'Situation unclear after reading all messages.'
    lines.push(`- **⚠️ Manual review needed:** ${note}`)
  }

  return lines.join('\n')
}

/**
 * Assemble the full sweep.md from a sorted ClientState array.
 *
 * @param {object[]} clientStates  Sorted by urgencyScore ascending (0 = most urgent first)
 * @param {string}   date          YYYY-MM-DD
 * @param {object[]} [errors]      Optional array of { client, error } for failed clients
 * @returns {string}               Complete sweep.md content
 */
export function assembleReport(clientStates, date, errors = []) {
  const body = clientStates.map(renderClient).join('\n\n')

  let footer = ''
  if (errors.length > 0) {
    const lines = errors.map(e => `- **${e.client}:** ${e.error}`)
    footer = `\n\n---\n\n## ⚠️ Errors (${errors.length} client(s) not processed)\n${lines.join('\n')}\n`
  }

  return body + footer + '\n'
}
