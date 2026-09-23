/**
 * The readings taken over stored runs.
 *
 * Collection needs a live model and a live fleet; analysis needs neither. Keeping the two apart
 * is what lets a comparison be re-read months later, against models that are no longer served,
 * without anything being re-run — and it is why none of these functions do I/O.
 *
 * Four readings, one set of runs:
 *   gate      did my change break a case that used to pass?   one model, two points in time
 *   matrix    which model answers more?                       many models, one question set
 *   curve     where does a model stop coping?                 pass rate by difficulty level
 *   coverage  what can we not answer at all?                  which cases only ever decline
 */

import { NO_TOOL } from './eval.js'

export const UNRANKED = 'other'

/**
 * Which difficulty bucket a case belongs to.
 *
 * A case carries several tags and would otherwise be counted in several buckets, which makes
 * the columns sum to more than the run. So it is placed once, by its hardest feature.
 *
 * Honesty outranks comprehension: the point of a `decline` case is the refusal, whatever the
 * phrasing around it. Ranking those on the comprehension ladder would also assert that a
 * stronger model refuses better, which is the assumption the ladder exists to test.
 *
 * @returns {{axis: string, level: string}}
 */
const rank = (level) => Number(String(level).replace(/[^0-9]/g, '')) || 0

export function levelOf (tags = [], difficulty) {
  const held = new Set(tags)
  for (const axis of ['honesty', 'comprehension']) {
    const levels = difficulty?.axes?.[axis]?.levels ?? {}
    // Hardest first, by the number in the key rather than the key itself: a lexicographic sort
    // puts L10 below L2, and the ladder would silently stop finding its own top rung.
    const hit = Object.keys(levels)
      .sort((a, b) => rank(b) - rank(a))
      .find((level) => (levels[level].tags ?? []).some((tag) => held.has(tag)))
    if (hit) return { axis, level: hit }
  }
  return { axis: UNRANKED, level: UNRANKED }
}

/**
 * Per-case pass counts, which is what a gate compares. The report's own totals cannot answer
 * "did this case regress" — ten cases breaking and ten others starting to pass leaves the
 * percentage untouched.
 *
 * @returns {Record<string, {runs: number, passed: number, rate: number}>}
 */
export function byCase (results = []) {
  const acc = {}
  for (const r of results) {
    acc[r.id] ??= { runs: 0, passed: 0, rate: 0 }
    acc[r.id].runs++
    if (r.ok) acc[r.id].passed++
  }
  for (const v of Object.values(acc)) v.rate = v.passed / v.runs
  return acc
}

/**
 * Pass rate by difficulty level — the curve.
 *
 * `n` travels with every rate. Some tags carry one case, and a rate over three runs reads
 * exactly like a rate over three hundred once it is a percentage on a slide.
 */
export function rollup (results = [], difficulty) {
  const acc = {}
  for (const r of results) {
    const { axis, level } = levelOf(r.tags, difficulty)
    const key = `${axis}:${level}`
    acc[key] ??= { axis, level, runs: 0, passed: 0, cases: new Set() }
    acc[key].runs++
    acc[key].cases.add(r.id)
    if (r.ok) acc[key].passed++
  }
  return Object.values(acc)
    .map((b) => ({ axis: b.axis, level: b.level, runs: b.runs, passed: b.passed, cases: b.cases.size, rate: b.passed / b.runs }))
    .sort((a, b) => (a.axis === b.axis ? a.level.localeCompare(b.level) : a.axis.localeCompare(b.axis)))
}

/**
 * Compare a run against a baseline, case by case.
 *
 * `tolerance` exists because the model is not deterministic: the same case, the same code, run
 * twice, does not always agree. Gating on exact equality would raise an alarm on every run. A
 * case counts as regressed only when it falls by more than the tolerance — by default from a
 * clean sweep to a minority of its repetitions.
 *
 * Cases present in one side and not the other are reported separately rather than scored. A
 * question set that changed underneath a gate is a different exam, and that is a fact the
 * caller must see, not silently average away.
 */
export function gate (baseline = {}, current = {}, { tolerance = 0.5 } = {}) {
  const regressed = []
  const improved = []
  for (const [id, was] of Object.entries(baseline)) {
    const now = current[id]
    if (!now) continue
    const delta = now.rate - was.rate
    if (delta <= -tolerance) regressed.push({ id, was: was.rate, now: now.rate })
    else if (delta >= tolerance) improved.push({ id, was: was.rate, now: now.rate })
  }
  const added = Object.keys(current).filter((id) => !baseline[id])
  const removed = Object.keys(baseline).filter((id) => !current[id])
  return {
    ok: regressed.length === 0,
    regressed: regressed.sort((a, b) => (a.now - a.was) - (b.now - b.was)),
    improved,
    added,
    removed,
    compared: Object.keys(baseline).filter((id) => current[id]).length
  }
}

/**
 * What the tool surface cannot answer.
 *
 * A case that only ever declines is not a failing case — it is a missing tool, and the two are
 * scored the same everywhere else. Grouping by the tool a case names turns a run of the tier
 * probe into the list of tools worth writing next.
 */
function statusOf ({ routed, declined, failed }) {
  if (routed > 0) return 'present'
  // Declining every time is a tool that was never served. Failing every time is a tool that
  // was, and the model went somewhere else — a routing defect wearing the same zero.
  if (declined > 0 && failed === 0) return 'absent'
  return 'unrouted'
}

export function coverage (results = []) {
  const acc = {}
  for (const r of results) {
    for (const name of r.expected ?? []) {
      if (name === NO_TOOL) continue
      acc[name] ??= { tool: name, runs: 0, routed: 0, declined: 0, failed: 0 }
      acc[name].runs++
      if (r.routed === name) acc[name].routed++
      else if (r.ok) acc[name].declined++
      else acc[name].failed++
    }
  }
  return Object.values(acc)
    .map((t) => ({ ...t, status: statusOf(t) }))
    .sort((a, b) => a.tool.localeCompare(b.tool))
}
