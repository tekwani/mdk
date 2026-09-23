import { streamText } from 'ai'
import { createQvac } from '@qvac/ai-sdk-provider'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

export const PROVIDER = Object.freeze({
  QVAC: 'qvac',
  OPENAI_COMPATIBLE: 'openai-compatible'
})

// The qvac readiness poll: first wait, then doubling to this ceiling.
export const QVAC_POLL_MS = 3000
export const QVAC_POLL_MAX_MS = 30_000

/**
 * Turn a provider config into a live model handle, hiding the mode and the underlying SDK
 * from the rest of the agent.
 *
 * The qvac modes differ only in who owns the serve process: `external` connects to an
 * already-running server by URL (also the shared-inference-server shape), `managed` spawns
 * one, which requires the agent and the GPU to share an OS.
 *
 * `openai-compatible` reaches any hosted endpoint that speaks /chat/completions. It exists to
 * measure the same battery against a larger model, not to ship one: everything the agent knows
 * about the fleet travels off-site with the prompt, which is the opposite of the qvac premise.
 *
 * `deps` exists so the qvac path can be exercised without a GPU: the SDK factory and the poll's
 * sleep are the only two things in it that need a live server or a real clock.
 */
export async function resolveProvider (cfg, deps = {}) {
  switch (cfg.kind) {
    case PROVIDER.QVAC: return createQvacProvider(cfg, deps)
    case PROVIDER.OPENAI_COMPATIBLE: return createHostedProvider(cfg)
    default: throw new Error(`unknown provider kind: ${cfg.kind}`)
  }
}

// Trimmed with a scan rather than /\/+$/: the regex backtracks quadratically on a long run
// of trailing slashes, which CodeQL flags as a polynomial ReDoS (js/polynomial-redos).
function stripTrailingSlashes (value) {
  let end = value.length
  while (end > 0 && value[end - 1] === '/') end--
  return value.slice(0, end)
}

async function createHostedProvider (cfg) {
  const modelId = cfg.model
  if (!modelId) throw new Error('openai-compatible provider needs a `model`')
  if (!cfg.baseURL) throw new Error('openai-compatible provider needs a `baseURL`')
  if (!cfg.apiKey) throw new Error('openai-compatible provider needs an `apiKey`')

  const baseURL = stripTrailingSlashes(cfg.baseURL)

  const fetchImpl = redacting(cfg.apiKey, cfg.fetch)

  const client = (fetch) => createOpenAICompatible({
    name: cfg.name ?? 'hosted',
    baseURL,
    apiKey: cfg.apiKey,
    headers: cfg.headers,
    fetch
  })

  const openai = client(pacedFetch({ rpm: cfg.rpm, fetchImpl }))
  const probe = client(pacedFetch({ rpm: 0, attempts: 1, fetchImpl }))

  return {
    kind: PROVIDER.OPENAI_COMPATIBLE,
    mode: 'hosted',
    modelId,
    baseURL,
    model: () => openai(modelId),
    close: async () => {},

    /**
     * A hosted endpoint does not warm up, so this is a credential and model-name check rather
     * than a wait: it turns "401" or "no such model" into a startup failure instead of a broken
     * first answer. Deliberately NOT the qvac retry loop — retrying a rejected key for twelve
     * minutes only delays the same error, and a reasoning model can legitimately return no text
     * at a 1-token budget, which that loop would misread as "still loading".
     *
     * A rate-limited endpoint counts as ready: a 429 is the endpoint answering on a valid key for
     * a model it recognises, so `onRateLimited` fires with the reason and the call resolves with
     * the elapsed milliseconds rather than throwing. Every other failure throws.
     */
    async waitReady ({ timeoutMs = 90e3, onRateLimited } = {}) {
      const t0 = Date.now()
      const remainingMs = Math.max(1, timeoutMs - (Date.now() - t0))
      const r = streamText({ model: probe(modelId), prompt: 'hi', maxOutputTokens: 1, maxRetries: 0, onError: () => {}, abortSignal: AbortSignal.timeout(remainingMs) })
      const failure = await firstStreamFailure(r)
      if (failure && isRateLimit(failure)) {
        onRateLimited?.(describe(failure, cfg.apiKey))
        return Date.now() - t0
      }
      if (failure) throw new Error(`${cfg.name ?? 'hosted'} endpoint rejected "${modelId}": ${describe(failure, cfg.apiKey)}`)
      return Date.now() - t0
    }
  }
}

