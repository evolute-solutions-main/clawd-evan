/**
 * Determines if a Fathom call is a sales call
 * 
 * Returns: true | false | "not_sure"
 * 
 * Logic:
 * 1. Title contains "AI Growth Game Plan" or "AI Strategy" → TRUE
 * 2. Participants include team members → FALSE
 * 3. Otherwise (including "Impromptu Google Meet", "Meet with Max") → LLM analysis
 */

// Team members to exclude (calls with these people are not sales calls)
const TEAM_MEMBERS = [
  'davi', 'bilal', 'eddie', 'daniel', 'richard', 'randy',
  'davi_dinicio', 'bilal', 'eddie murillo', 'daniel franco', 'richard ramilo', 'randy'
].map(n => n.toLowerCase())

// Definite sales call title patterns
const SALES_PATTERNS = [
  /ai\s*(growth\s*)?game\s*plan/i,
  /ai\s*strategy/i
]

// Patterns that need transcript analysis (not automatic false)
const UNCERTAIN_PATTERNS = [
  /impromptu\s*google\s*meet/i,
  /meet\s*with\s*max/i
]

/**
 * Check if title matches sales patterns
 */
function titleIsSales(title) {
  if (!title) return false
  return SALES_PATTERNS.some(p => p.test(title))
}

/**
 * Check if any participant is a team member
 */
function hasTeamMember(participants) {
  if (!participants || !Array.isArray(participants)) return false
  return participants.some(p => {
    const name = (p.display_name || p.name || p.email || '').toLowerCase()
    return TEAM_MEMBERS.some(tm => name.includes(tm))
  })
}

/**
 * Check if title contains a team member name
 */
function titleHasTeamMember(title) {
  if (!title) return false
  const lowerTitle = title.toLowerCase()
  return TEAM_MEMBERS.some(tm => lowerTitle.includes(tm))
}

/**
 * Use LLM to analyze transcript for sales indicators
 */
async function analyzeTranscript(transcript, title) {
  if (!transcript || transcript.length === 0) {
    return 'not_sure'
  }

  // Format transcript for analysis (limit to first ~4000 chars to save tokens)
  const formatted = transcript
    .slice(0, 50) // First 50 entries
    .map(t => `${t.speaker?.display_name || 'Unknown'}: ${t.text}`)
    .join('\n')
    .slice(0, 4000)

  const prompt = `Analyze this call transcript and determine if this is a SALES CALL (Max pitching services to a new prospect and trying to close a deal).

Title: ${title || 'Unknown'}

Transcript excerpt:
${formatted}

Sales call indicators:
- Max asking about their business/pain points
- Discussion of pricing, packages, or services offered
- Closing language (signing up, getting started, payment)
- Prospect asking about how the service works

NOT a sales call if:
- Internal team meeting
- Existing client check-in
- Training or onboarding call
- Casual conversation

Respond with ONLY one of: TRUE, FALSE, or NOT_SURE`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 10,
        temperature: 0
      })
    })

    if (!response.ok) {
      console.error('LLM API error:', response.status)
      return 'not_sure'
    }

    const data = await response.json()
    const answer = (data.choices?.[0]?.message?.content || '').trim().toUpperCase()

    if (answer === 'TRUE') return true
    if (answer === 'FALSE') return false
    return 'not_sure'
  } catch (err) {
    console.error('LLM analysis error:', err.message)
    return 'not_sure'
  }
}

/**
 * Main function: Is this Fathom call a sales call?
 * 
 * @param {Object} call - Fathom call object
 * @param {string} call.title - Call title
 * @param {Array} call.participants - Array of participant objects
 * @param {Array} call.transcript - Array of transcript entries
 * @returns {Promise<true|false|'not_sure'>}
 */
export async function isSalesCall(call) {
  const title = call.title || call.meeting_title || ''
  const participants = call.participants || []
  const transcript = call.transcript || []

  // 1. Check title for definite sales patterns
  if (titleIsSales(title)) {
    return true
  }

  // 2. Check if title contains team member name (e.g., "Bilal", "Davi")
  if (titleHasTeamMember(title)) {
    return false
  }

  // 3. Check if any participant is a team member
  if (hasTeamMember(participants)) {
    return false
  }

  // 4. For uncertain cases, analyze transcript
  return await analyzeTranscript(transcript, title)
}

export { TEAM_MEMBERS, SALES_PATTERNS }
