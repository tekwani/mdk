/**
 * SSE reading for the agent message route.
 *
 * `EventSource` is unusable here: the message is a POST body and `EventSource`
 * is GET-only. So this is `fetch` + a body-stream reader, which is also what the
 * producer's own docs prescribe.
 *
 * The gateway writes `event: <type>\ndata: <json>\n\n` and nothing else — no
 * `id:`, no `retry:`, and no heartbeat comment frames. The `event:` line is
 * redundant (`data.type` carries the same value) so only `data:` is parsed. The
 * rest of the parser is nonetheless written against the spec rather than against
 * that one producer: CRLF line endings and multi-line `data:` are both legal, and
 * a proxy that rewrites line endings would otherwise silently end every turn as a
 * truncation.
 */

import type { WireEvent } from './events'
import { EVENT, isTerminal, isWireEvent } from './events'

/** A blank line ends a frame; either line ending is legal (spec §7). */
const FRAME_SEPARATOR = /\r?\n\r?\n/
const LINE_SEPARATOR = /\r?\n/
const DATA_PREFIX = 'data:'

/** Synthesized locally, never sent by the gateway. See `readAgentStream`. */
export const ERR_STREAM_TRUNCATED = 'ERR_AGENT_STREAM_TRUNCATED'
/** Synthesized locally: the socket stayed open but nothing arrived. See `readAgentStream`. */
export const ERR_STREAM_IDLE = 'ERR_AGENT_STREAM_IDLE'

/**
 * How long a turn may say nothing between events before the connection is
 * assumed lost.
 *
 * The gateway sends no heartbeats, so silence is the only symptom of a wedged
 * agent, a half-closed proxy or a laptop resumed from sleep. Once events are
 * flowing, 30s of nothing is already far outside what a working turn does: the
 * producer emits a frame per token.
 */
export const STREAM_IDLE_TIMEOUT_MS = 30_000

/**
 * The same limit before the first event, which is a different wait entirely.
 *
 * Nothing is emitted until the producer's first model call returns a routing
 * decision, and a local model may think for a long time before it answers a
 * single character: measured against a 4B thinking model on this hardware, the
 * first event arrived at 61s. Held to the producer's own per-call budget
 * (`REQUEST_TIMEOUT_MS`, 120s in backend/core/agent/src/constants.js) so a turn
 * the server is still legitimately working on is never abandoned here first —
 * whatever the model does, the server gives up before this does and says why.
 */
export const FIRST_EVENT_IDLE_TIMEOUT_MS = 120_000

/**
 * The same limit while an approval is outstanding, where silence is legitimate:
 * the producer is waiting on a human, and only auto-rejects after its own
 * `agent.approvalTimeoutMs`. Five minutes is that default plus room to spare, so
 * the stream is never given up on before the server itself would have resumed it.
 */
export const APPROVAL_IDLE_TIMEOUT_MS = 300_000

/** Thrown out of `readFrames` when the deadline expires; converted to an event above. */
export class StreamIdleError extends Error {
  constructor() {
    super(ERR_STREAM_IDLE)
    this.name = 'StreamIdleError'
  }
}

export type ReadFramesOptions = {
  /**
   * Milliseconds of silence tolerated before the next read is given up on, read
   * fresh before every read so the caller can widen it mid-stream. `0` disables
   * the deadline.
   */
  idleTimeoutMs?: () => number
}

/**
 * Pulls the `data:` payload out of one frame.
 *
 * A frame may carry several `data:` lines, which the spec joins with newlines;
 * anything else (`event:`, `id:`, a `:` comment) is ignored. Returns null for a
 * frame with no data at all.
 */
export function parseFrame(frame: string): unknown {
  const data = frame
    .split(LINE_SEPARATOR)
    .filter((line) => line.startsWith(DATA_PREFIX))
    .map((line) => line.slice(DATA_PREFIX.length).trim())

  if (data.length === 0) return null

  try {
    return JSON.parse(data.join('\n'))
  } catch {
    // A frame we cannot parse is indistinguishable from an event type we do not
    // know about, and invariant 5 says ignore those rather than throw.
    return null
  }
}

const IDLE = Symbol('idle')

/**
 * One `read()`, given up on after `timeoutMs` of silence.
 *
 * The abandoned read is left attached to a rejection handler on purpose: the
 * caller's `finally` cancels the reader straight after, and an unobserved
 * rejection from a read parked on a socket we just cancelled would surface as a
 * global unhandled rejection.
 */
