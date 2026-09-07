// Unit tests for the pure parsing/formatting logic in the tool loop:
//   - extractJsonObject: balanced, string-aware object extraction
//   - parseToolCall: valid calls, arg defaulting, rejections
//   - buildToolSystem: the charter plus the rendered tool contract
//   - leadKind: call-or-answer from the first characters, before the rest arrives

import test from 'brittle'
import { MockLanguageModelV3, convertArrayToReadableStream } from 'ai/test'
import { runToolLoop, parseToolCall, extractJsonObject, buildToolSystem, leadKind, rejectedArguments, describeCallError, contractViolation, echoesQuestion, mentionsATool, leaksScaffolding } from '../../src/loop.js'
import { requiresApproval } from '../../src/constants.js'
import { EVENT } from '../../src/events.js'
import { admitTools, renderTools, AXIS, CAPABILITY, AGENT_META_KEY, TOOL_CONTRACT_VERSION } from '../../src/tools.js'

// ── requiresApproval: the safety boundary — fails SAFE ───────────────────────

test('requiresApproval gates writes and unknown tools, allows read verbs', (t) => {
  t.is(requiresApproval('count_devices'), false)
  t.is(requiresApproval('list_devices'), false)
  t.is(requiresApproval('summarize_site'), false)
  t.is(requiresApproval('act_device'), true) // the write verb → ask
  t.is(requiresApproval('send_command'), true) // off-taxonomy → ask (fail safe)
  t.is(requiresApproval('some_new_write_tool'), true)
})

test('requiresApproval honours the MCP readOnlyHint annotation', (t) => {
  t.is(requiresApproval('anything', { annotations: { readOnlyHint: true } }), false)
  // an explicit write hint overrides the verb
  t.is(requiresApproval('count_devices', { annotations: { readOnlyHint: false } }), true)
})

// A server may state only destructiveHint — the gateway bridge does exactly that for a route
// declared safety: "write". An absent readOnlyHint is not a claim of read-only, so a read verb
// in the name must not be allowed to answer over a server that already said it writes.
test('requiresApproval treats a lone destructiveHint as the server saying it writes', (t) => {
  t.is(requiresApproval('get_device', { annotations: { destructiveHint: true } }), true)
  t.is(requiresApproval('act_device', { annotations: { destructiveHint: true } }), true)
})

test('requiresApproval keeps readOnlyHint authoritative over destructiveHint', (t) => {
  t.is(requiresApproval('get_device', { annotations: { readOnlyHint: true, destructiveHint: true } }), false)
  t.is(requiresApproval('get_device', { annotations: { readOnlyHint: false, destructiveHint: false } }), true)
})

test('requiresApproval falls back to the name only when the server states neither hint', (t) => {
  t.is(requiresApproval('get_device', { annotations: { destructiveHint: false } }), false)
  t.is(requiresApproval('send_command', { annotations: { destructiveHint: false } }), true)
})

// ── leadKind ─────────────────────────────────────────────────────────────────
// The loop decides mid-stream whether to buffer the output as a tool call or stream it at the
// operator, so it has to judge on a prefix. Getting this wrong is silent: the call is printed
// as if it were the answer and the tool never runs.

test('leadKind tells a bare tool call from prose', (t) => {
  t.is(leadKind('{"tool"'), 'tool')
  t.is(leadKind('There are 15 miners.'), 'prose')
  t.is(leadKind(''), 'unknown', 'nothing to judge on yet')
})

// Hosted models wrap tool-call JSON in a fence far more often than local ones do.
test('leadKind waits out a code fence instead of judging the backtick', (t) => {
  t.is(leadKind('`'), 'unknown')
  t.is(leadKind('```'), 'unknown', 'no fence header yet')
  t.is(leadKind('```json'), 'unknown', 'header still arriving')
  t.is(leadKind('```json\n'), 'unknown', 'body has not started')
  t.is(leadKind('```json\n{"tool"'), 'tool')
  t.is(leadKind('```\n{"tool":"count_devices"}'), 'tool', 'an unlabelled fence counts too')
  t.is(leadKind('```\nrestart the miner first'), 'prose', 'a fenced non-object is still an answer')
})

test('leadKind treats inline code as prose, not a fence', (t) => {
  t.is(leadKind('`antminer-3` is offline'), 'prose')
  t.is(leadKind('``'), 'unknown', 'could still become a fence')
})

