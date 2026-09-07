/**
 * Operator-readable text for the failures a turn can end on.
 *
 * `reduceTurn` stores whatever the `error` event carried, which is a bare code
 * like `ERR_AGENT_STREAM_TRUNCATED` — useful in a bug report, meaningless in a
 * transcript. The raw code stays on the message; this is applied at render time,
 * so the stored history keeps the diagnosable value.
 */

import { ERR_STREAM_IDLE, ERR_STREAM_TRUNCATED } from './sse'
import { AGENT_ERROR } from './transport'

/** Shown when a turn dies before the gateway said anything useful. */
export const GENERIC_TURN_ERROR = 'The agent could not complete that request.'

const TEXT_FOR_CODE: Record<string, string> = {
  [AGENT_ERROR.UNAVAILABLE]: 'The agent is not configured on this gateway.',
  [AGENT_ERROR.TURN_ACTIVE]: 'A turn is already running in this conversation.',
  [AGENT_ERROR.TEXT_REQUIRED]: 'Type a message first.',
  [AGENT_ERROR.SESSION_NOT_FOUND]: 'That conversation is no longer open on the gateway.',
  [ERR_STREAM_TRUNCATED]: 'The connection to the agent ended before the answer finished.',
  [ERR_STREAM_IDLE]: 'The agent stopped responding, so the connection was assumed lost.',
}

/**
 * Maps a code to a sentence, passing anything that is not one through unchanged.
 *
 * The producer's codes are all `ERR_*`, so a value in that shape that is not in
 * the table is a code this release has never seen — it becomes the generic
 * sentence rather than being shown verbatim. Anything else is already prose.
 */
export function describeAgentError(error: string | null | undefined): string | null {
  if (!error) return null
  if (TEXT_FOR_CODE[error]) return TEXT_FOR_CODE[error]
  return error.startsWith('ERR_') ? GENERIC_TURN_ERROR : error
}