async function createQvacProvider (cfg, { create = createQvac, sleep: nap = sleep } = {}) {
  const mode = cfg.mode ?? (cfg.baseURL ? 'external' : 'managed')
  const modelId = cfg.model
  if (!modelId) throw new Error('qvac provider needs a `model`')

  let qvac
  let close = async () => {}

  if (mode === 'external') {
    if (!cfg.baseURL) throw new Error('qvac external mode needs `baseURL` (e.g. http://127.0.0.1:11500/v1)')
    qvac = create({ baseURL: cfg.baseURL, apiKey: cfg.apiKey ?? 'qvac' })
  } else if (mode === 'managed') {
    // ctx_size / reasoning_budget must be passed — the serve defaults (ctx 1024) are too small.
    const spec = { name: modelId, config: { ctx_size: 16384, reasoning_budget: 0, ...(cfg.modelConfig ?? {}) } }
    qvac = await create({ mode: 'managed', models: [spec], serveStartTimeout: 15 * 60 * 1000 })
    close = () => qvac.close()
  } else {
    throw new Error(`unknown qvac mode: ${mode}`)
  }

  // One readiness generation. Resolves to the failure that stopped it, or null if it completed.
  const probe = async (remainingMs) => {
    const r = streamText({
      model: qvac(modelId),
      prompt: 'hi',
      maxOutputTokens: 1,
      maxRetries: 0,
      onError: () => {},
      ...(remainingMs ? { abortSignal: AbortSignal.timeout(remainingMs) } : {})
    })
    return firstStreamFailure(r)
  }

  return {
    kind: PROVIDER.QVAC,
    mode,
    modelId,
    baseURL: cfg.baseURL,
    // A fresh AI SDK model handle for each call (stateless; cheap).
    model: () => qvac(modelId),
    close,

    /**
     * Poll a 1-token generation until the model answers, riding out the first-run download and
     * the cold-start window where the server replies "model not ready".
     *
     * The error is read off the stream rather than from the rejection, the same way the hosted
     * probe does it: the SDK reports any failed stream as `AI_NoOutputGeneratedError` with the
     * real cause absent from the chain, and `isTransient` matches its own "no output generated"
     * clause. Reading the rejection therefore classified every failure as still-loading, so a
     * name the server does not know was retried for the full twelve minutes instead of failing.
     */
    async waitReady ({ timeoutMs = 12 * 60 * 1000, onWait } = {}) {
      const t0 = Date.now()
      let attempt = 0
      let wait = QVAC_POLL_MS
      while (Date.now() - t0 < timeoutMs) {
        const remainingMs = Math.max(1, timeoutMs - (Date.now() - t0))
        const failure = await probe(remainingMs)
        if (!failure) return Date.now() - t0
        if (!isTransient(failure)) throw new Error(`qvac ${mode} rejected "${modelId}": ${describe(failure, cfg.apiKey)}`)
        onWait?.(++attempt, Date.now() - t0)
        await nap(wait)
        // A first-run download is minutes long. A flat 3s poll spends that window making
        // hundreds of identical failing generations; backing off costs a few seconds of
        // detection lag and nothing else.
        wait = Math.min(wait * 2, QVAC_POLL_MAX_MS)
      }
      throw new Error(`model "${modelId}" not ready within ${Math.round(timeoutMs / 1000)}s`)
    }
  }
}

/**
 * Wrap fetch so an api key echoed back in a **failed** response never reaches the SDK's error.
 *
 * A 2xx is passed through untouched, so a key echoed inside a successful stream is not covered:
 * buffering a success body to scrub it would hold the whole stream in memory and turn
 * time-to-first-token into total latency. That case belongs to whoever stringifies the error.
 *
 * Headers are carried over except content-length, which the redaction invalidates. A 304 has no
 * body and cannot be reconstructed, so it passes through with the rest.
 */
