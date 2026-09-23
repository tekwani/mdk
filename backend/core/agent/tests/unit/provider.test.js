// The hosted provider's config contract. What it resolves to is not tested here — that needs a
// live endpoint and a paid key — but every way of misconfiguring it must fail at startup rather
// than at the operator's first question.

import test from 'brittle'
import { streamText } from 'ai'
import { MockLanguageModelV3, convertArrayToReadableStream } from 'ai/test'
import { resolveProvider, pacedFetch, RATE_LIMIT_ATTEMPTS, PROVIDER, QVAC_POLL_MS, QVAC_POLL_MAX_MS } from '../../src/provider.js'

async function rejection (fn) {
  try {
    await fn()
    return null
  } catch (err) {
    return err.message
  }
}

const TEST_KEY = 'sk-SEKRET-abc123'
const echoes = async () => new Response(
  JSON.stringify({ error: { message: `Incorrect API key provided: Bearer ${TEST_KEY}` } }),
  { status: 401, headers: { 'content-type': 'application/json' } }
)

const hosted = (over = {}) => ({
  kind: PROVIDER.OPENAI_COMPATIBLE,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
  apiKey: 'test-key',
  model: 'gpt-5.5',
  ...over
})

// Being rate limited is the endpoint answering — on a valid key, for a model it recognises,
// which is everything the startup probe exists to establish. Refusing to start would block on
// the one condition that resolves itself by waiting. The pacedFetch tests below never reach
// waitReady, so without this one the tolerance had no test at all.
test('a rate-limited endpoint is ready, not broken', async (t) => {
  let told = null
  const p = await resolveProvider(hosted({
    fetch: async () => new Response('{"error":{"message":"Quota exceeded"}}', { status: 429 })
  }))

  // Caught rather than awaited bare: a rejection here exits brittle 0 with no "not ok" line, so
  // the regression this test exists for would be invisible.
  let ms = null
  let threw = null
  try {
    ms = await p.waitReady({ onRateLimited: (why) => { told = why } })
  } catch (err) {
    threw = err
  }

  t.is(threw, null, 'a rate-limited endpoint did not block startup')
  t.ok(typeof ms === 'number', 'the probe resolved rather than throwing')
  t.ok(/quota|429|rate/i.test(told ?? ''), 'and said why it could not confirm more than that')
})

test('an unknown provider kind is refused by name', async (t) => {
  t.ok(/unknown provider kind: nope/.test(await rejection(() => resolveProvider({ kind: 'nope' }))))
})

// ── the qvac path ────────────────────────────────────────────────────────────
// Everything above needs no GPU because the hosted client is pure config. The qvac path was
// untested for the opposite reason: `createQvac` was a module-level import, so exercising it
// meant running a server. `deps.create` is that seam, and `deps.sleep` keeps the poll off the
// real clock — a backoff test that actually waited would take a minute.

const qvacCfg = (over = {}) => ({ kind: PROVIDER.QVAC, model: 'qwen3-4b', baseURL: 'http://127.0.0.1:11500/v1', ...over })

// One doStream call per poll attempt: each entry is either an error to throw or null for a
// clean generation, so a test writes the server's behaviour over time as a list.
const fakeQvac = (script) => {
  const calls = []
  const create = () => () => new MockLanguageModelV3({
    doStream: async () => {
      const step = script[Math.min(calls.length, script.length - 1)]
      calls.push(step)
      if (step) throw step
      return {
        stream: convertArrayToReadableStream([
          { type: 'text-start', id: '0' },
          { type: 'text-delta', id: '0', delta: 'ok' },
          { type: 'text-end', id: '0' },
          { type: 'finish', finishReason: { unified: 'stop' }, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } }
        ])
      }
    }
  })
  return { create, calls }
}

const notReady = () => new Error('model_not_ready: still loading weights')
const noSuchModel = () => new Error('unknown model "qwen3-4b"')

test('the qvac provider names the piece that is missing', async (t) => {
  t.ok(/needs a `model`/.test(await rejection(() => resolveProvider(qvacCfg({ model: undefined })))))
  t.ok(/external mode needs `baseURL`/.test(await rejection(() => resolveProvider(qvacCfg({ mode: 'external', baseURL: undefined })))))
  t.ok(/unknown qvac mode: sideways/.test(await rejection(() => resolveProvider(qvacCfg({ mode: 'sideways' })))))
})