async function readWithDeadline(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs: number,
): Promise<ReadableStreamReadResult<Uint8Array> | typeof IDLE> {
  const read = reader.read()
  if (timeoutMs <= 0) return read
  read.catch(() => {})

  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      read,
      new Promise<typeof IDLE>((resolve) => {
        timer = setTimeout(() => resolve(IDLE), timeoutMs)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Yields each decoded `data:` payload, in order, as frames arrive.
 *
 * The abort signal is handled here rather than left to `fetch`. Aborting a fetch
 * whose headers have already arrived is only specified to error the body stream
 * — cancelling the reader is what actually unblocks a `read()` that is parked
 * waiting for the next token, which is where an abort almost always lands.
 */
export async function* readFrames(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
  options: ReadFramesOptions = {},
): AsyncGenerator<unknown> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const cancel = () => {
    reader.cancel().catch(() => {
      // Already closed or errored; there is nothing left to release.
    })
  }

  if (signal?.aborted) cancel()
  signal?.addEventListener('abort', cancel, { once: true })

  const drain = function* (): Generator<unknown> {
    for (;;) {
      const match = FRAME_SEPARATOR.exec(buffer)
      if (!match) return
      const frame = buffer.slice(0, match.index)
      buffer = buffer.slice(match.index + match[0].length)
      const payload = parseFrame(frame)
      if (payload !== null) yield payload
    }
  }

  try {
    for (;;) {
      const outcome = await readWithDeadline(reader, options.idleTimeoutMs?.() ?? 0)
      if (outcome === IDLE) throw new StreamIdleError()

      const { value, done } = outcome
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      yield* drain()
    }

    // Flush whatever the decoder was holding from an incomplete multibyte
    // sequence, then the final frame if it arrived without its blank line.
    buffer += decoder.decode()
    yield* drain()
    const tail = parseFrame(buffer)
    if (tail !== null) yield tail
  } finally {
    signal?.removeEventListener('abort', cancel)
    cancel()
  }
}

export type ReadAgentStreamOptions = {
  /** Silence tolerated between events. Defaults to {@link STREAM_IDLE_TIMEOUT_MS}; `0` disables it. */
  idleTimeoutMs?: number
  /** Silence tolerated while an approval is outstanding. Defaults to {@link APPROVAL_IDLE_TIMEOUT_MS}. */
  approvalIdleTimeoutMs?: number
  /** Silence tolerated before the first event. Defaults to {@link FIRST_EVENT_IDLE_TIMEOUT_MS}. */
  firstEventIdleTimeoutMs?: number
}

/**
 * Turns a live response into the guaranteed-well-formed event sequence the rest
 * of the package is written against. Four contract obligations live here:
 *
 * 1. Unknown or malformed events are dropped, not thrown on (invariant 5).
 * 2. Nothing is emitted after the terminal event (invariant 1), so a
 *    misbehaving producer cannot reopen a finished turn.
 * 3. Every stream ends with exactly one terminal event. The gateway's stream
 *    route calls `rep.hijack()`, so a failure after the headers are sent just
 *    closes the socket — no `error` frame, no `done`. Left alone that reads as a
 *    turn that never finishes, so an EOF with no terminal event is converted
 *    into one here. An abort is excluded: the operator stopping the turn is not
 *    a failure, and nothing should be reported back to them as one.
 * 4. A socket that stays open but stops delivering ends the same way. Without
 *    that, a consumer awaiting the next event parks forever and the panel stays
 *    busy until the page is reloaded. The deadline is per phase, because how much
 *    silence is normal is not constant across a turn: wide before the first event
 *    (the model is still thinking), wide again while an approval is outstanding
 *    (the producer is waiting on a human), narrow in between.
 */
export async function* readAgentStream(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
  options: ReadAgentStreamOptions = {},
): AsyncGenerator<WireEvent> {
  const streamingTimeout = options.idleTimeoutMs ?? STREAM_IDLE_TIMEOUT_MS
  const approvalTimeout = options.approvalIdleTimeoutMs ?? APPROVAL_IDLE_TIMEOUT_MS
  const firstEventTimeout = options.firstEventIdleTimeoutMs ?? FIRST_EVENT_IDLE_TIMEOUT_MS

  let terminalSeen = false
  let awaitingApproval = false
  let seenAnyEvent = false
  let idle = false

  const idleTimeoutMs = () => {
    if (streamingTimeout <= 0) return 0
    if (awaitingApproval) return approvalTimeout
    if (!seenAnyEvent) return firstEventTimeout
    return streamingTimeout
  }

  try {
    for await (const payload of readFrames(stream, signal, { idleTimeoutMs })) {
      if (!isWireEvent(payload)) continue
      if (terminalSeen) continue
      seenAnyEvent = true
      // An approval pauses the producer; its result is what releases it.
      if (payload.type === EVENT.PENDING_APPROVAL) awaitingApproval = true
      if (payload.type === EVENT.TOOL_RESULT) awaitingApproval = false
      if (isTerminal(payload)) terminalSeen = true
      yield payload
    }
  } catch (error) {
    if (!(error instanceof StreamIdleError)) throw error
    idle = true
  }

  if (!terminalSeen && !signal?.aborted) {
    yield {
      type: EVENT.ERROR,
      error: idle ? ERR_STREAM_IDLE : ERR_STREAM_TRUNCATED,
      turnId: '',
      seq: Number.MAX_SAFE_INTEGER,
      ts: 0,
    }
  }
}