// The stream feeds leadKind a growing prefix, so it must never flip its mind once decided.
test('leadKind is stable as the prefix grows', (t) => {
  const full = '```json\n{"tool":"count_devices","args":{}}\n```'
  let firstDecision = null
  for (let i = 1; i <= full.length; i++) {
    const kind = leadKind(full.slice(0, i))
    if (kind === 'unknown') continue
    if (firstDecision === null) firstDecision = kind
    t.is(kind, firstDecision, `stable at ${i} chars`)
  }
  t.is(firstDecision, 'tool')
})

// ── extractJsonObject ────────────────────────────────────────────────────────

test('extractJsonObject returns the first balanced object', (t) => {
  t.is(extractJsonObject('{"a":1}'), '{"a":1}')
  t.is(extractJsonObject('prefix {"a":{"b":2}} suffix'), '{"a":{"b":2}}')
})

test('extractJsonObject stops at the first balanced close, ignoring stray braces', (t) => {
  // the exact malformed shape small models emit: trailing }}}
  t.is(extractJsonObject('{"tool":"x","args":{}}}}'), '{"tool":"x","args":{}}')
})

test('extractJsonObject ignores braces inside strings', (t) => {
  t.is(extractJsonObject('{"msg":"a}b"}'), '{"msg":"a}b"}')
})

test('extractJsonObject returns null when there is no balanced object', (t) => {
  t.is(extractJsonObject('no braces here'), null)
  t.is(extractJsonObject('{ unbalanced'), null)
})

// ── parseToolCall ────────────────────────────────────────────────────────────

test('parseToolCall parses a valid tool call', (t) => {
  t.alike(parseToolCall('{"tool":"get_status","args":{}}'), { tool: 'get_status', args: {} })
})

test('parseToolCall defaults args to {} when absent', (t) => {
  t.alike(parseToolCall('{"tool":"summarize_site"}'), { tool: 'summarize_site', args: {} })
})

test('parseToolCall reads nested args', (t) => {
  t.alike(
    parseToolCall('{"tool":"send_command","args":{"deviceId":"antminer-3","params":{"mode":"high"}}}'),
    { tool: 'send_command', args: { deviceId: 'antminer-3', params: { mode: 'high' } } }
  )
})

test('parseToolCall tolerates prose before the object and stray trailing braces', (t) => {
  t.alike(
    parseToolCall('Sure: {"tool":"list_devices","args":{"type":"miner"}}}}'),
    { tool: 'list_devices', args: { type: 'miner' } }
  )
})

test('parseToolCall returns null for a plain-text answer', (t) => {
  t.is(parseToolCall('There are 15 miners on the site.'), null)
})

test('parseToolCall returns null when there is no string tool key', (t) => {
  t.is(parseToolCall('{"foo":1}'), null)
  t.is(parseToolCall('{"tool":42}'), null)
})

// ── buildToolSystem (enum + default surfacing) ───────────────────────────────

test('the coverage boundary reaches the prompt and is configurable there', (t) => {
  const tool = {
    name: 'count_devices',
    description: 'How many devices.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    _meta: {
      'x-mdk-agent': {
        enabled: true,
        answers: 'How many devices.',
        useWhen: ['how many miners', 'device count'],
        notFor: [],
        outOfScope: [],
        returns: 'a count',
        minCapability: 'small',
        contract: TOOL_CONTRACT_VERSION
      }
    }
  }

  t.ok(buildToolSystem('CHARTER', [tool]).includes('NONE of these tools answers'), 'the default boundary is rendered')
  t.ok(buildToolSystem('CHARTER', [tool], { notCovered: ['pool payouts'] }).includes('pool payouts'), 'a consumer can replace it')

  const dropped = buildToolSystem('CHARTER', [tool], { notCovered: [] })
  t.absent(dropped.includes('NONE of these tools answers'), 'and drop it entirely')
  t.absent(/\n\n\n/.test(dropped), 'without leaving a gap where the block was')
})

// ── what reaches the operator (never JSON) ───────────────────────────────────

const { admitted: LOOP_TOOLS } = admitTools([{
  name: 'summarize_site',
  description: 'How the site is doing.',
  inputSchema: { type: 'object', properties: {} },
  annotations: { readOnlyHint: true },
  _meta: {
    [AGENT_META_KEY]: {
      enabled: true,
      answers: 'How the site is doing.',
      useWhen: ['how is the site', 'site overview'],
      returns: 'a summary',
      minCapability: CAPABILITY.SMALL,
      contract: TOOL_CONTRACT_VERSION
    }
  }
}])

// The fixture was silently rejected by admission — the wrong name shape and one useWhen short —
// so every test below ran the loop with no tools at all. Nothing failed, because a loop with no
// tools takes a shorter path through the same code: prose streams immediately and the grounding
// rules that only apply when a tool could have been called were unreachable. Asserted here so it
// can never empty again without saying so.
test('the loop fixture is actually admitted', (t) => {
  t.is(LOOP_TOOLS.length, 1, 'a rejected fixture makes every test below weaker than it reads')
})

