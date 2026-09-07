import { describe, expect, it, vi } from 'vitest'

import type { WireEvent } from './events'
import {
  ALL_FIXTURES,
  controllableStream,
  FIXTURES,
  streamOf,
  toSseText,
} from '../test-utils/fixtures'
import { EVENT, isTerminal } from './events'
import { ERR_STREAM_IDLE, ERR_STREAM_TRUNCATED, parseFrame, readAgentStream, readFrames } from './sse'

async function collect(stream: ReadableStream<Uint8Array>): Promise<WireEvent[]> {
  const events: WireEvent[] = []
  for await (const event of readAgentStream(stream)) events.push(event)
  return events
}

describe('parseFrame', () => {
  it('reads the data line and ignores the redundant event line', () => {
    expect(parseFrame('event: token\ndata: {"type":"token","text":"hi"}')).toEqual({
      type: 'token',
      text: 'hi',
    })
  })

  it('returns null for a frame with no data line', () => {
    expect(parseFrame(': keepalive')).toBeNull()
  })

  it('returns null rather than throwing on unparseable JSON', () => {
    expect(parseFrame('data: {not json')).toBeNull()
  })

  it('reads a frame written with CRLF line endings', () => {
    // Legal per the spec, and what a proxy that normalises line endings produces.
    expect(parseFrame('event: token\r\ndata: {"type":"token","text":"hi"}')).toEqual({
      type: 'token',
      text: 'hi',
    })
  })

  it('joins a payload split across several data lines', () => {
    // Also legal: the spec concatenates the data lines with newlines.
    expect(parseFrame('data: {"type":"token",\ndata: "text":"hi"}')).toEqual({
      type: 'token',
      text: 'hi',
    })
  })
})

describe('readFrames', () => {
  it('reassembles a frame split across chunk boundaries', async () => {
    const text = toSseText(FIXTURES.readCount!.events)
    const half = Math.floor(text.length / 2)
    const payloads: unknown[] = []
    for await (const payload of readFrames(streamOf([text.slice(0, half), text.slice(half)]))) {
      payloads.push(payload)
    }
    expect(payloads).toHaveLength(FIXTURES.readCount!.events.length)
  })

  it('yields a final frame that arrived without its trailing blank line', async () => {
    const payloads: unknown[] = []
    for await (const payload of readFrames(streamOf(['data: {"type":"done"}']))) {
      payloads.push(payload)
    }
    expect(payloads).toEqual([{ type: 'done' }])
  })

  it('separates frames written with CRLF', async () => {
    const text
      = 'data: {"type":"token","text":"a"}\r\n\r\n'
        + 'data: {"type":"done"}\r\n\r\n'
    const payloads: unknown[] = []
    for await (const payload of readFrames(streamOf([text]))) payloads.push(payload)

    expect(payloads).toEqual([{ type: 'token', text: 'a' }, { type: 'done' }])
  })

  it('separates frames when the CRLF pair straddles a chunk boundary', async () => {
    const payloads: unknown[] = []
    const chunks = ['data: {"type":"token","text":"a"}\r', '\n\r\ndata: {"type":"done"}\n\n']
    for await (const payload of readFrames(streamOf(chunks))) payloads.push(payload)

    expect(payloads).toEqual([{ type: 'token', text: 'a' }, { type: 'done' }])
  })

  it('flushes a multibyte character split across the last two reads', async () => {
    // The decoder holds the incomplete sequence; without a final flush the bytes
    // are dropped and the frame fails to parse.
    const text = 'data: {"type":"token","text":"°C"}\n\n'
    const bytes = new TextEncoder().encode(text)
    const split = text.indexOf('°') + 1

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, split))
        controller.enqueue(bytes.slice(split))
        controller.close()
      },
    })

    const payloads: unknown[] = []
    for await (const payload of readFrames(stream)) payloads.push(payload)

    expect(payloads).toEqual([{ type: 'token', text: '°C' }])
  })
})