test('qvac mode is inferred from whether a baseURL was given', async (t) => {
  const { create } = fakeQvac([null])
  const external = await resolveProvider(qvacCfg(), { create })
  t.is(external.mode, 'external', 'a baseURL means someone else runs the server')
  t.is(external.kind, PROVIDER.QVAC)
})

// The serve defaults are too small to run the agent — a 1024-token context truncates the charter
// before a question reaches it. That the spec overrides them is the whole reason managed mode is
// written out longhand rather than handed straight to the SDK.
test('managed mode spawns a server with a context big enough to be useful', async (t) => {
  let spawnedWith = null
  let closed = false
  const create = async (opts) => {
    spawnedWith = opts
    const handle = () => new MockLanguageModelV3({ doStream: async () => { throw notReady() } })
    handle.close = async () => { closed = true }
    return handle
  }

  const p = await resolveProvider({ kind: PROVIDER.QVAC, model: 'qwen3-4b' }, { create })

  t.is(p.mode, 'managed', 'no baseURL means we start the server ourselves')
  t.alike(spawnedWith.models, [{ name: 'qwen3-4b', config: { ctx_size: 16384, reasoning_budget: 0 } }], 'the serve defaults are overridden, not inherited')
  await p.close()
  t.ok(closed, 'and closing the provider stops the server it started')
})

test('caller config wins over the managed defaults', async (t) => {
  let spawnedWith = null
  const create = async (opts) => {
    spawnedWith = opts
    return () => new MockLanguageModelV3({ doStream: async () => { throw notReady() } })
  }

  await resolveProvider({ kind: PROVIDER.QVAC, model: 'qwen3-4b', modelConfig: { ctx_size: 32768 } }, { create })
  t.is(spawnedWith.models[0].config.ctx_size, 32768, 'an explicit ctx_size is honoured')
  t.is(spawnedWith.models[0].config.reasoning_budget, 0, 'and the rest of the default spec survives')
})

test('a model that is still loading is waited out, not reported as broken', async (t) => {
  const { create, calls } = fakeQvac([notReady(), notReady(), null])
  const naps = []
  const p = await resolveProvider(qvacCfg(), { create, sleep: async (ms) => { naps.push(ms) } })

  const waited = []
  const ms = await p.waitReady({ onWait: (attempt) => waited.push(attempt) })

  t.is(calls.length, 3, 'it kept asking until the model answered')
  t.alike(waited, [1, 2], 'and said it was waiting each time')
  t.ok(typeof ms === 'number', 'then resolved with how long it took')
})

test('the poll backs off instead of hammering a model that is downloading', async (t) => {
  const { create } = fakeQvac([...Array(6).fill(null).map(notReady), null])
  const naps = []
  const p = await resolveProvider(qvacCfg(), { create, sleep: async (ms) => { naps.push(ms) } })
  await p.waitReady()

  // Long enough to pass the ceiling: doubling alone would reach 96s by the sixth wait.
  t.alike(
    naps,
    [QVAC_POLL_MS, QVAC_POLL_MS * 2, QVAC_POLL_MS * 4, QVAC_POLL_MS * 8, QVAC_POLL_MAX_MS, QVAC_POLL_MAX_MS],
    'each wait doubles until it reaches the ceiling, then stays there'
  )
})

test('a name qvac does not know fails at once, and says so', async (t) => {
  const { create, calls } = fakeQvac([noSuchModel()])
  const naps = []
  const p = await resolveProvider(qvacCfg(), { create, sleep: async (ms) => { naps.push(ms) } })

  // Bounded deliberately: if this regresses, every failure reads as still-loading and the poll
  // spins to the timeout. An unbounded wait here would hang the suite instead of failing it.
  const why = await rejection(() => p.waitReady({ timeoutMs: 5000 }))

  t.ok(/qvac external rejected "qwen3-4b"/.test(why ?? ''), 'the failure names the provider and the model')
  t.ok(/unknown model/.test(why ?? ''), 'and carries the real cause, not the SDK wrapper')
  t.absent(/no output generated/i.test(why ?? ''), 'the AI_NoOutputGeneratedError envelope is not what surfaces')
  t.is(calls.length, 1, 'it did not retry a name that will never resolve')
  t.alike(naps, [], 'and did not sleep on the way out')
})

