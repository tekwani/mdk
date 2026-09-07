import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { EVENT } from './events.js'
import { VERB, validateToolResult } from './tools.js'
import { CHARTER, CHARTER_VERSION } from './charter.js'

/**
 * The eval battery: the questions an operator actually asks, each pinned to the tool that
 * should answer it and to what the answer must contain.
 *
 * A run scores five independent things, because they fail independently:
 *   routing  — did the model pick the right tool for the words used?
 *   answer   — did it relay the right value?
 *   contract — did the tool return the shape its verb promises? (see RESULT in tools.js)
 *   approval — was a write gated before it ran?
 *   target   — did it act on a device that exists, or on one it invented? (opt-in per case)
 *
 * Questions live in eval/battery.json, not here: they are data, they grow constantly, and
 * authoring one should not require reading JavaScript. Expectations are written in the small
 * grammar below and resolved against the live fleet at run time, so the battery travels to
 * any MDK site instead of encoding one demo's inventory.
 */

export const NO_TOOL = '(none)'

export const BATTERY_PATH = fileURLToPath(new URL('../eval/battery.json', import.meta.url))

/**
 * The ways a model says it will not answer.
 *
 * Too narrow marks a correct refusal wrong: "that information is not available" is a good
 * decline, and an early version scored it a failure — which would have sent someone tuning a
 * charter that was working.
 *
 * Too broad is worse, because it hides fabrication. A bare `is not` / `isn't` / `not have`
 * matches any confident negative statement, so "we are not profitable at the current price" —
 * an invented answer to a question no tool covers — scored as a model correctly declining.
 * The tool-call check catches most of those, but an answer made up with no tool call passed
 * both gates and counted as a pass.
 *
 * So: refusal is claimed in the first person, or stated as unavailability. A negative sentence
 * about the fleet is neither.
 */
const DECLINED = new RegExp([
  '\\b(?:i|we)\\s+(?:do not|don\'t|cannot|can\'t|have no|am unable|are unable|am not able|are not able)\\b',
  '\\bcannot\\b', '\\bcan\'t\\b', '\\bunable\\b',
  '\\bno tool\\b', '\\bnot available\\b', '\\bunavailable\\b', '\\bis\\s?n\'t available\\b',
  '\\bno (?:data|information|record|way|access)\\b',
  '\\bonly have\\b'
].join('|'), 'i')

const UNDER_TWENTY = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen'
]
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

/**
 * English for an integer below one hundred, or null.
 *
 * Stops at 99 on purpose: past that a model writes the digits, and "four hundred and
 * eighty-five" has too many spellings to be worth pinning. (exported for tests)
 */
export function spellNumber (n) {
  if (!Number.isInteger(n) || n < 0 || n > 99) return null
  if (n < 20) return UNDER_TWENTY[n]
  const tens = TENS[Math.floor(n / 10)]
  const unit = n % 10
  return unit === 0 ? tens : `${tens}-${UNDER_TWENTY[unit]}`
}

/**
 * Does the answer state this number — as a digit, or spelled out?
 *
 * Matching digits alone scored "There are two online miners" as a miss, which is a scorer
 * failure and not a model one: it accounted for 37 of 99 failures on a full battery run and
 * made count_devices read as the weakest tool in the set while it was answering correctly.
 * Prose is what we asked the model for, and prose spells small numbers out. (exported for tests)
 */
export function statesNumber (answer, value) {
  const text = String(answer ?? '')
  if (new RegExp(`\\b${value}\\b`).test(text)) return true
  const word = spellNumber(value)
  // "twenty-four" and "twenty four" are the same answer.
  return word !== null && new RegExp(`\\b${word.replace('-', '[- ]')}\\b`, 'i').test(text)
}

/**
 * A case this fleet cannot express — it asks about a value the site does not report. That is a
 * property of the site, not a mistake in the battery, so a run skips the case and names it
 * rather than aborting. An author error (an unknown expectation form) still throws.
 */
