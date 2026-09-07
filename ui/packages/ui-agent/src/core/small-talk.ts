/**
 * Was an operator message conversation rather than a question about the fleet?
 *
 * This exists for one caller: whether an answer is worth marking as having used no tools. The
 * marker is there to catch an answer that should have consulted the fleet and did not — and
 * against a greeting, a thank-you, or "what can you do", calling nothing was the right move, so
 * every one of those was carrying a warning about a failure that had not happened.
 *
 * Deliberately asymmetric. All three gates below must agree before a message counts as small
 * talk, and any fleet word vetoes it outright, because the two mistakes are not equal: missing a
 * greeting costs one redundant marker, while reading a fleet question as small talk hides exactly
 * the warning the marker exists to give.
 */

/** Openers where the greeting *is* the message — nothing is being asked of the fleet. */
const CONVERSATIONAL = [
  /^(?:hi|hey|hello|yo|hiya|howdy|greetings|good (?:morning|afternoon|evening|day))\b/,
  /^(?:how are you|how's it going|what's up|sup)\b/,
  /^(?:thanks|thank you|thx|ty|cheers|nice|great|cool|awesome|perfect|got it|ok|okay|sure|sorry|never mind|nvm)\b/,
  /^(?:bye|goodbye|see you|see ya|later)\b/,
  /^(?:who are you|what are you|what can you do|what do you do|can you help|help)\b/,
]

/**
 * Words that make a message about the fleet however it opens, so "hey, list the miners" is not
 * small talk. Kept to unambiguous terms: "up" and "down" are fleet state but also "what's up".
 */
const FLEET_TERMS
  = /\b(?:device|devices|miner|miners|asic|asics|rig|rigs|worker|workers|site|container|containers|pool|pools|sensor|sensors|powermeter|powermeters|power meter|hashrate|hash rate|temperature|telemetry|fleet|rank|reboot|restart|offline|online|status|list|show|count)\b/

/** Past this, a message is doing more than saying hello, whatever it opened with. */
const MAX_WORDS = 6

export function isSmallTalk(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .replaceAll('’', '\'') // a typographic apostrophe still spells "what's"
    .trim()

  if (normalized.length === 0) return false
  if (FLEET_TERMS.test(normalized)) return false
  if (normalized.split(/\s+/).length > MAX_WORDS) return false

  return CONVERSATIONAL.some((pattern) => pattern.test(normalized))
}
