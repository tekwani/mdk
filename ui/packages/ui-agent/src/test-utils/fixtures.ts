/**
 * Recorded turns, replayed as the SSE the gateway actually sends.
 *
 * These are real turns captured off a running stack (gateway + MCP tools +
 * a local model), not hand-written approximations — which is why they carry the
 * awkward details a synthetic fixture would smooth over: `tool_result.text` is a
 * JSON string rather than prose, tokens arrive one word at a time, and `ts` on
 * the first few events is 0. Device names are the demo worker's own synthetic
 * ids.
 *
 * `ts` was normalised at capture time to milliseconds from the start of the
 * turn, so durations are stable across machines.
 */

import type { WireEvent } from '../core/events'

import decline from './fixtures/decline.json'
import errorMidturn from './fixtures/error-midturn.json'
import readCount from './fixtures/read-count.json'
import readList from './fixtures/read-list.json'
import readSummarize from './fixtures/read-summarize.json'
import toolContractViolation from './fixtures/tool-contract-violation.json'
import writeApproved from './fixtures/write-approved.json'
import writeRejected from './fixtures/write-rejected.json'

export type Fixture = {
  name: string
  prompt: string
  events: WireEvent[]
}

export const FIXTURES = {
  readCount,
  readList,
  readSummarize,
  writeApproved,
  writeRejected,
  decline,
  errorMidturn,
  toolContractViolation,
} as unknown as Record<string, Fixture>

export const ALL_FIXTURES: Fixture[] = Object.values(FIXTURES)

/** Frames a fixture exactly as `lib/sse.js` writes them. */
export function toSseText(events: WireEvent[]): string {
  return events.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join('')
}

/**
 * A readable stream of `chunks`, encoded as UTF-8.
 *
 * Chunk boundaries are the caller's choice on purpose: the parser has to cope
 * with a frame split across two network reads, which is the failure a
 * single-chunk fixture never exercises.
 */
export function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
}

export type ControllableStream = {
  stream: ReadableStream<Uint8Array>
  /** Deliver one event, as its own SSE frame. */
  push: (event: WireEvent) => void
  close: () => void
  /** End the stream with no terminal event, as a hijacked reply does on failure. */
  truncate: () => void
}

/**
 * A stream the test drives event by event, for asserting what the UI shows part
 * way through a turn — paused on an approval, mid-answer — rather than after it.
 */
export function controllableStream(): ControllableStream {
  let controller: ReadableStreamDefaultController<Uint8Array>
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(streamController) {
      controller = streamController
    },
  })

  return {
    stream,
    push: (event) => controller.enqueue(encoder.encode(toSseText([event]))),
    close: () => controller.close(),
    truncate: () => controller.close(),
  }
}

export function sseResponse(events: WireEvent[], chunkSize?: number): Response {
  const text = toSseText(events)
  const chunks
    = chunkSize === undefined
      ? [text]
      : (text.match(new RegExp(`[\\s\\S]{1,${chunkSize}}`, 'g')) ?? [text])
  return new Response(streamOf(chunks), {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

/** The gateway's error body on the streaming route: no `error` key, unlike every other route. */
export function streamErrorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ statusCode: status, message }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** The gateway's error body on the normal routes. */
export function jsonErrorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ statusCode: status, error: 'Error', message }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