/**
 * Any number at all, digits or words — what `pattern: "\\d"` was reaching for.
 *
 * Used where a case wants "it stated a count" and the fleet exposes no probed value to check
 * it against (miners *online*, devices in an error state, a percentage). Weaker than `number`
 * on purpose; the alternative was a digit-only regex marking "Two miners are online" wrong.
 */
const ANY_NUMBER = new RegExp(
  `\\d|\\b(?:${[...UNDER_TWENTY, ...TENS.filter(Boolean)].join('|')})\\b`,
  'i'
)

const PROBE_UNAVAILABLE = 'PROBE_UNAVAILABLE'
function unavailable (message) {
  const err = new Error(message)
  err.code = PROBE_UNAVAILABLE
  return err
}

/**
 * Compile one expectation into a predicate against the probed fleet.
 *
 * The grammar is deliberately small; every form resolves to a fact about the site under test
 * rather than a literal, so a case cannot silently encode this demo's inventory:
 *
 *   { "number": "miners" }        the answer states truth.miners, in digits or spelled out
 *   { "anyNumber": true }         it states some number — for counts the probe cannot check
 *   { "anyId": "offlineIds" }     the answer names at least one of those ids
 *   { "allIds": "offlineIds" }    the answer names every one of them
 *   { "any": ["sleep","normal"] } any of these words, case-insensitive
 *   { "pattern": "\\d" }          a raw regular expression, for shapes the above cannot say
 *                                 (add "flags" to override the default "i")
 *   { "declined": true }          the model refused rather than answered
 *   { "anyOf": [ … ] }            at least one branch holds
 *   { "allOf": [ … ] }            every branch holds
 *   { "ifEmpty": "offlineIds", "then": …, "else": … }
 *                                 one expectation or the other, decided by the fleet — a yes/no
 *                                 question has two right answers and `anyOf` would accept both
 */
export function compileExpect (expr, truth, where = 'expect') {
  const pred = (test, describe) => ({ test, describe, toString: () => describe })

  if (!expr || typeof expr !== 'object') throw new Error(`${where}: expectation must be an object`)

  if (expr.anyOf || expr.allOf) {
    const branches = (expr.anyOf ?? expr.allOf).map((e, i) => compileExpect(e, truth, `${where}[${i}]`))
    if (!branches.length) throw new Error(`${where}: anyOf/allOf needs at least one branch`)
    const combine = expr.anyOf ? 'some' : 'every'
    return pred((a) => branches[combine]((b) => b.test(a)), `${expr.anyOf ? 'anyOf' : 'allOf'}(${branches.join(', ')})`)
  }

  if (expr.ifEmpty !== undefined) {
    const ids = truth[expr.ifEmpty]
    if (!Array.isArray(ids)) throw unavailable(`${where}: "${expr.ifEmpty}" is not a probed id list`)
    const short = truth.partial?.[expr.ifEmpty]
    if (short) throw unavailable(`${where}: "${expr.ifEmpty}" is only ${short.shown} of ${short.total}, so empty cannot be told from truncated`)
    if (!expr.then || !expr.else) throw new Error(`${where}: "ifEmpty" needs both "then" and "else"`)
    const whenEmpty = compileExpect(expr.then, truth, `${where}.then`)
    const whenNot = compileExpect(expr.else, truth, `${where}.else`)
    return ids.length === 0 ? whenEmpty : whenNot
  }

  if (expr.anyNumber === true) {
    return pred((a) => ANY_NUMBER.test(a), 'any number')
  }

  if (expr.number !== undefined) {
    const value = truth[expr.number]
    if (typeof value !== 'number') throw unavailable(`${where}: "${expr.number}" is not a probed number`)
    return pred((a) => statesNumber(a, value), `number ${expr.number}=${value}`)
  }

  if (expr.anyId !== undefined || expr.allIds !== undefined) {
    const key = expr.anyId ?? expr.allIds
    const ids = truth[key]
    if (!Array.isArray(ids)) throw unavailable(`${where}: "${key}" is not a probed id list`)
    const short = truth.partial?.[key]
    if (short) throw unavailable(`${where}: "${key}" is only ${short.shown} of ${short.total} on this fleet`)
    if (!ids.length) return pred(() => true, `${key} is empty on this fleet`)
    const combine = expr.anyId !== undefined ? 'some' : 'every'
    return pred(
      (a) => ids[combine]((id) => a.toLowerCase().includes(id.toLowerCase())),
      `${expr.anyId !== undefined ? 'anyId' : 'allIds'} ${key}=[${ids.join(',')}]`
    )
  }

  if (expr.any !== undefined) {
    if (!Array.isArray(expr.any) || !expr.any.length) throw new Error(`${where}: "any" needs a non-empty array`)
    const rx = new RegExp(expr.any.map((s) => {
      const value = String(s)
      const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return `${/^\w/.test(value) ? '\\b' : ''}${escaped}${/\w$/.test(value) ? '\\b' : ''}`
    }).join('|'), 'i')
    return pred((a) => rx.test(a), `any(${expr.any.join('|')})`)
  }

  if (expr.pattern !== undefined) {
    const rx = new RegExp(expr.pattern, expr.flags ?? 'i')
    return pred((a) => rx.test(a), `/${expr.pattern}/`)
  }

  if (expr.declined === true) return pred((a) => DECLINED.test(a), 'a refusal')

  throw new Error(`${where}: unrecognised expectation ${JSON.stringify(expr)}`)
}