// External mode can carry a real key when the server sits behind a proxy, and a rejecting proxy
// is exactly the thing that echoes the credential it rejected. The hosted path already redacts;
// this one did not, so the two disagreed about whether an error message is safe to print.
test('a qvac failure never prints the key it was rejected for', async (t) => {
  const key = 'sk-qvac-SEKRET-12345'
  const { create } = fakeQvac([new Error(`Unauthorized: invalid key ${key}`)])
  const p = await resolveProvider(qvacCfg({ apiKey: key }), { create, sleep: async () => {} })

  const why = await rejection(() => p.waitReady({ timeoutMs: 5000 }))

  t.absent(why?.includes(key), 'the key is not in the message')
  t.ok(/\*\*\*/.test(why ?? ''), 'it is replaced rather than dropped, so the shape still reads')
})

// timeoutMs: 0 exits before the first probe. Deliberate: any window big enough to attempt a poll
// is also a real wait, and a test that races the clock is a test that fails on a busy machine.
test('a model that never loads gives up by name rather than hanging', async (t) => {
  const { create } = fakeQvac([notReady()])
  const p = await resolveProvider(qvacCfg(), { create, sleep: async () => {} })

  const why = await rejection(() => p.waitReady({ timeoutMs: 0 }))

  t.ok(/model "qwen3-4b" not ready within 0s/.test(why ?? ''), 'the give-up names the model and the window')
})

test('qvac waitReady passes an abort signal with the remaining timeout to each probe', async (t) => {
  let passedSignal = null
  const create = () => () => new MockLanguageModelV3({
    doStream: async (options) => {
      passedSignal = options.abortSignal
      throw noSuchModel()
    }
  })
  const p = await resolveProvider(qvacCfg(), { create, sleep: async () => {} })
  await rejection(() => p.waitReady({ timeoutMs: 5000 }))
  t.ok(passedSignal instanceof AbortSignal, 'probe receives an abort signal')
})

test('the hosted provider names the piece that is missing', async (t) => {
  t.ok(/needs a `model`/.test(await rejection(() => resolveProvider(hosted({ model: undefined })))))
  t.ok(/needs a `baseURL`/.test(await rejection(() => resolveProvider(hosted({ baseURL: undefined })))))
  t.ok(/needs an `apiKey`/.test(await rejection(() => resolveProvider(hosted({ apiKey: undefined })))))
})

test('a resolved hosted provider reports itself without leaking the key', async (t) => {
  const p = await resolveProvider(hosted())

  t.is(p.kind, PROVIDER.OPENAI_COMPATIBLE)
  t.is(p.mode, 'hosted')
  t.is(p.modelId, 'gpt-5.5')
  t.is(p.baseURL, 'https://generativelanguage.googleapis.com/v1beta/openai')
  t.absent(JSON.stringify(Object.keys(p)).includes('apiKey'), 'the key is not a property to print')
  t.ok(typeof p.model === 'function', 'model handles are made per call')
  await p.close()
})

// The SDK collapses one trailing slash on the way to /chat/completions but not two, so this
// guards both what we report — the endpoint printed at startup is what an operator pastes into
// curl — and, at two or more, what we actually send.
test('trailing slashes are normalised out of the base url', async (t) => {
  const one = await resolveProvider(hosted({ baseURL: 'https://example.test/v1/' }))
  t.is(one.baseURL, 'https://example.test/v1', 'no trailing slash reaches the banner')

  const two = await resolveProvider(hosted({ baseURL: 'https://example.test/v1//' }))
  t.is(two.baseURL, 'https://example.test/v1', 'and the SDK never sees a doubled separator')

  const clean = await resolveProvider(hosted({ baseURL: 'https://example.test/v1' }))
  t.is(clean.baseURL, 'https://example.test/v1', 'a clean url is left alone')
  await one.close()
  await two.close()
  await clean.close()
})