// Satisfies summarize_site's verb contract. A payload that does not is reported as a contract
// breach and the call counts as failed, which quietly changes the path every test below takes.
const LOOP_MCP = { callTool: async () => ({ text: '{"summary":"15 miners.","totals":{"devices":{"total":15}}}', isError: false }) }

// Streams `texts[step]` per step and returns `generated` from the non-streaming call the
// step-exhaustion path makes.
function scriptedModel (texts, generated = texts.at(-1)) {
  let step = 0
  return new MockLanguageModelV3({
    doStream: async () => ({
      stream: convertArrayToReadableStream([
        { type: 'text-start', id: '0' },
        { type: 'text-delta', id: '0', delta: texts[Math.min(step++, texts.length - 1)] },
        { type: 'text-end', id: '0' },
        { type: 'finish', finishReason: { unified: 'stop' }, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } }
      ])
    }),
    doGenerate: async () => ({
      content: [{ type: 'text', text: generated }],
      finishReason: { unified: 'stop' },
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      warnings: []
    })
  })
}

async function collect (model, { maxSteps = 3 } = {}) {
  const events = []
  const loop = runToolLoop({
    model,
    system: 'charter',
    messages: [{ role: 'user', content: 'how is the site?' }],
    tools: LOOP_TOOLS,
    mcp: LOOP_MCP,
    maxSteps
  })
  for await (const ev of loop) events.push(ev)
  return events
}

const terminals = (events) => events.filter((e) => e.type === EVENT.DONE || e.type === EVENT.ERROR)
const spoken = (events) => events.filter((e) => e.type === EVENT.TOKEN).map((e) => e.text).join('')

test('step exhaustion never shows the operator JSON', async (t) => {
  // The model calls a tool on every step and answers the final prompt with JSON too.
  const call = '{"tool":"summarize_site","args":{}}'
  const events = await collect(scriptedModel([call], '{"tool":"act_device","args":{"ref":"container-1"}}'), { maxSteps: 2 })

  const text = spoken(events)
  t.absent(text.includes('{'), 'no JSON reached the operator')
  t.absent(/tool/i.test(text), 'and no tool is named')
  t.ok(text.length > 0, 'something plain-English was said instead')
  t.is(terminals(events).length, 1, 'exactly one terminal event')
  t.is(terminals(events)[0].type, EVENT.DONE)
  t.is(events.at(-1).type, EVENT.DONE, 'and it is last')
})

test('an unparseable tool call never shows the operator JSON', async (t) => {
  // Opens like a call but never balances, so the repair budget is spent and the loop gives up.
  const events = await collect(scriptedModel(['{"tool": "act_device", "args": {"ref":']), { maxSteps: 5 })

  const text = spoken(events)
  t.absent(text.includes('{'), 'the malformed object is withheld')
  t.absent(text.includes('act_device'), 'and so is the tool name')
  t.is(terminals(events).length, 1, 'exactly one terminal event')
  t.is(events.at(-1).type, EVENT.DONE, 'and it is last')
})

test('a plain prose answer is passed through untouched', async (t) => {
  const events = await collect(scriptedModel(['The site is healthy: 15 miners hashing.']))

  t.is(spoken(events), 'The site is healthy: 15 miners hashing.')
  t.is(terminals(events).length, 1, 'exactly one terminal event')
  t.is(events.at(-1).type, EVENT.DONE, 'and it is last')
})

test('buildToolSystem returns the charter unchanged when there are no tools', (t) => {
  t.is(buildToolSystem('CHARTER', []), 'CHARTER')
})

test('buildToolSystem wraps the rendered contract with the calling instructions', (t) => {
  const [tool] = admitTools([{
    name: 'list_devices',
    description: 'Which devices, by family and state.',
    inputSchema: {
      type: 'object',
      properties: {
        family: { type: 'string', enum: AXIS.family, default: 'all' },
        state: { type: 'string', enum: AXIS.state, default: 'all' }
      }
    },
    annotations: { readOnlyHint: true },
    _meta: {
      [AGENT_META_KEY]: {
        enabled: true,
        answers: 'Which devices, by family and state.',
        useWhen: ['list the miners', 'what is offline'],
        notFor: ['counting them (use count_devices)'],
        returns: 'the matching devices with a one-line summary',
        minCapability: CAPABILITY.SMALL,
        contract: TOOL_CONTRACT_VERSION
      }
    }
  }]).admitted

  const out = buildToolSystem('CHARTER', [tool])
  t.ok(out.startsWith('CHARTER'), 'the charter stays the prefix')
  t.ok(out.includes(renderTools([tool])), 'the tool block comes from the contract renderer')
  t.ok(out.includes('{"tool": "<tool_name>", "args": { ... }}'), 'the call format is stated')
  t.ok(out.includes('use one of those values exactly'), 'and the enum instruction is value-neutral')
})