/**
 * Find a `{placeholder}` left in an expectation.
 *
 * A placeholder is named; a regex quantifier is numeric. Matching `{\w+}` conflated them, so
 * `{"pattern": "\\d{2}"}` read as a stray placeholder and killed the whole run at startup over a
 * legitimate expectation. Requiring the braces to wrap a name keeps the guard — including inside
 * a `pattern`, where a real `{sampleMiner}` is just as wrong — while leaving `{2}` alone.
 *
 * @returns {string|null} the placeholder name, or null
 */
const PLACEHOLDER = /\{([A-Za-z_]\w*)\}/

function placeholderIn (value) {
  if (typeof value === 'string') return PLACEHOLDER.exec(value)?.[1] ?? null
  if (value && typeof value === 'object') {
    for (const inner of Object.values(value)) {
      const found = placeholderIn(inner)
      if (found) return found
    }
  }
  return null
}

/**
 * Read and validate the battery. A malformed case fails here rather than scoring as a model
 * failure halfway through a run.
 */
export function loadBattery (path = BATTERY_PATH) {
  const parsed = JSON.parse(readFileSync(path, 'utf8'))
  const cases = parsed.cases
  if (!Array.isArray(cases) || !cases.length) throw new Error(`${path}: "cases" must be a non-empty array`)

  const seen = new Set()
  for (const c of cases) {
    if (!c.id || typeof c.id !== 'string') throw new Error(`battery: every case needs a string id (near ${JSON.stringify(c).slice(0, 80)})`)
    if (seen.has(c.id)) throw new Error(`battery: duplicate case id "${c.id}"`)
    seen.add(c.id)
    if (Array.isArray(c.steps)) {
      if (c.q !== undefined) throw new Error(`battery[${c.id}]: a case has "q" or "steps", not both`)
      if (c.steps.length < 2) throw new Error(`battery[${c.id}]: "steps" needs at least two turns — one turn is a plain case`)
    } else if (!c.q || typeof c.q !== 'string') {
      throw new Error(`battery[${c.id}]: needs a question`)
    }
    for (const [i, step] of stepsOf(c).entries()) {
      const where = Array.isArray(c.steps) ? `${c.id} step ${i + 1}` : c.id
      if (!step.q || typeof step.q !== 'string') throw new Error(`battery[${where}]: needs a question`)
      if (step.tool === undefined) throw new Error(`battery[${where}]: needs a tool (or null to require a refusal)`)
    }
    for (const name of caseTools(c)) {
      if (name !== NO_TOOL && !/^[a-z]+_[a-z]+$/.test(name)) throw new Error(`battery[${c.id}]: "${name}" is not a taxonomy name`)
    }
    if (c.tags !== undefined && !Array.isArray(c.tags)) throw new Error(`battery[${c.id}]: tags must be an array`)
    for (const [i, step] of stepsOf(c).entries()) {
      const where = Array.isArray(c.steps) ? `${c.id} step ${i + 1}` : c.id
      if (!step.expect) throw new Error(`battery[${where}]: needs an expectation`)
      // Placeholders are substituted in the question only. One left in an expectation matches
      // its own braces and quietly weakens the case instead of failing it.
      const stray = placeholderIn(step.expect)
      if (stray) {
        throw new Error(`battery[${where}]: expectations cannot use placeholders like {${stray}} — use anyId/allIds against a probed list`)
      }
    }
  }
  return cases
}