// The turn stringifies whatever the SDK threw straight into an error event, which the gateway
// forwards over SSE. Redacting only where waitReady composes a message covers startup and leaves
// a key revoked or rotated mid-session leaking through that path instead.
test('a 401 body echoing the key is scrubbed before the SDK builds its error', async (t) => {
  const p = await resolveProvider(hosted({ apiKey: TEST_KEY, fetch: echoes }))

  // Exactly what loop.js does with a failed part: String(part.error).
  let surfaced = ''
  const r = streamText({ model: p.model(), prompt: 'hi', maxOutputTokens: 8, maxRetries: 0, onError: () => {} })
  for await (const part of r.stream) {
    if (part.type === 'error') surfaced = String(part.error)
  }

  t.ok(/Incorrect API key/.test(surfaced), 'the operator still learns what went wrong')
  t.absent(surfaced.includes(TEST_KEY), 'without being handed the key to read')
  await p.close()
})

// A 304 carries no body and the Response constructor refuses to build one, so rebuilding it to
// scrub a key that cannot be there turns a caching proxy in front of the endpoint into a
// TypeError from inside our own fetch wrapper.
test('a bodiless response is passed through rather than rebuilt', async (t) => {
  for (const status of [304, 204]) {
    const p = await resolveProvider(hosted({ apiKey: TEST_KEY, fetch: async () => new Response(null, { status }) }))
    const err = await rejection(() => p.waitReady({ timeoutMs: 2000 }))
    t.absent(/Invalid response status code|Response constructor/.test(err ?? ''), `${status} does not break the wrapper`)
    await p.close()
  }
})

// The body is whatever the endpoint chose to say, and several OpenAI-compatible gateways echo
// the Authorization header back on an auth failure. It reaches the operator's terminal through
// the thrown message and through onRateLimited.
test('the api key never reaches the operator through an endpoint error', async (t) => {
  const p = await resolveProvider(hosted({ apiKey: TEST_KEY, fetch: echoes }))
  const err = await rejection(() => p.waitReady({ timeoutMs: 2000 }))

  t.ok(err, 'a rejected key still fails at startup')
  t.absent(err.includes(TEST_KEY), 'but the key itself is redacted out of the message')
  t.ok(err.includes('***'), 'and the redaction is visible rather than silent')
  await p.close()
})

// waitReady is a credential check here, not a warm-up wait: a rejected key must surface as a
// startup failure, not be retried for minutes like a model that is still loading.
test('waitReady surfaces an unreachable endpoint as a named failure', async (t) => {
  const p = await resolveProvider(hosted({ baseURL: 'http://127.0.0.1:1', name: 'openai' }))
  const err = await rejection(() => p.waitReady({ timeoutMs: 5000 }))

  t.ok(err, 'it fails rather than hanging')
  t.ok(/openai endpoint rejected "gpt-5.5"/.test(err), 'and says which model at which provider')
  await p.close()
})

// ── pacedFetch: a rate-limited endpoint should slow the agent, not fail it ───

const reply = (status, headers = {}) => ({
  status,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  body: null
})

function recorder (statuses) {
  const calls = []
  const naps = []
  const queue = [...statuses]
  return {
    calls,
    naps,
    fetchImpl: async () => { calls.push(Date.now()); return reply(queue.length > 1 ? queue.shift() : queue[0]) },
    sleep: async (ms) => { naps.push(ms) }
  }
}

test('a 429 is retried rather than surfaced as the model failing', async (t) => {
  const r = recorder([429, 429, 200])
  const res = await pacedFetch({ fetchImpl: r.fetchImpl, sleep: r.sleep })('u', {})

  t.is(res.status, 200, 'it gets there in the end')
  t.is(r.calls.length, 3)
  t.alike(r.naps, [1000, 2000], 'and backs off exponentially between tries')
})

// The server knows when it will accept work; we do not. Guessing over its answer wastes the wait.
test('Retry-After wins over our own backoff, in seconds or as a date', async (t) => {
  const once = (header) => {
    const naps = []
    let n = 0
    const impl = async () => {
      n++
      return n === 1 ? reply(429, { 'retry-after': header }) : reply(200)
    }
    return { naps, run: () => pacedFetch({ fetchImpl: impl, sleep: async (ms) => { naps.push(ms) } })('u', {}) }
  }

  const seconds = once('7')
  await seconds.run()
  t.alike(seconds.naps, [7000], 'seconds are read as seconds')

  const dated = once(new Date(Date.now() + 5000).toUTCString())
  await dated.run()
  t.ok(dated.naps[0] > 3000 && dated.naps[0] <= 5000, 'an HTTP date becomes a delay')
})