// ── a failed tool call must not cost the operator their answer ───────────────

test('rejectedArguments tells "you called it wrong" from "the backend is down"', (t) => {
  t.ok(rejectedArguments('MCP error -32602: Input validation error: Invalid arguments for tool get_device'))
  t.ok(rejectedArguments('invalid_enum_value: expected one of telemetry, state; received power_mode'))
  t.absent(rejectedArguments('Error: fetch failed ECONNREFUSED'))
  t.absent(rejectedArguments('CHANNEL_DESTROYED'))
  t.absent(rejectedArguments(''), 'nothing is not a rejection')
})

// These assert what the loop SAYS TO THE MODEL after a failure, not what the model then
// replies. A scripted mock ignores the conversation, so asserting on its answer would pass
// whatever the loop did — which is how the first version of these tests passed against a
// deliberately broken build.
function recordingModel (texts) {
  const prompts = []
  let step = 0
  const model = new MockLanguageModelV3({
    doStream: async (opts) => {
      prompts.push(JSON.stringify(opts.prompt))
      const text = texts[Math.min(step++, texts.length - 1)]
      return {
        stream: convertArrayToReadableStream([
          { type: 'text-start', id: '0' },
          { type: 'text-delta', id: '0', delta: text },
          { type: 'text-end', id: '0' },
          { type: 'finish', finishReason: { unified: 'stop' }, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } }
        ])
      }
    }
  })
  // What the model was told just before its last reply.
  return { model, coaching: () => prompts.at(-1) ?? '' }
}

const drain = async (loop) => {
  const events = []
  for await (const ev of loop) events.push(ev)
  return events
}

// The exact shape seen at the CLI: rank_devices answers the question, then an incidental
// get_device is rejected. The turn used to report that failed lookup as unavailable and never
// answer what was asked.
test('a failed follow-up does not discard an answer already in hand', async (t) => {
  const mcp = {
    callTool: async (name) => (name === 'rank_devices'
      ? { text: '{"summary":"Highest temperature: avalon-0 (36)."}', isError: false }
      : { text: 'CHANNEL_DESTROYED', isError: true })
  }
  const { model, coaching } = recordingModel([
    '{"tool":"rank_devices","args":{"family":"miner","metric":"temperature"}}',
    '{"tool":"get_device","args":{"ref":"avalon-0","attr":"state"}}',
    'The hottest miner is avalon-0 at 36C.'
  ])

  await drain(runToolLoop({ model, system: 'C', messages: [{ role: 'user', content: 'which is the hottest miner?' }], tools: LOOP_TOOLS, mcp, maxSteps: 4 }))

  t.ok(/ORIGINAL question/.test(coaching()), 'it is told to answer what was actually asked')
  t.absent(/unavailable right now/.test(coaching()), 'and not to report the fleet data as missing')
})

// A rejected argument is the model's mistake and the model can fix it. Treating it as a failure
// makes the operator absorb an error that never needed to reach them.
test('a rejected argument is handed back as a correction, not an apology', async (t) => {
  const seen = []
  const mcp = {
    callTool: async (name, args) => {
      seen.push(args.attr)
      return args.attr === 'power_modes'
        ? { text: '{"summary":"Power modes of avalon-0.","value":["eco"]}', isError: false }
        : { text: 'MCP error -32602: Input validation error: Invalid arguments for tool get_device', isError: true }
    }
  }
  const { model, coaching } = recordingModel([
    '{"tool":"get_device","args":{"ref":"avalon-0","attr":"power_mode"}}',
    '{"tool":"get_device","args":{"ref":"avalon-0","attr":"power_modes"}}',
    'avalon-0 supports eco.'
  ])

  await drain(runToolLoop({ model, system: 'C', messages: [{ role: 'user', content: 'what power modes does avalon-0 support?' }], tools: LOOP_TOOLS, mcp, maxSteps: 4 }))

  t.alike(seen, ['power_mode', 'power_modes'], 'the retry used a valid value')
  t.ok(/Power modes of avalon-0/.test(coaching()), 'and the result it was after reached the model')
})