describe('readAgentStream — a connection that goes quiet', () => {
  it('ends the turn when nothing arrives inside the deadline', async () => {
    // The gateway sends no heartbeats, so a socket held open by a wedged agent or a
    // half-closed proxy looks exactly like a turn that is still thinking. Left
    // alone, the consumer parks forever and the panel stays busy until a reload.
    const live = controllableStream()
    const events: WireEvent[] = []
    const options = { idleTimeoutMs: 20, firstEventIdleTimeoutMs: 20 }

    for await (const event of readAgentStream(live.stream, undefined, options)) {
      events.push(event)
    }

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ type: EVENT.ERROR, error: ERR_STREAM_IDLE })
  })

  it('keeps waiting for the first event long after it would give up mid-stream', async () => {
    // The wait before the first event is the model routing, not a dead socket:
    // measured against a local 4B thinking model, the first event arrived at 61s,
    // twice the between-events deadline. Giving up there abandons a healthy turn.
    const live = controllableStream()
    const events: WireEvent[] = []

    const consume = (async () => {
      const options = { idleTimeoutMs: 20, firstEventIdleTimeoutMs: 5_000 }
      for await (const event of readAgentStream(live.stream, undefined, options)) {
        events.push(event)
      }
    })()

    // Well past the between-events deadline, still inside the first-event one.
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(events).toHaveLength(0)

    // And once it has spoken, the narrow deadline is the one that applies — so the
    // turn ends on the between-events limit rather than waiting out the first-event one.
    live.push({ type: EVENT.TOOL_CALL, name: 'count_devices', args: {}, turnId: 't', seq: 0, ts: 0 })
    await consume

    expect(events.map((event) => event.type)).toEqual([EVENT.TOOL_CALL, EVENT.ERROR])
    expect(events.at(-1)).toMatchObject({ error: ERR_STREAM_IDLE })
  })

  it('keeps waiting while an approval is outstanding', async () => {
    // Silence there is legitimate: the producer is parked on a human, and only
    // auto-rejects after its own approvalTimeoutMs.
    const live = controllableStream()
    const events: WireEvent[] = []

    const consume = (async () => {
      const options = { idleTimeoutMs: 20, approvalIdleTimeoutMs: 5_000 }
      for await (const event of readAgentStream(live.stream, undefined, options)) {
        events.push(event)
      }
    })()

    live.push({ type: EVENT.TOOL_CALL, name: 'act_device', args: {}, turnId: 't', seq: 0, ts: 0 })
    live.push({
      type: EVENT.PENDING_APPROVAL,
      name: 'act_device',
      args: {},
      approvalId: 'a1',
      turnId: 't',
      seq: 1,
      ts: 0,
    })
    await vi.waitFor(() => expect(events).toHaveLength(2))

    // Well past the streaming deadline, still inside the approval one.
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(events).toHaveLength(2)

    live.push({ type: EVENT.DONE, turnId: 't', seq: 2, ts: 0 })
    live.close()
    await consume

    expect(events.at(-1)?.type).toBe(EVENT.DONE)
  })

  it('takes 0 as no deadline at all', async () => {
    // The catalog's stand-in gateway and any host with its own supervision want the
    // parser to wait indefinitely rather than second-guess them.
    const live = controllableStream()
    const events: WireEvent[] = []

    const consume = (async () => {
      for await (const event of readAgentStream(live.stream, undefined, { idleTimeoutMs: 0 })) {
        events.push(event)
      }
    })()

    await new Promise((resolve) => setTimeout(resolve, 40))
    expect(events).toHaveLength(0)

    live.push({ type: EVENT.DONE, turnId: 't', seq: 0, ts: 0 })
    live.close()
    await consume

    expect(events.at(-1)?.type).toBe(EVENT.DONE)
  })
})