// Retrying forever would hang a batch run on a quota that is exhausted for the day.
test('retrying is bounded, and the last 429 is returned as itself', async (t) => {
  const r = recorder([429])
  const res = await pacedFetch({ fetchImpl: r.fetchImpl, sleep: r.sleep })('u', {})

  t.is(res.status, 429, 'the caller still sees the truth')
  // The literal, not the constant: asserting against RATE_LIMIT_ATTEMPTS passes at any bound,
  // including one so low that a busy endpoint is given up on after two tries.
  t.is(r.calls.length, 6, 'after a bounded number of attempts')
  t.is(RATE_LIMIT_ATTEMPTS, 6, 'and the bound is the one callers were told about')
})

test('rpm paces request starts, and is off unless asked for', async (t) => {
  // Three requests, not one: the first is free at every rpm, so a single call naps [] whether
  // pacing is off or on, and the assertion would be satisfied by the wrong thing.
  const off = recorder([200])
  const unpaced = pacedFetch({ fetchImpl: off.fetchImpl, sleep: off.sleep })
  await unpaced('u', {})
  await unpaced('u', {})
  await unpaced('u', {})
  t.alike(off.naps, [], 'no pacing by default — an enterprise key does not need it')

  const on = recorder([200])
  const paced = pacedFetch({ rpm: 60, fetchImpl: on.fetchImpl, sleep: on.sleep })
  await paced('u', {})
  await paced('u', {})
  await paced('u', {})
  t.is(on.calls.length, 3, 'every request still goes out')
  t.is(on.naps.length, 2, 'the first goes immediately, the rest wait for a slot')
  // Slots accrue rather than reset, so a caller firing instantly is spread across the minute
  // instead of the first two landing together and the third being throttled alone.
  t.ok(on.naps[1] - on.naps[0] >= 900, 'each slot is a further second out')
})

// Non-429 failures are the caller's business: retrying a 401 only delays the same answer.
test('other statuses are passed straight through', async (t) => {
  const r = recorder([500])
  const res = await pacedFetch({ fetchImpl: r.fetchImpl, sleep: r.sleep })('u', {})
  t.is(res.status, 500)
  t.is(r.calls.length, 1, 'no retry')
})

// Some endpoints answer a quota rejection with the wait in the body and no Retry-After. Missing
// it means retrying early, and an early retry is refused too — spending the quota it is waiting for.
test('a retry delay stated only in the body is still obeyed', async (t) => {
  const naps = []
  let n = 0
  const impl = async () => {
    n++
    if (n > 1) return reply(200)
    const body = JSON.stringify([{ error: { code: 429, message: 'You exceeded your current quota. Please retry in 45.7s' } }])
    return { ...reply(429), clone: () => ({ text: async () => body }) }
  }
  await pacedFetch({ fetchImpl: impl, sleep: async (ms) => { naps.push(ms) } })('u', {})

  t.alike(naps, [45700], 'the server\'s own number, not our guess')
})

// A malformed number matches the digits-and-dots pattern and parses to NaN, which ?? does not
// rescue — setTimeout(NaN) fires at once, so every remaining attempt burns instantly against an
// endpoint that just asked us to wait.
test('an unparseable body delay falls back to the backoff, not to no wait', async (t) => {
  const naps = []
  let n = 0
  const impl = async () => {
    n++
    if (n > 1) return reply(200)
    const body = JSON.stringify({ error: { message: 'Please retry in 1.2.3s' } })
    return { ...reply(429), clone: () => ({ text: async () => body }) }
  }
  await pacedFetch({ fetchImpl: impl, sleep: async (ms) => { naps.push(ms) } })('u', {})

  t.is(naps.length, 1)
  t.ok(Number.isFinite(naps[0]), 'the delay is a real number')
  t.is(naps[0], 1000, 'and it is the exponential backoff, since the body said nothing usable')
})