// null in JSON means "no tool should be called"; NO_TOOL is the runtime spelling of that. It is
// allowed inside the array too, for questions where both answering and declining are defensible
// — writing that down beats pretending there is one right route.
function toolsOf (step) {
  const declared = step.tool === null ? [null] : [].concat(step.tool)
  return declared.map((name) => (name === null ? NO_TOOL : name))
}

/**
 * A case as a list of turns.
 *
 * Single-turn cases — the overwhelming majority — are written as `{ q, tool, expect }` and
 * normalised to one step here, so everything downstream handles one shape. A case that wants
 * conversation depth writes `steps: [{ q, tool, expect }, …]` instead, and every step runs
 * through the SAME session.
 */
export function stepsOf (testCase) {
  if (Array.isArray(testCase.steps)) return testCase.steps
  return [{ q: testCase.q, tool: testCase.tool, expect: testCase.expect, approval: testCase.approval, target: testCase.target }]
}

/** Every tool a case touches, across all its turns. Used for coverage, not for scoring. */
const caseTools = (testCase) => [...new Set(stepsOf(testCase).flatMap(toolsOf))]

export const isMultiTurn = (testCase) => Array.isArray(testCase.steps)

// The tool the question is actually about. Later entries are leniency in scoring — a route we
// will not fail — and crediting them too would let a tool bank the pass rate of cases another
// tool answered.
const primaryOf = (testCase) => toolsOf(stepsOf(testCase)[0])[0]

/**
 * Read the fleet's current shape through the tools themselves, so every expectation is a fact
 * about the site under test.
 */
export async function probeTruth (mcp) {
  const read = async (name, args) => {
    const { text, isError } = await mcp.callTool(name, args)
    if (isError) throw new Error(`probe: ${name} returned an error: ${text}`)
    let payload
    try {
      payload = JSON.parse(text)
    } catch {
      throw new Error(`probe: ${name} did not return JSON`)
    }
    const { ok, errors } = validateToolResult(name, payload)
    if (!ok) throw new Error(`probe: ${name} does not satisfy the result contract — ${errors.join('; ')}`)
    return payload
  }

  const site = await read('summarize_site', {})
  const counts = {}
  for (const family of ['miner', 'container', 'powermeter', 'sensor', 'pool']) {
    counts[family] = (await read('count_devices', { family, state: 'all' })).count
  }
  const offline = await read('list_devices', { family: 'all', state: 'offline' })
  const minerList = await read('list_devices', { family: 'miner', state: 'all' })
  const minersDown = await read('list_devices', { family: 'miner', state: 'offline' })
  const idOf = (i) => i.deviceId ?? i.id

  const partial = {}
  for (const [key, list] of [['offlineIds', offline], ['minerIds', minerList], ['minerOfflineIds', minersDown]]) {
    if (Number.isFinite(list.total) && list.total > list.items.length) {
      partial[key] = { shown: list.items.length, total: list.total }
    }
  }

  const truth = {
    workers: site.totals?.workers?.total,
    workersOnline: site.totals?.workers?.online,
    workersOffline: site.totals?.workers?.offline,
    devices: site.totals?.devices?.total,
    devicesOnline: site.totals?.devices?.online,
    devicesOffline: site.totals?.devices?.offline,
    miners: counts.miner,
    containers: counts.container,
    powermeters: counts.powermeter,
    sensors: counts.sensor,
    pools: counts.pool,
    offlineIds: offline.items.map(idOf),
    minerIds: minerList.items.map(idOf),
    minerOfflineIds: minersDown.items.map(idOf),
    minersOffline: minersDown.total ?? minersDown.count,
    partial
  }
  if (!truth.minerIds.length) throw new Error('probe: the site reports no miners; the battery needs at least one')
  truth.sampleMiner = truth.minerIds[0]
  truth.otherMiner = truth.minerIds[1] ?? truth.minerIds[0]
  return truth
}

