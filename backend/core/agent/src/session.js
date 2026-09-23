import { randomUUID } from 'node:crypto'
import { streamText } from 'ai'
import { runToolLoop, describeCallError, deadline, UNSPEAKABLE_FALLBACK } from './loop.js'
import { DEFAULT_LIMITS, REQUEST_TIMEOUT_MS } from './constants.js'
import { SESSION_GONE } from './session-store.js'
import { EVENT } from './events.js'
import { CHARTER } from './charter.js'

/**
 * One conversation. Turns each user message into a streamed sequence of typed events (see
 * docs/CONTRACT.md), and keeps its history where the store puts it.
 *
 * With tools from an MCP server a turn runs the prompt-based tool loop; otherwise it is a
 * plain grounded chat. Either way a failed turn leaves no trace in history.
 *
 * `messages` is the working copy the model sees. It is written back to the store at the end of
 * every turn and replaced by what the store returns, so the store's cap is the real one — a
 * session that kept its own uncapped array would grow past it while the store looked bounded.
 */
export class Session {
  constructor ({ provider, system, limits = {}, userId = 'local', tools = [], mcp = null, notCovered, store = null, id, messages = [] } = {}) {
    if (!provider) throw new Error('Session needs a provider')
    this.provider = provider
    this.system = system ?? CHARTER
    this.limits = limits
    this.userId = userId
    this.tools = tools
    this.mcp = mcp
    this.notCovered = notCovered
    this.store = store
    this.messages = messages
    this.id = id ?? randomUUID()
  }

  /**
   * Run one turn, streaming its events.
   *
   * The write is in a `finally` because a consumer is free to stop reading — a gateway request
   * whose client disconnects abandons the generator mid-stream, and the turn that did happen
   * would otherwise never reach the store. The turn generators settle history in a `finally` of
   * their own for the same reason, so what gets written is never a question with no answer.
   */
  async * send (text) {
    this.messages.push({ role: 'user', content: text })
    try {
      yield * (this.tools.length && this.mcp ? this.toolTurn() : this.chatTurn())
    } finally {
      await this.persist()
    }
  }

  /**
   * Write the turn back and adopt what came out, so the store's trim is what the next turn sends.
   *
   * A record the store no longer holds — SESSION_GONE — is not coming back, so the session
   * detaches and carries on in memory: the turn already happened, and failing after the fact
   * tells the operator nothing they can act on. Anything else is treated as transient — the store
   * stays attached so the next turn retries.
   *
   * @returns {Promise<boolean>} whether the write landed.
   */
  async persist () {
    if (!this.store) return true
    try {
      const saved = await this.store.save({ id: this.id, messages: this.messages })
      this.messages = saved.messages
      this.persistError = null
      return true
    } catch (err) {
      if (err?.code === SESSION_GONE || /does not exist|expired/i.test(String(err?.message))) this.store = null
      this.persistError = err
      return false
    }
  }

  async * toolTurn () {
    const loop = runToolLoop({
      model: this.provider.model(),
      system: this.system,
      messages: this.messages,
      tools: this.tools,
      mcp: this.mcp,
      notCovered: this.notCovered,
      maxSteps: this.limits.maxSteps ?? DEFAULT_LIMITS.maxSteps,
      maxOutputTokens: this.limits.maxOutputTokens ?? DEFAULT_LIMITS.maxOutputTokens,
      requestTimeoutMs: this.limits.requestTimeoutMs ?? REQUEST_TIMEOUT_MS
    })
    let answer = ''
    let errored = false
    let sent
    // What the loop ran on the way to its answer. Undefined if the turn was abandoned before
    // the loop returned, which the finally block treats as "no trace".
    let toolExchange
    try {
      while (true) {
        const { value: ev, done } = await loop.next(sent)
        sent = undefined
        if (done) { toolExchange = ev; break }
        if (ev.type === EVENT.TOKEN) answer += ev.text
        else if (ev.type === EVENT.ERROR) errored = true
        sent = yield ev // whatever the consumer passes to .next() (e.g. an approval bool)
      }
    } finally {
      // A suppressed answer is discarded with the turn, exactly like an error, because it is not
      // something the assistant said. Recorded instead, it taught the model that giving up is a
      // valid shape for a turn: one fallback in the history was answered with another, and a
      // ten-turn conversation collapsed into six consecutive "could not complete that request"
      // — while the same questions answered correctly in a fresh session.
      if (errored || !answer || answer === UNSPEAKABLE_FALLBACK) this.messages.pop()
      // The tool exchange goes in ahead of the answer, so the transcript reads the way the turn
      // actually happened: asked → called a tool → got a result → answered. Recording only the
      // answer taught the model that a bare sentence is the whole job, and by the third repeat
      // of a write it would claim the action had run without calling anything.
      else this.messages.push(...(toolExchange ?? []), { role: 'assistant', content: answer })
    }
  }

  async * chatTurn () {
    const timeoutMs = this.limits.requestTimeoutMs ?? REQUEST_TIMEOUT_MS
    const signal = deadline(timeoutMs)
    const result = streamText({
      model: this.provider.model(),
      system: this.system,
      messages: this.messages,
      maxOutputTokens: this.limits.maxOutputTokens ?? DEFAULT_LIMITS.maxOutputTokens,
      maxRetries: this.limits.maxRetries ?? 2,
      // A stream error is reported as EVENT.ERROR below; the SDK's default onError
      // would also dump the raw error object over whoever is reading the stream.
      onError: () => {},
      abortSignal: signal
    })
    let assistant = ''
    let errored = false
    try {
      try {
        for await (const part of result.stream) {
          if (part.type === 'text-delta') {
            const t = part.text ?? part.delta ?? ''
            assistant += t
            yield { type: EVENT.TOKEN, text: t }
          } else if (part.type === 'error') {
            errored = true
            yield { type: EVENT.ERROR, error: String(part.error) }
            return
          }
        }
      } catch (err) {
        errored = true
        yield { type: EVENT.ERROR, error: describeCallError(err, timeoutMs) }
        return
      }
      if (signal?.aborted) {
        errored = true
        yield { type: EVENT.ERROR, error: describeCallError(signal.reason, timeoutMs) }
        return
      }
    } finally {
      if (errored || !assistant) this.messages.pop()
      else this.messages.push({ role: 'assistant', content: assistant })
    }
    const usage = await result.usage.catch(() => ({}))
    yield { type: EVENT.DONE, usage, text: assistant }
  }

  /**
   * Clear the conversation, in the store as well as here.
   *
   * Throws if the store refused the write. `send` swallows the same failure because its turn has
   * already happened, but a reset that resolves while the history survives is a lie the caller
   * acts on — and the conversation returns the moment it is resumed elsewhere.
   *
   * A record that is already gone is not a refusal: there is nothing left to clear, and the
   * caller asked for exactly the state they now have. Only a store still attached — one that
   * expects to be written to again — means the history survived the call.
   */
  async reset () {
    const previous = this.messages
    this.messages = []
    if (!(await this.persist()) && this.store) {
      this.messages = previous
      throw this.persistError
    }
  }
}