test('the correction names the rejection and keeps it away from the operator', async (t) => {
  const mcp = { callTool: async () => ({ text: 'MCP error -32602: Input validation error: expected one of telemetry, state', isError: true }) }
  const { model, coaching } = recordingModel([
    '{"tool":"get_device","args":{"ref":"avalon-0","attr":"power_mode"}}',
    'avalon-0 is running normally.'
  ])

  await drain(runToolLoop({ model, system: 'C', messages: [{ role: 'user', content: 'how is avalon-0?' }], tools: LOOP_TOOLS, mcp, maxSteps: 4 }))

  t.ok(/REJECTED because an argument was not valid/.test(coaching()), 'the model is told what it got wrong')
  t.ok(/expected one of telemetry, state/.test(coaching()), 'including the server\'s own reason')
  t.ok(/not their problem/.test(coaching()), 'and told to keep it away from the operator')
})

// With nothing to fall back on, the old behaviour is still the right one.
test('a first-and-only tool failure is still reported as unavailable', async (t) => {
  const mcp = { callTool: async () => ({ text: 'CHANNEL_DESTROYED', isError: true }) }
  const { model, coaching } = recordingModel([
    '{"tool":"rank_devices","args":{"family":"miner","metric":"temperature"}}',
    'That live data is unavailable right now — please try again shortly.'
  ])

  const events = await drain(runToolLoop({ model, system: 'C', messages: [{ role: 'user', content: 'hottest miner?' }], tools: LOOP_TOOLS, mcp, maxSteps: 4 }))

  t.ok(/unavailable right now/.test(coaching()), 'the operator is told, because there is nothing else to say')
  t.absent(/CHANNEL_DESTROYED/.test(events.find((e) => e.type === EVENT.DONE).text), 'but never the raw error')
})

// ── the turn gives up on a model that stops answering ────────────────────────
// Nothing bounded a request until a batch run stopped dead on one that never came back. The
// server was healthy and answering everything else; one stream simply stalled.

// What an operator was actually shown: "I apologize.\n\nsummarize_site was called. 12 workers and
// 68 devices are online." The lead is ordinary prose, so the anchored `attemptedTool` check passed
// it and the tool name rode out mid-sentence, against the charter's rule that tools are never
// mentioned.
test('a finished answer that names a tool never reaches the operator', (t) => {
  const tools = ['summarize_site', 'count_devices', 'get_device']

  t.ok(mentionsATool('I apologize.\n\nsummarize_site was called. 12 workers and 68 devices are online.', tools),
    'caught wherever in the answer it surfaced, not only at the lead')
  t.ok(mentionsATool('get_device', tools), 'and a bare name is still a leak')

  t.absent(mentionsATool('Two workers and two devices are online.', tools))
  t.absent(mentionsATool('demo-miner-a-0 is running at 68 °C.', tools),
    'a device id that reads like an identifier is not a tool name')
  t.absent(mentionsATool('The site has 30 miners, 2 pools and 4 sensors.', tools))
  t.absent(mentionsATool('I cannot work that out — I do not have cost figures.', tools))
  t.absent(mentionsATool('anything', []), 'and with no tools there is nothing to leak')
})

// A model nudged back onto the JSON format sometimes restates the nudge at the operator instead
// of following it: "I understand. Please provide your request as a JSON object or a plain text
// answer." That is the prompt's plumbing, handed to someone who asked about their fleet.
test('an answer that restates the prompt is not shown to the operator', (t) => {
  t.ok(leaksScaffolding('I understand. Please provide your request as a JSON object or a plain text answer.'))
  t.ok(leaksScaffolding('Reply with a valid JSON object.'))
  t.ok(leaksScaffolding('That was not a tool call.'))

  t.absent(leaksScaffolding('demo-miner-a-0 is running at 61.9 degrees.'))
  t.absent(leaksScaffolding('This site has 1 worker and 2 devices: 2 devices online, no devices offline.'))
  t.absent(leaksScaffolding('I cannot work out the total power cost.'))
  t.absent(leaksScaffolding('I act on one device at a time — which one?'))
})

test('describeCallError names a deadline as a deadline', (t) => {
  t.is(describeCallError({ name: 'TimeoutError', message: 'The operation was aborted due to timeout' }, 120000),
    'the model did not respond within 120s')
  t.is(describeCallError({ name: 'AbortError', message: 'aborted' }, 5000),
    'the model did not respond within 5s')
})