describe('readAgentStream — contract invariants', () => {
  it.each(ALL_FIXTURES.map((fixture) => [fixture.name, fixture] as const))(
    '%s ends with exactly one terminal event, and it is last',
    async (_name, fixture) => {
      const events = await collect(streamOf([toSseText(fixture.events)]))
      const terminals = events.filter((event) => isTerminal(event))

      expect(terminals).toHaveLength(1)
      expect(isTerminal(events.at(-1)!)).toBe(true)
    },
  )

  it.each(ALL_FIXTURES.map((fixture) => [fixture.name, fixture] as const))(
    '%s never emits a tool_result without a preceding tool_call of the same name',
    async (_name, fixture) => {
      const events = await collect(streamOf([toSseText(fixture.events)]))
      const called = new Set<string>()

      for (const event of events) {
        if (event.type === EVENT.TOOL_CALL) called.add(event.name)
        if (event.type === EVENT.TOOL_RESULT) expect(called.has(event.name)).toBe(true)
      }
    },
  )

  it('emits pending_approval only between a tool_call and its tool_result', async () => {
    const events = await collect(streamOf([toSseText(FIXTURES.writeApproved!.events)]))
    const types = events.map((event) => event.type)

    expect(types.indexOf(EVENT.TOOL_CALL)).toBeLessThan(types.indexOf(EVENT.PENDING_APPROVAL))
    expect(types.indexOf(EVENT.PENDING_APPROVAL)).toBeLessThan(types.indexOf(EVENT.TOOL_RESULT))
  })

  it('drops unknown event types instead of throwing (invariant 5)', async () => {
    const text
      = 'data: {"type":"telepathy","turnId":"t","seq":0,"ts":0}\n\n'
        + 'data: {"type":"done","turnId":"t","seq":1,"ts":1}\n\n'

    const events = await collect(streamOf([text]))
    expect(events.map((event) => event.type)).toEqual([EVENT.DONE])
  })

  it('drops anything after the terminal event', async () => {
    const text
      = 'data: {"type":"done","turnId":"t","seq":0,"ts":0}\n\n'
        + 'data: {"type":"token","text":"late","turnId":"t","seq":1,"ts":1}\n\n'

    const events = await collect(streamOf([text]))
    expect(events).toHaveLength(1)
  })

  it('synthesizes a terminal error when the socket closes with no terminal event', async () => {
    // The stream route hijacks the reply, so a failure after the headers are
    // sent closes the socket with no error frame and no done.
    const text = 'data: {"type":"token","text":"partial","turnId":"t","seq":0,"ts":0}\n\n'

    const events = await collect(streamOf([text]))
    expect(events.at(-1)).toMatchObject({ type: EVENT.ERROR, error: ERR_STREAM_TRUNCATED })
  })

  it('leaves a well-formed stream untouched', async () => {
    const events = await collect(streamOf([toSseText(FIXTURES.decline!.events)]))
    expect(events).toEqual(FIXTURES.decline!.events)
  })
})

describe('readAgentStream — abort', () => {
  it('stops a read parked waiting for the next token', async () => {
    // Aborting a fetch whose headers already arrived does not reliably unblock a
    // pending body read, which is exactly where an abort lands mid-answer.
    // Cancelling the reader is what ends it.
    const controller = new AbortController()
    const live = controllableStream()
    const events: WireEvent[] = []

    const consume = (async () => {
      for await (const event of readAgentStream(live.stream, controller.signal)) {
        events.push(event)
      }
    })()

    live.push({ type: EVENT.TOKEN, text: 'half', turnId: 't', seq: 0, ts: 0 })
    await vi.waitFor(() => expect(events).toHaveLength(1))

    controller.abort()
    await expect(consume).resolves.toBeUndefined()
  })

  it('does not synthesize a truncation error for an abort', () => {
    // The operator stopping a turn is not a failure and must not be reported as one.
    const controller = new AbortController()
    controller.abort()
    const live = controllableStream()

    return expect(collect2(live.stream, controller.signal)).resolves.toEqual([])
  })
})

async function collect2(
  stream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): Promise<WireEvent[]> {
  const events: WireEvent[] = []
  for await (const event of readAgentStream(stream, signal)) events.push(event)
  return events
}

describe('decline vs error', () => {
  it('a decline is tokens plus done, with no tool_call (invariant 4)', async () => {
    const events = await collect(streamOf([toSseText(FIXTURES.decline!.events)]))

    expect(events.some((event) => event.type === EVENT.TOOL_CALL)).toBe(false)
    expect(events.some((event) => event.type === EVENT.TOKEN)).toBe(true)
    expect(events.at(-1)?.type).toBe(EVENT.DONE)
  })

  it('an error turn is terminal on error, not done', async () => {
    const events = await collect(streamOf([toSseText(FIXTURES.errorMidturn!.events)]))
    expect(events.at(-1)?.type).toBe(EVENT.ERROR)
  })
})
