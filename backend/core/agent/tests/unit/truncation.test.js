// A truncated answer looks exactly like a complete one — it just stops. That is the whole
// problem: an operator who asks for a list and gets half of it has no way to tell.

import test from 'brittle'
import { MockLanguageModelV3, convertArrayToReadableStream } from 'ai/test'
import { runToolLoop, TRUNCATED_NOTE } from '../../src/loop.js'
import { EVENT } from '../../src/events.js'

// Provider spec v3 carries the finish reason as an object, not a string — a bare 'length' here
// is silently read as undefined and reported as 'other', which is exactly the shape of bug this
// file exists to catch.
const model = (text, unified) => new MockLanguageModelV3({
  doStream: async () => ({
    stream: convertArrayToReadableStream([
      { type: 'text-start', id: '0' },
      { type: 'text-delta', id: '0', delta: text },
      { type: 'text-end', id: '0' },
      { type: 'finish', finishReason: { unified }, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } }
    ])
  })
})

async function collect (m) {
  const events = []
  for await (const e of runToolLoop({ model: m, system: 'CHARTER', messages: [{ role: 'user', content: 'list the miners' }], tools: [], mcp: null })) {
    events.push(e)
  }
  return events
}

test('an answer cut off at the output limit says so', async (t) => {
  const events = await collect(model('avalon-3 (299.26)\navalon-2 (29', 'length'))
  const done = events.find((e) => e.type === EVENT.DONE)

  t.ok(done, 'the turn still completes')
  t.ok(done.text.includes(TRUNCATED_NOTE.trim()), 'and the answer carries the warning')
  t.ok(done.text.includes('avalon-3'), 'without discarding what did arrive')

  // The consumer prints tokens, so the warning has to reach that stream too — putting it only
  // in the done text would leave the terminal showing a silently half-finished list.
  const streamed = events.filter((e) => e.type === EVENT.TOKEN).map((e) => e.text).join('')
  t.ok(streamed.includes(TRUNCATED_NOTE.trim()), 'the operator sees it live, not just in the record')
})

test('a complete answer is left alone', async (t) => {
  const events = await collect(model('avalon-3 is the fastest miner.', 'stop'))
  const done = events.find((e) => e.type === EVENT.DONE)

  t.is(done.text, 'avalon-3 is the fastest miner.', 'no warning on a normal answer')
  t.absent(events.some((e) => e.type === EVENT.TOKEN && e.text.includes('cut off')))
})