// An operator running a site read "AI_RetryError: Failed after 3 attempts. Last error: Cannot
// connect to API: connect ECONNREFUSED 127.0.0.1:11434" on the panel. Every word of that is for
// whoever wired the provider up; none of it is actionable by whoever is on shift, and passing a
// provider's message through is what put a loopback port in front of them.
test('describeCallError says what failed without quoting the provider at the operator', (t) => {
  const unreachable = describeCallError(
    new Error('AI_RetryError: Failed after 3 attempts. Last error: Cannot connect to API: connect ECONNREFUSED 127.0.0.1:11434'),
    120000)
  t.is(unreachable, 'the assistant could not reach its model')
  t.absent(/ECONNREFUSED|127\.0\.0\.1|11434|AI_RetryError/.test(unreachable), 'and leaks no address, port or library name')

  t.is(describeCallError(new Error('terminated'), 120000), 'the assistant could not reach its model',
    'undici\'s word for a dropped connection is not an explanation')
  t.is(describeCallError(new Error('401 Unauthorized: invalid api key'), 120000),
    'the assistant was refused access to its model')
  t.is(describeCallError(new Error('429 Too Many Requests'), 120000), 'the model is busy right now')
  t.is(describeCallError(new Error('model "gemma3:4b" not found, try pulling it first'), 120000),
    'the configured model is not available')
  t.is(describeCallError(new Error('502 Bad Gateway'), 120000), 'the model service failed')

  // An unrecognised failure claims nothing about why, rather than reaching for the raw text.
  t.is(describeCallError(new Error('malloc: *** error for object 0x600003a1c0'), 120000),
    'the assistant could not complete that request')
})

test('a model that never answers fails the turn instead of hanging it', async (t) => {
  // Never answers, and gives up only when aborted — what a real provider does, since the
  // deadline reaches it through fetch. The pending timer matters: AbortSignal.timeout uses an
  // unref'd timer, so it fires only while something else holds the event loop open. In
  // production that is the open socket; without one here Node would simply exit.
  const model = new MockLanguageModelV3({
    doStream: ({ abortSignal }) => new Promise((resolve, reject) => {
      const inFlight = setTimeout(() => resolve({ stream: convertArrayToReadableStream([]) }), 60_000)
      abortSignal?.addEventListener('abort', () => {
        clearTimeout(inFlight)
        reject(abortSignal.reason ?? new Error('aborted'))
      })
    })
  })

  const events = await drain(runToolLoop({
    model,
    system: 'C',
    messages: [{ role: 'user', content: 'how many miners?' }],
    tools: LOOP_TOOLS,
    mcp: LOOP_MCP,
    requestTimeoutMs: 300
  }))

  const err = events.find((e) => e.type === EVENT.ERROR)
  t.ok(err, 'the turn ends')
  t.ok(/did not respond within/.test(err.error), 'saying what happened, in seconds')
  // Contract invariant 1: error is terminal, and a turn never emits two terminal events.
  t.absent(events.some((e) => e.type === EVENT.DONE), 'and does not also claim to be done')
})

// A turn may legitimately take several calls; the budget is per call, so a slow-but-working
// turn is not cut off just for having done more than one thing.
test('the deadline is per call, not per turn', async (t) => {
  let calls = 0
  const signals = new Set()
  const model = new MockLanguageModelV3({
    doStream: async ({ abortSignal }) => {
      calls++
      // The signals themselves, not the clock. The previous version slept 120ms twice against a
      // 250ms budget and called that "longer than both together" — hoisting the deadline to one
      // per turn left it green, so the property it is named for went unmeasured.
      signals.add(abortSignal)
      await new Promise((resolve) => setTimeout(resolve, 120))
      const text = calls === 1 ? '{"tool":"summarize_site","args":{}}' : 'There are 15 miners.'
      return {
        stream: convertArrayToReadableStream([
          { type: 'text-start', id: '0' },
          { type: 'text-delta', id: '0', delta: text },
          { type: 'text-end', id: '0' },
          { type: 'finish', finishReason: { unified: 'stop' }, usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } }
        ])
      }
    }
  })

  const events = await drain(runToolLoop({
    model,
    system: 'C',
    messages: [{ role: 'user', content: 'how many miners?' }],
    tools: LOOP_TOOLS,
    mcp: LOOP_MCP,
    requestTimeoutMs: 250 // each call sleeps 120ms, so both together exceed it and neither alone does
  }))

  t.is(calls, 2, 'both calls were made')
  t.is(signals.size, 2, 'each call got a deadline of its own, not one shared across the turn')
  t.absent(events.some((e) => e.type === EVENT.ERROR), 'and neither was cut off')
  t.ok(/15 miners/.test(events.find((e) => e.type === EVENT.DONE).text))
})
const contractTool = (name) => admitTools([{
  name,
  description: 'x',
  inputSchema: { type: 'object', properties: {} },
  annotations: { readOnlyHint: true },
  _meta: {
    [AGENT_META_KEY]: {
      enabled: true,
      answers: 'x',
      useWhen: ['a', 'b'],
      returns: 'x',
      minCapability: CAPABILITY.SMALL,
      contract: TOOL_CONTRACT_VERSION
    }
  }
}]).admitted[0]