function redacting (apiKey, inner = globalThis.fetch) {
  if (!apiKey) return inner
  return async (input, init) => {
    const res = await inner(input, init)
    if (res.ok || res.status === 304) return res
    const headers = new Headers(res.headers)
    headers.delete('content-length')
    const body = (await res.text()).replaceAll(apiKey, '***')
    return new Response(body, { status: res.status, statusText: res.statusText, headers })
  }
}

export const RATE_LIMIT_ATTEMPTS = 6

/**
 * Wrap fetch so a rate-limited endpoint slows the agent down instead of failing it.
 *
 * 429 is a routine "later", not an error, but the SDK gives up after three quick attempts — a
 * batch run then reads as the model getting every question wrong when it never saw them. `rpm`
 * paces requests so the limit is not tripped; the retry covers being wrong about it, honouring
 * Retry-After because the server knows when it will accept work and we do not.
 *
 * Paced, not serialised: each start is delayed, no response waits on another.
 */
export function pacedFetch ({ rpm = 0, attempts = RATE_LIMIT_ATTEMPTS, fetchImpl = globalThis.fetch, sleep: nap = sleep } = {}) {
  const interval = rpm > 0 ? Math.ceil(60_000 / rpm) : 0
  let nextSlot = 0

  async function takeSlot () {
    if (!interval) return
    const now = Date.now()
    const at = Math.max(now, nextSlot)
    nextSlot = at + interval
    if (at > now) await nap(at - now)
  }

  return async function paced (input, init) {
    let wait = 1000
    for (let attempt = 1; ; attempt++) {
      await takeSlot()
      const res = await fetchImpl(input, init)
      if (res.status !== 429 || attempt >= attempts) return res
      const told = retryAfterMs(res) ?? await bodyRetryMs(res)
      await res.body?.cancel().catch(() => {})
      await nap(told ?? wait)
      wait = Math.min(wait * 2, 60_000)
    }
  }
}

export function isRateLimit (err) {
  return err?.statusCode === 429 || /\b429\b|too many requests|rate limit|resource_exhausted|exceeded your current quota/i.test(errChain(err))
}

async function bodyRetryMs (res) {
  try {
    const text = await res.clone().text()
    const seconds = Number(/retry (?:in|after)\s+([0-9.]+)\s*s/i.exec(text)?.[1])
    return Number.isFinite(seconds) ? Math.ceil(seconds * 1000) : null
  } catch {
    return null
  }
}

function retryAfterMs (res) {
  const raw = res.headers?.get?.('retry-after')
  if (!raw) return null
  const seconds = Number(raw)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000
  const at = Date.parse(raw)
  return Number.isFinite(at) ? Math.max(0, at - Date.now()) : null
}

function describe (err, apiKey) {
  const message = String(err?.message ?? err)
  const body = err?.responseBody ?? err?.data
  const detail = typeof body === 'string' ? body : body ? JSON.stringify(body) : ''
  const reason = /"message"\s*:\s*"([^"]+)"/.exec(detail)?.[1] ?? detail.slice(0, 200)
  const full = reason && !message.includes(reason) ? `${message} — ${reason}` : message
  return apiKey ? full.replaceAll(apiKey, '***') : full
}

/**
 * Drain a streamText result object and resolve to the first error produced by any of its promise
 * properties (text, finishReason, usage) or by an error part in the stream.
 */
async function firstStreamFailure (r) {
  let failure = null
  const claimed = [r.text, r.finishReason, r.usage].map((p) => p?.catch((err) => { failure ??= err }))
  try {
    for await (const part of r.stream) {
      if (part.type === 'error') failure ??= part.error
    }
  } catch (err) {
    failure ??= err
  }
  await Promise.all(claimed)
  return failure
}

// "Still starting up" errors we should wait through, vs. real failures to surface.
function isTransient (err) {
  return /not ready|not loaded|model_not_ready|503|fetch failed|ECONNREFUSED|socket|terminated/i
    .test(errChain(err))
}

function errChain (e, depth = 0) {
  if (!e || depth > 6) return ''
  let data = ''
  try { data = JSON.stringify(e.data ?? e.responseBody ?? '') } catch {}
  return [e.name, e.message, data, errChain(e.cause, depth + 1)].filter(Boolean).join(' ')
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
