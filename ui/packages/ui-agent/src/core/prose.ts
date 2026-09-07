/**
 * Detects a tool call that leaked into the answer.
 *
 * The agent loop is prompt-based, not native function calling: the model is told
 * to reply with only `{"tool": "<name>", "args": { ... }}`, and
 * `backend/core/agent/src/loop.js` decides prose-vs-tool-call from the first
 * non-whitespace character being `{`. A model that wraps its JSON in a ```json
 * fence therefore leads with a backtick, is classified as prose, and the raw
 * tool call is streamed to the operator as if it were the answer. Measured at
 * roughly one read in eight against `gemma3:4b` — common enough to handle.
 *
 * Rendering that verbatim is the single most confusing failure mode in the
 * stack, so it is detected and labelled instead.
 */

const FENCE = /^```[a-z]*\s*|\n?```$/gi

/**
 * The first balanced JSON object in `text`, string-aware so a brace inside a
 * string literal does not close it. Mirrors `extractJsonObject` in the producer.
 */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < text.length; index += 1) {
    const char = text[index]
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) return text.slice(start, index + 1)
    }
  }
  return null
}

export type LeakedToolCall = { tool: string, args: Record<string, unknown> }

/**
 * Returns the leaked call when `text` is nothing but a tool call, else null.
 *
 * Deliberately strict: the JSON must be the whole message once code fences are
 * stripped. A genuine answer that merely quotes some JSON keeps rendering as
 * prose.
 */
export function parseLeakedToolCall(text: string): LeakedToolCall | null {
  const stripped = text.trim().replace(FENCE, '').trim()
  if (!stripped.startsWith('{')) return null

  const raw = extractJsonObject(stripped)
  if (raw === null || raw !== stripped) return null

  try {
    const parsed = JSON.parse(raw) as { tool?: unknown, args?: unknown }
    if (typeof parsed.tool !== 'string') return null
    const args
      = typeof parsed.args === 'object' && parsed.args !== null
        ? (parsed.args as Record<string, unknown>)
        : {}
    return { tool: parsed.tool, args }
  } catch {
    return null
  }
}