/**
 * The cases a run will cover. Exported so the CLI can report the count without restating the
 * filter: two copies would let the header promise a different number than the run delivers.
 *
 * `null` means no filter. An empty string is not treated as one — it would match every id via
 * `includes('')`, which is the opposite of what a caller passing an unset variable wants, and
 * the CLI rejects it before it gets here.
 */
export function selectCases (cases = [], { only = null, tag = null } = {}) {
  return cases.filter((c) =>
    (only == null || c.id.includes(only)) &&
    (tag == null || (c.tags ?? []).includes(tag)))
}

/**
 * Admitted tools that no case exercises. A tool with no case is untested by construction, and
 * the battery drifts silently as the tool set grows — so a run reports this rather than
 * quietly scoring a smaller surface than the agent exposes.
 */
export function coverageGaps (tools = [], cases = loadBattery()) {
  const covered = new Set(cases.flatMap(caseTools))
  return tools.map((t) => t.name).filter((name) => !covered.has(name))
}

function checkResultContract (ev) {
  if (ev.contractViolation) return [`${ev.name}: ${ev.contractViolation}`]
  if (ev.isError) return [] // a tool reporting a failure is not a contract breach
  let payload
  try {
    payload = JSON.parse(ev.text)
  } catch {
    return [`${ev.name}: result is not JSON`]
  }
  const { ok, errors } = validateToolResult(ev.name, payload)
  return ok ? [] : errors.map((e) => `${ev.name}: ${e}`)
}

async function runOnce (agent, question) {
  const session = await agent.createSession()
  try {
    return await ask(session, question)
  } finally {
    // The battery never resumes a session, so keeping the record only holds a full run's
    // history in memory for as long as the run lasts — nothing expires inside twenty minutes
    // at a thirty-minute TTL.
    await agent.store?.delete(session.id)
  }
}

/**
 * Every question of a multi-turn case, through ONE session.
 *
 * This is the whole point of the shape: `runOnce` gives each question a fresh conversation,
 * which is the condition under which routing is at its best. Failures that only appear once
 * history has built up — a write that stops being gated on the third ask, a model imitating
 * its own earlier prose instead of calling a tool — are invisible to a battery that never
 * takes a second turn.
 */
async function runSequence (agent, questions) {
  const session = await agent.createSession()
  try {
    const runs = []
    for (const question of questions) runs.push(await ask(session, question))
    return runs
  } finally {
    await agent.store?.delete(session.id)
  }
}

// One question against an already-open session. Approvals are always rejected: an eval must
// never leave a write behind on the fleet it measures. The case still scores whether the gate
// fired.
async function ask (session, question) {
  const calls = []
  const violations = []
  let approvals = 0
  let answer = ''
  let error = null
  let rejected = false

  const iter = session.send(question)
  let sent
  for (;;) {
    const { value: ev, done } = await iter.next(sent)
    sent = undefined
    if (done) break
    if (ev.type === EVENT.TOOL_CALL) calls.push({ name: ev.name, args: ev.args })
    else if (ev.type === EVENT.TOKEN) answer += ev.text
    else if (ev.type === EVENT.ERROR) error = ev.error
    else if (ev.type === EVENT.TOOL_RESULT) {
      if (rejected) rejected = false
      else violations.push(...checkResultContract(ev))
    } else if (ev.type === EVENT.PENDING_APPROVAL) {
      approvals++
      rejected = true
      sent = false
    }
  }
  return { calls, answer: answer.trim(), violations, approvals, error, system: session.system }
}

