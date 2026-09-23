import test from 'brittle'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { levelOf, byCase, rollup, gate, coverage, UNRANKED } from '../../src/analyse.js'

const difficulty = JSON.parse(readFileSync(fileURLToPath(new URL('../../eval/difficulty.json', import.meta.url)), 'utf8'))

const result = (over = {}) => ({ id: 'c1', tags: ['plain'], ok: true, routed: 'count_devices', expected: ['count_devices'], ...over })

test('a case is placed once, by its hardest feature', (t) => {
  t.alike(levelOf(['count', 'plain'], difficulty), { axis: 'comprehension', level: 'L1' })
  t.alike(levelOf(['count', 'jargon'], difficulty), { axis: 'comprehension', level: 'L2' })
  t.alike(levelOf(['plain', 'typo'], difficulty), { axis: 'comprehension', level: 'L3' }, 'the harder tag wins')
  t.alike(levelOf(['plain', 'typo', 'negation'], difficulty), { axis: 'comprehension', level: 'L4' })
})

test('honesty outranks comprehension, so a refusal is never scored as phrasing', (t) => {
  t.alike(levelOf(['decline', 'plain'], difficulty), { axis: 'honesty', level: 'H1' })
  t.alike(levelOf(['trap', 'negation'], difficulty), { axis: 'honesty', level: 'H2' }, 'an L4 tag does not pull it onto the ladder')
})

// The ladder is ordered by the number in the key. A lexicographic sort puts L10 below L2, so
// the hardest rung would stop being found the day someone adds one.
test('a level ladder is ordered numerically, not lexicographically', (t) => {
  const deep = {
    axes: {
      comprehension: {
        levels: {
          L2: { tags: ['jargon'] },
          L9: { tags: ['negation'] },
          L10: { tags: ['injection'] }
        }
      }
    }
  }
  t.alike(levelOf(['jargon', 'negation'], deep), { axis: 'comprehension', level: 'L9' })
  t.alike(levelOf(['jargon', 'injection'], deep), { axis: 'comprehension', level: 'L10' }, 'L10 outranks L2')
  t.alike(levelOf(['negation', 'injection'], deep), { axis: 'comprehension', level: 'L10' }, 'and outranks L9')
})

test('an unranked case is named, not silently dropped', (t) => {
  t.alike(levelOf(['count'], difficulty), { axis: UNRANKED, level: UNRANKED })
  t.alike(levelOf([], difficulty), { axis: UNRANKED, level: UNRANKED })
})

test('per-case rates are what a gate needs, not the total', (t) => {
  const rates = byCase([
    result({ id: 'a', ok: true }), result({ id: 'a', ok: true }), result({ id: 'a', ok: true }),
    result({ id: 'b', ok: true }), result({ id: 'b', ok: false }), result({ id: 'b', ok: false })
  ])
  t.alike(rates.a, { runs: 3, passed: 3, rate: 1 })
  t.alike(rates.b, { runs: 3, passed: 1, rate: 1 / 3 })
})

test('the curve counts every run once and carries its n', (t) => {
  const rows = rollup([
    result({ id: 'a', tags: ['plain'], ok: true }),
    result({ id: 'b', tags: ['plain'], ok: false }),
    result({ id: 'c', tags: ['jargon', 'plain'], ok: true }),
    result({ id: 'd', tags: ['decline'], ok: true })
  ], difficulty)

  t.is(rows.reduce((n, r) => n + r.runs, 0), 4, 'no run counted twice')
  const l1 = rows.find((r) => r.level === 'L1')
  t.alike({ runs: l1.runs, passed: l1.passed, cases: l1.cases }, { runs: 2, passed: 1, cases: 2 })
  t.is(rows.find((r) => r.level === 'L2').runs, 1, 'the jargon+plain case sits at L2 only')
  t.is(rows.find((r) => r.axis === 'honesty').runs, 1)
})

test('a gate ignores a wobble and catches a collapse', (t) => {
  const was = { steady: { rate: 1 }, wobble: { rate: 1 }, broke: { rate: 1 }, fixed: { rate: 0 } }
  const now = { steady: { rate: 1 }, wobble: { rate: 2 / 3 }, broke: { rate: 0 }, fixed: { rate: 1 } }
  const g = gate(was, now)

  t.absent(g.ok)
  t.alike(g.regressed.map((r) => r.id), ['broke'], 'a 3/3 to 2/3 wobble is not a regression')
  t.alike(g.improved.map((r) => r.id), ['fixed'])
  t.is(g.compared, 4)
})

test('a gate reports a changed question set instead of averaging over it', (t) => {
  const g = gate({ kept: { rate: 1 }, gone: { rate: 1 } }, { kept: { rate: 1 }, fresh: { rate: 1 } })
  t.alike(g.added, ['fresh'])
  t.alike(g.removed, ['gone'])
  t.is(g.compared, 1, 'only the cases present on both sides are compared')
  t.ok(g.ok, 'added and removed cases are not regressions')
})

test('coverage separates a missing tool from a failing one', (t) => {
  const rows = coverage([
    result({ id: 'x', expected: ['diagnose_site', '(none)'], routed: '(none)', ok: true }),
    result({ id: 'x', expected: ['diagnose_site', '(none)'], routed: '(none)', ok: true }),
    result({ id: 'y', expected: ['count_devices'], routed: 'count_devices', ok: true }),
    result({ id: 'z', expected: ['rank_devices'], routed: 'list_devices', ok: false })
  ])

  const diagnose = rows.find((r) => r.tool === 'diagnose_site')
  t.alike({ routed: diagnose.routed, declined: diagnose.declined, status: diagnose.status },
    { routed: 0, declined: 2, status: 'absent' }, 'declining every time means the tool is absent, not broken')
  t.is(rows.find((r) => r.tool === 'count_devices').status, 'present')
  t.is(rows.find((r) => r.tool === 'rank_devices').status, 'unrouted', 'a tool that was served but misrouted is not a coverage gap')
})