test('a result that breaks its verb contract is caught before the model sees it', (t) => {
  const tool = contractTool('list_devices')

  t.ok(/count \(9\) disagrees/.test(contractViolation(tool, '{"summary":"x","count":9,"total":9,"items":[]}')),
    'count must equal what was listed')
  t.ok(/exceeds total/.test(contractViolation(tool, '{"summary":"x","count":2,"total":1,"items":[{"a":1},{"a":2}]}')),
    'and cannot exceed what matched')
  t.is(contractViolation(tool, '{"summary":"two","count":2,"total":9,"items":[{"a":1},{"a":2}]}'), null,
    'a truncated list is fine when it says so')
})

// Enforcement folds the breach into the text and marks the call failed, which is exactly what
// an infrastructure error looks like. Without the reason on the event, a report cannot tell the
// two apart, and every enforced violation is counted as none.
test('an enforced violation is named on the event, not only in the text', async (t) => {
  const { admitted: [tool] } = admitTools([{
    name: 'count_devices',
    description: 'How many devices.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    _meta: {
      [AGENT_META_KEY]: {
        enabled: true,
        answers: 'How many devices.',
        useWhen: ['how many miners', 'device count'],
        returns: 'a count',
        minCapability: CAPABILITY.SMALL,
        contract: TOOL_CONTRACT_VERSION
      }
    }
  }])

  const events = []
  const loop = runToolLoop({
    model: scriptedModel(['{"tool":"count_devices","args":{}}', 'There are 15.']),
    system: 'charter',
    messages: [{ role: 'user', content: 'how many miners?' }],
    tools: [tool],
    mcp: { callTool: async () => ({ text: '{"summary":"15 miners."}', isError: false }) },
    maxSteps: 3
  })
  for await (const ev of loop) events.push(ev)

  const result = events.find((e) => e.type === EVENT.TOOL_RESULT)
  t.ok(result.isError, 'the call is failed, so the model is told to stop')
  t.ok(/missing "count"/.test(result.contractViolation ?? ''), 'and the reason is readable without parsing the text')
})

test('a well-formed result carries no violation marker', async (t) => {
  const events = await collect(scriptedModel(['{"tool":"summarize_site","args":{}}', 'All good.']))
  const result = events.find((e) => e.type === EVENT.TOOL_RESULT)

  t.is(result.contractViolation, undefined, 'the field is absent rather than null on a clean call')
})

// Asked "is the site healthy", the model answered "is the site healthy?" — the operator's own
// words returned as the answer, after the tool had run and the data was in hand.
test('the question handed back is not an answer', (t) => {
  t.ok(echoesQuestion('is the site healthy?', 'is the site healthy'), 'punctuation and case do not matter')
  t.ok(echoesQuestion('is the site', 'is the site healthy'), 'a partial echo is caught before it is streamed')
  t.absent(echoesQuestion('the site is healthy: 25 of 26 online', 'is the site healthy'),
    'a real answer that reuses the question words is not an echo')
  // Told "You already made that exact call", the model said "I already made that exact call" and
  // read this loop's own instruction out to the operator. Who the sentence is about does not
  // change whose sentence it is.
  t.ok(echoesQuestion('I already made that exact call this turn', 'You already made that exact call this turn'),
    'a swapped pronoun is still the same sentence coming back')
  t.absent(echoesQuestion('', 'is the site healthy'))
  t.absent(echoesQuestion('is the site healthy', ''), 'with no question there is nothing to echo')
})

// collect() asks "how is the site?", so this is the model answering with exactly that.
test('an answer that is only the question is never shown, and is asked again', async (t) => {
  const events = await collect(scriptedModel(['How is the site?', 'The site is healthy.']))

  t.absent(/how is the site/i.test(spoken(events)), 'the echo never reached the operator')
  t.ok(/site is healthy/.test(events.find((e) => e.type === EVENT.DONE).text), 'and the retry answered')
})