/**
 * Did every call name a device the fleet actually has?
 *
 * Answers are scored against the fleet already; arguments were not, and that is where the
 * worst failure hides. Asked to "reboot the site" — which is not a device — the model invented
 * `site-worker` and tried to act on it. The gate held and the tool refused, so nothing
 * happened, but nothing in the battery could see it either: the runner rejects every approval,
 * so a write case never reaches the tool that would have said no.
 *
 * Opt-in per case via `"target": "deviceIds"`, because it only means anything where the case
 * knows the argument should name a real device. Checks every call, not the first: a turn that
 * reads correctly and then acts on a fabricated id is the shape worth catching.
 */
function targetIsReal (step, truth, run) {
  if (!step.target) return true
  const known = truth[step.target]
  if (!Array.isArray(known)) return true // the probe could not answer; not the model's fault
  const named = run.calls.map((c) => c.args?.ref).filter((ref) => typeof ref === 'string')
  return named.every((ref) => known.some((id) => id.toLowerCase() === ref.toLowerCase()))
}

function score (step, truth, run, label) {
  const expected = toolsOf(step)
  const routed = run.calls[0]?.name ?? NO_TOOL
  const pattern = compileExpect(step.expect, truth, label)

  const attemptedWrite = run.calls.some((c) => String(c.name).startsWith(`${VERB.ACT}_`))

  const checks = {
    route: expected.includes(routed),
    answer: pattern.test(run.answer),
    approval: (step.approval || attemptedWrite) ? run.approvals > 0 : true,
    contract: run.violations.length === 0,
    target: targetIsReal(step, truth, run)
  }
  return { routed, pattern: pattern.describe, checks, ok: !run.error && Object.values(checks).every(Boolean) }
}

function breakdown (results, keyOf) {
  const acc = {}
  for (const r of results) {
    for (const k of new Set(keyOf(r))) {
      acc[k] ??= { runs: 0, passed: 0 }
      acc[k].runs++
      if (r.ok) acc[k].passed++
    }
  }
  for (const v of Object.values(acc)) v.rate = Math.round((v.passed / v.runs) * 100)
  return acc
}

/**
 * Run the battery against a live agent and return a report.
 *
 * `onResult` is called with each scored run as it finishes, so a caller can stream progress;
 * the returned report is the artifact worth keeping.
 */
