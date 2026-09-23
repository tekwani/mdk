import test from 'brittle'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { appendRun, writeRunFile } from '../../src/ledger.js'
import { buildManifest } from '../../src/manifest.js'

const SCRIPT = fileURLToPath(new URL('../../eval/analyse.mjs', import.meta.url))

/**
 * The readings are exercised as a spawned process rather than by importing them, because the
 * script is where the argument handling, the refusals and the exit codes live. A pure-function
 * test over `src/analyse.js` passes whether or not `--matrix` ever reaches it.
 */
function run (dir, args) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, ...args], {
      env: { ...process.env, MDK_EVAL_DIR: dir },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    return { code: 0, out: stdout }
  } catch (err) {
    return { code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` }
  }
}

const result = (id, tags, ok) => ({ id, tags, ok, routed: 'count_devices', expected: ['count_devices'] })

/** A ledger of two runs over the same question set, so a gate has something valid to compare. */
function fixture (t, { secondBatterySha = 'aaaa' } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'mdk-analyse-cli-'))
  t.teardown(() => rmSync(dir, { recursive: true, force: true }))
  mkdirSync(join(dir, 'runs'), { recursive: true })
  writeFileSync(join(dir, 'difficulty.json'), readFileSync(fileURLToPath(new URL('../../eval/difficulty.json', import.meta.url))))

  const ledger = join(dir, 'ledger.ndjson')
  const add = (runId, model, batterySha256, results) => {
    const manifest = buildManifest({
      batterySha256,
      agentCommit: 'abc1234',
      provider: { kind: 'qvac', model, baseURL: 'http://127.0.0.1:11500/v1' },
      capability: 'small',
      limits: { maxSteps: 6, maxOutputTokens: 2048 },
      reps: 1,
      startedAt: '2026-08-20T00:00:00.000Z',
      finishedAt: '2026-08-20T00:10:00.000Z'
    })
    const written = writeRunFile(join(dir, 'runs'), runId, { manifest, results })
    return appendRun(ledger, {
      runId,
      manifest,
      summary: { runs: results.length, passed: results.filter((r) => r.ok).length, flaky: [], skipped: [] },
      reportSha256: written.sha256
    })
  }

  add('run-one', 'qwen3-4b', 'aaaa', [
    result('plain-count', ['count', 'plain'], true),
    result('hard-negation', ['count', 'negation'], false),
    result('decline-cost', ['decline', 'cost'], true)
  ])
  add('run-two', 'qwen3-32b', secondBatterySha, [
    result('plain-count', ['count', 'plain'], true),
    result('hard-negation', ['count', 'negation'], true),
    result('decline-cost', ['decline', 'cost'], false)
  ])
  return dir
}

test('the listing names every recorded run', (t) => {
  const { code, out } = run(fixture(t), [])
  t.is(code, 0)
  t.ok(out.includes('run-one') && out.includes('run-two'))
})

test('verify passes on an untouched ledger and names the run it cannot trust', (t) => {
  const dir = fixture(t)
  t.is(run(dir, ['--verify']).code, 0, 'an intact chain exits zero')

  const path = join(dir, 'runs', 'run-two.json')
  const doctored = JSON.parse(readFileSync(path, 'utf8'))
  doctored.results[0].ok = false
  writeFileSync(path, `${JSON.stringify(doctored, null, 2)}\n`)

  const after = run(dir, ['--verify'])
  t.is(after.code, 1, 'an edited report is a non-zero exit')
  t.ok(after.out.includes('run-two'), 'and the run is named')
})

test('matrix refuses until it is told which runs to compare', (t) => {
  const dir = fixture(t)

  const none = run(dir, ['--matrix'])
  t.is(none.code, 1)
  t.ok(none.out.includes('--runs'), 'the refusal names the flag')

  const one = run(dir, ['--matrix', '--runs', 'run-one'])
  t.is(one.code, 1, 'one run is not a comparison')

  const both = run(dir, ['--matrix', '--runs', 'run-one,run-two'])
  t.is(both.code, 0)
  t.ok(both.out.includes('qwen3-4b') && both.out.includes('qwen3-32b'), 'both models appear as columns')
  t.ok(both.out.includes('comprehension/L1'), 'rows are difficulty levels')
})

test('an ambiguous run token is rejected rather than resolved', (t) => {
  const { code, out } = run(fixture(t), ['--matrix', '--runs', 'run-,run-two'])
  t.is(code, 1)
  t.ok(out.includes('matches 2 runs'), 'and every candidate is listed')
})

test('curve and coverage read a single named run', (t) => {
  const dir = fixture(t)

  const curve = run(dir, ['--curve', '--run', 'run-one'])
  t.is(curve.code, 0)
  t.ok(curve.out.includes('comprehension/L1'))

  const cov = run(dir, ['--coverage', '--run', 'run-one'])
  t.is(cov.code, 0)
  t.ok(cov.out.includes('count_devices'))
})

test('the gate reports a real regression and refuses a changed question set', (t) => {
  const dir = fixture(t)
  const g = run(dir, ['--gate', '--baseline', 'run-one', '--run', 'run-two'])
  t.is(g.code, 1, 'a degraded case is a non-zero exit')
  t.ok(g.out.includes('REGRESSED') && g.out.includes('decline-cost'))
  t.ok(g.out.includes('improved') && g.out.includes('hard-negation'))

  const moved = run(fixture(t, { secondBatterySha: 'bbbb' }), ['--gate', '--baseline', 'run-one', '--run', 'run-two'])
  t.is(moved.code, 1)
  t.ok(moved.out.includes('question set changed'), 'a different exam is refused, not scored')
})

test('an empty ledger says so instead of failing', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'mdk-analyse-empty-'))
  t.teardown(() => rmSync(dir, { recursive: true, force: true }))
  writeFileSync(join(dir, 'difficulty.json'), readFileSync(fileURLToPath(new URL('../../eval/difficulty.json', import.meta.url))))

  const { code, out } = run(dir, ['--matrix'])
  t.is(code, 0, 'nothing recorded yet is not an error')
  t.ok(out.includes('no runs recorded yet'))
})