// 1,500 live turns produced 0.34 tool calls each: asked something it had already been asked, the
// model answered from its own previous reply. Those figures were right when fetched and merely
// plausible when spoken, and nothing told the operator which they had.
test('a figure with no tool call this turn is refused, and the tool asked instead', async (t) => {
  const model = scriptedModel([
    'There are 15 miners, all healthy.', // ungrounded: a figure, and no tool ran
    '{"tool":"summarize_site","args":{}}', // the retry drives it to the tool
    'The site is healthy: 15 miners reporting.'
  ])
  const events = []
  for await (const ev of runToolLoop({
    model, system: 'charter', messages: [{ role: 'user', content: 'how is the site?' }], tools: LOOP_TOOLS, mcp: LOOP_MCP, maxSteps: 4
  })) events.push(ev)

  t.ok(events.some((e) => e.type === EVENT.TOOL_CALL), 'the ungrounded figure was refused and the tool called')
  t.absent(/all healthy/.test(spoken(events)), 'and the remembered figure never reached the operator')
  t.ok(/15 miners reporting/.test(events.find((e) => e.type === EVENT.DONE).text), 'the grounded answer landed')
})

// An operator asked "list the devices please" and was given ten devices that do not exist —
// antminer-311, container-1, powermeter-1-worker and so on, assembled out of the prompt's own
// family vocabulary, with no tool call behind any of them. The figures check could not see it: it
// strips id-shaped tokens before looking for digits, and that answer was nothing but ids.
test('devices named with no tool call this turn are refused, and the tool asked instead', async (t) => {
  const model = scriptedModel([
    'antminer-311, container-1, powermeter-1-worker, pool-1', // ungrounded: ids, no tool, no figure
    '{"tool":"list_devices","args":{}}', // the retry drives it to the tool
    'demo-miner-a-0 and demo-miner-a-1.'
  ])
  const events = []
  for await (const ev of runToolLoop({
    model, system: 'charter', messages: [{ role: 'user', content: 'list the devices please' }], tools: LOOP_TOOLS, mcp: LOOP_MCP, maxSteps: 4
  })) events.push(ev)

  t.ok(events.some((e) => e.type === EVENT.TOOL_CALL), 'the invented list was refused and the tool called')
  t.absent(/antminer-311|powermeter-1-worker/.test(spoken(events)), 'and no invented device reached the operator')
})

// A device the operator themselves named is not an invention, and asking them to confirm it is a
// legitimate answer with no tool behind it — the write path depends on being able to ask.
test('a device the operator named may be repeated back without a tool call', async (t) => {
  const events = []
  for await (const ev of runToolLoop({
    model: scriptedModel(['Do you want me to reboot demo-miner-a-0?']),
    system: 'charter',
    messages: [{ role: 'user', content: 'reboot demo-miner-a-0' }],
    tools: LOOP_TOOLS,
    mcp: LOOP_MCP,
    maxSteps: 3
  })) events.push(ev)

  t.absent(events.some((e) => e.type === EVENT.TOOL_CALL), 'no tool was forced')
  t.ok(/demo-miner-a-0/.test(events.find((e) => e.type === EVENT.DONE).text), 'and the question reached the operator')
})

// The counterpart: a decline, a greeting or a question back carries no figure, and must not be
// held hostage to a tool call that has nothing to answer.
test('an answer with no figure needs no tool call', async (t) => {
  const events = await collect(scriptedModel(['I cannot forecast prices.']))

  t.absent(events.some((e) => e.type === EVENT.TOOL_CALL), 'nothing was called')
  t.is(events.find((e) => e.type === EVENT.DONE).text, 'I cannot forecast prices.')
})

// Alternating between two tools that never had the answer cost six calls and sixty-one seconds.
test('the same call is not made twice in one turn', async (t) => {
  let calls = 0
  const mcp = { callTool: async () => { calls++; return { text: '{"miners":15}', isError: false } } }
  const loop = runToolLoop({
    model: scriptedModel(['{"tool":"summarize_site","args":{}}', '{"tool":"summarize_site","args":{}}'], 'Fifteen miners.'),
    system: 'C',
    messages: [{ role: 'user', content: 'how many miners?' }],
    tools: LOOP_TOOLS,
    mcp,
    maxSteps: 5
  })
  const events = []
  for await (const ev of loop) events.push(ev)

  t.is(calls, 1, 'the repeat was refused rather than executed')
  t.ok(events.find((e) => e.type === EVENT.DONE), 'and the turn still ended in an answer')
})

test('only a tool that declares the contract is judged by it', (t) => {
  const legacy = { name: 'summarize_site' } // no agent metadata
  t.is(contractViolation(legacy, '{"miners":15}'), null, 'a legacy tool passes untouched')
  t.is(contractViolation(undefined, '{"anything":1}'), null, 'and so does one we know nothing about')

  const tool = contractTool('get_device')
  t.is(contractViolation(tool, 'plain prose, not JSON'), null, 'prose is not a contract breach')
  t.is(contractViolation(tool, '[1,2,3]'), null, 'nor is a bare array')
})