export async function runBattery ({ agent, mcp, cases = null, reps = 1, only = null, tag = null, concurrency = 1, onResult = () => {} } = {}) {
  if (!agent) throw new Error('runBattery needs an agent')
  if (!mcp) throw new Error('runBattery needs an mcp connection to probe the fleet')
  if (!Number.isFinite(concurrency) || concurrency < 1) throw new Error(`runBattery: concurrency must be at least 1, got ${concurrency}`)

  const all = cases ?? loadBattery()
  const truth = await probeTruth(mcp)
  const selected = selectCases(all, { only, tag })
  if (!selected.length) throw new Error(`no battery case matches ${only ? `"${only}"` : ''}${tag ? ` tag "${tag}"` : ''}`)

  const admitted = new Set((agent.tools ?? []).map((tool) => tool.name))

  const skipped = []
  const runnable = selected.filter((c) => {
    const permitted = toolsOf(c)
    const needs = permitted.filter((name) => name !== NO_TOOL)
    const mayDecline = permitted.length !== needs.length
    if (admitted.size && needs.length && !mayDecline && !needs.some((name) => admitted.has(name))) {
      const which = needs.length === 1 ? `${needs[0]} is` : `none of ${needs.join(', ')} is`
      skipped.push({ id: c.id, reason: `battery[${c.id}]: ${which} not admitted at this capability` })
      return false
    }
    try {
      for (const [i, step] of stepsOf(c).entries()) {
        compileExpect(step.expect, truth, `battery[${c.id}${isMultiTurn(c) ? ` step ${i + 1}` : ''}]`)
      }
      return true
    } catch (err) {
      if (err.code !== PROBE_UNAVAILABLE) throw err
      skipped.push({ id: c.id, reason: err.message })
      return false
    }
  })
  if (!runnable.length) throw new Error(`no battery case can run against this fleet (${skipped.length} skipped)`)

  // Every run is an independent session, so the only reason to go one at a time is to keep the
  // model server unloaded. Batching preserves output order regardless of completion order — a
  // report read by a human should not shuffle between runs.
  const resolve = (text, id) => text.replace(/\{(\w+)\}/g, (_, key) => {
    if (truth[key] === undefined) throw new Error(`battery[${id}]: "{${key}}" is not a probed value`)
    return truth[key]
  })
  const work = runnable.flatMap((testCase) => {
    const questions = stepsOf(testCase).map((step) => resolve(step.q, testCase.id))
    return Array.from({ length: reps }, (_, i) => ({ testCase, questions, rep: i + 1 }))
  })

  const results = new Array(work.length)
  const width = Math.min(Math.max(1, Math.floor(concurrency)), work.length)
  let next = 0

  const scoreOne = async ({ testCase, questions, rep }) => {
    const steps = stepsOf(testCase)
    const multi = isMultiTurn(testCase)
    const runs = multi ? await runSequence(agent, questions) : [await runOnce(agent, questions[0])]

    const turns = runs.map((run, i) => ({
      turn: i + 1,
      question: questions[i],
      expected: toolsOf(steps[i]),
      ...score(steps[i], truth, run, `battery[${testCase.id}${multi ? ` step ${i + 1}` : ''}]`),
      ...run
    }))

    // The turn a reader needs to see: the first that broke, or the last if none did. Reported
    // at the top level so a multi-turn case prints and aggregates exactly like a single-turn
    // one; `turns` carries the rest for anyone who wants it.
    const worst = turns.find((t) => !t.ok) ?? turns.at(-1)

    return {
      id: testCase.id,
      rep,
      primary: primaryOf(testCase),
      tags: testCase.tags ?? [],
      ...worst,
      ok: turns.every((t) => t.ok),
      ...(multi
        ? {
            turns,
            // Which turn it broke on is the whole signal of a multi-turn case: passing turn 1
            // and failing turn 3 is a different defect from failing outright.
            failedAtTurn: turns.findIndex((t) => !t.ok) + 1 || null,
            totalTurns: turns.length
          }
        : {})
    }
  }

  let emitted = 0
  const drain = () => {
    while (emitted < results.length && results[emitted] !== undefined) onResult(results[emitted++])
  }

  await Promise.all(Array.from({ length: width }, async () => {
    while (true) {
      const index = next++
      if (index >= work.length) return
      results[index] = await scoreOne(work[index])
      drain()
    }
  }))

  const sampleSystem = results[0]?.system ?? agent.system
  const usedCharter = (sampleSystem !== undefined && sampleSystem !== CHARTER) ? 'custom' : CHARTER_VERSION

  const failed = results.filter((r) => !r.ok)
  return {
    // Recorded here rather than read when the report is rendered: a score keeps its meaning only
    // if it carries the standing instruction it was taken under, and a report read back later
    // would otherwise be stamped with whatever the charter says by then. If the agent ran with a
    // custom system prompt, it is stamped as 'custom' rather than claiming standard CHARTER_VERSION.
    charter: usedCharter,
    truth,
    reps,
    cases: runnable.length,
    skipped,
    runs: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    flaky: [...new Set(failed.map((r) => r.id))].filter((id) => results.some((r) => r.id === id && r.ok)),
    byCheck: ['route', 'answer', 'approval', 'contract', 'target'].reduce((acc, check) => {
      acc[check] = results.filter((r) => r.checks[check] === false).length
      return acc
    }, {}),
    byTool: breakdown(results, (r) => [r.primary]),
    byTag: breakdown(results, (r) => r.tags),
    misroutes: failed.filter((r) => !r.checks.route)
      .reduce((acc, r) => { acc[r.routed] = (acc[r.routed] ?? 0) + 1; return acc }, {}),
    results
  }
}
