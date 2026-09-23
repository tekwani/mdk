// The four readings over runs already recorded. Needs no model, no fleet and no network — it
// reads eval/ledger.ndjson and the run files beside it, so a comparison stays readable long
// after the models that produced it have been unloaded.
//
//   node eval/analyse.mjs                          list the runs
//   node eval/analyse.mjs --verify                 check the chain and every report hash
//   node eval/analyse.mjs --matrix --runs <id>,<id>  named runs, by difficulty level
//   node eval/analyse.mjs --curve [--run <id>]     one run, by difficulty level
//   node eval/analyse.mjs --coverage [--run <id>]  which named tools ever answered
//   node eval/analyse.mjs --gate --baseline <id> [--run <id>]

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { parseArgs } from '../src/args.js'
import { sha256 } from '../src/manifest.js'
import { readChain, verifyChain } from '../src/ledger.js'
import { byCase, rollup, gate, coverage } from '../src/analyse.js'

// The ledger normally sits beside this script. MDK_EVAL_DIR points it at another one, which is
// what lets a test drive the real CLI over a fixture instead of over the operator's own history.
const HERE = process.env.MDK_EVAL_DIR ? `${resolve(process.env.MDK_EVAL_DIR)}/` : fileURLToPath(new URL('./', import.meta.url))
const LEDGER = join(HERE, 'ledger.ndjson')
const RUNS = join(HERE, 'runs')
const DIFFICULTY = JSON.parse(readFileSync(join(HERE, 'difficulty.json'), 'utf8'))

const args = parseArgs(process.argv.slice(2))
const arg = (name) => (typeof args[name] === 'string' ? args[name] : null)

const { rows, errors } = readChain(LEDGER)
if (errors.length) for (const e of errors) console.error(`  ledger: ${e}`)
if (!rows.length) {
  console.log('\n  no runs recorded yet — run the battery once with --eval\n')
  process.exit(0)
}

// The sequence number is part of the label because two runs of the same cell are otherwise
// indistinguishable in a column header, and comparing a run against itself reads as agreement.
const label = (row) => `${row.manifest.model}/${row.manifest.capability} #${row.seq}`
const pct = (rate) => `${Math.round(rate * 100)}%`

function loadRun (runId) {
  const path = join(RUNS, `${runId}.json`)
  if (!existsSync(path)) {
    console.error(`  run file missing: ${path}\n  the ledger keeps the summary; the transcripts live beside it and are not recreatable.`)
    process.exit(1)
  }
  return JSON.parse(readFileSync(path, 'utf8'))
}

// Every flag naming a run resolves it the same way, so a token that works for --runs works
// for --run and --baseline too. Without an argument the most recent run is meant.
const pick = (flag) => {
  const wanted = arg(flag)
  return wanted ? resolveRun(wanted) : rows[rows.length - 1]
}

/**
 * Resolve one `--runs` token to a ledger entry, matching on any part of a run id.
 *
 * Ids carry a timestamp to the millisecond, so requiring the whole string would mean pasting
 * forty characters per column. An ambiguous prefix is rejected rather than resolved to the
 * newest match: silently comparing a run the caller did not name is the failure this whole
 * flag exists to prevent.
 */
function resolveRun (token) {
  const found = rows.filter((r) => r.runId.includes(token))
  if (!found.length) {
    console.error(`  no run matches "${token}". Run without flags to list them.`)
    process.exit(1)
  }
  if (found.length > 1) {
    console.error(`  "${token}" matches ${found.length} runs:`)
    for (const r of found) console.error(`    ${r.runId}`)
    process.exit(1)
  }
  return found[0]
}

function table (header, lines) {
  console.log(`\n  ${header}`)
  for (const line of lines) console.log(`  ${line}`)
  console.log('')
}

if (args.verify) {
  const chain = verifyChain(rows)
  const bad = []
  for (const row of rows) {
    const path = join(RUNS, `${row.runId}.json`)
    if (!existsSync(path)) {
      bad.push(`${row.runId}: run file missing`)
      continue
    }
    if (sha256(readFileSync(path, 'utf8')) !== row.reportSha256) bad.push(`${row.runId}: report does not match the hash recorded for it`)
  }
  for (const e of [...chain.errors, ...bad]) console.log(`  BROKEN  ${e}`)
  const intact = chain.ok && !bad.length
  if (intact) console.log(`\n  intact — ${rows.length} run${rows.length > 1 ? 's' : ''}, chain and reports agree\n`)
  process.exit(intact ? 0 : 1)
}

if (args.matrix) {
  // Named runs only. Taking every entry in the ledger put a one-case smoke test beside an
  // 819-run battery under identical column headers, which reads as a comparison and is not one.
  const wanted = arg('runs')
  if (!wanted) {
    console.error('  --matrix needs the runs to compare:  --runs <id>,<id>')
    console.error('  Any unambiguous part of an id will do. Run without flags to list them.')
    process.exit(1)
  }
  const chosen = wanted.split(',').map((s) => s.trim()).filter(Boolean).map(resolveRun)
  if (chosen.length < 2) {
    console.error('  --matrix compares two or more runs. For a single run use --curve.')
    process.exit(1)
  }

  const cols = chosen.map((row) => ({ row, buckets: rollup(loadRun(row.runId).results, DIFFICULTY) }))
  const keys = [...new Set(cols.flatMap((c) => c.buckets.map((b) => `${b.axis}:${b.level}`)))].sort()
  const width = Math.max(...cols.map((c) => label(c.row).length), 14)
  table(
    `${'level'.padEnd(20)}${cols.map((c) => label(c.row).padStart(width + 2)).join('')}`,
    keys.map((key) => {
      const [axis, level] = key.split(':')
      const cells = cols.map((c) => {
        const b = c.buckets.find((x) => `${x.axis}:${x.level}` === key)
        return (b ? `${pct(b.rate)} (n=${b.runs})` : '—').padStart(width + 2)
      })
      return `${`${axis}/${level}`.padEnd(20)}${cells.join('')}`
    })
  )
  console.log('  n is runs, not cases. A rate over a handful of runs is not a measurement.\n')
}

if (args.curve) {
  const row = pick('run')
  const buckets = rollup(loadRun(row.runId).results, DIFFICULTY)
  table(`${label(row)} · ${row.runId}`,
    buckets.map((b) => `${`${b.axis}/${b.level}`.padEnd(20)}${pct(b.rate).padStart(5)}  ${'█'.repeat(Math.round(b.rate * 20)).padEnd(20)} ${b.cases} cases / ${b.runs} runs`))
}

if (args.coverage) {
  const row = pick('run')
  const rowsOut = coverage(loadRun(row.runId).results)
  table(`${label(row)} · which named tools ever answered`,
    rowsOut.map((t) => `${t.status.toUpperCase().padEnd(8)}  ${t.tool.padEnd(18)} routed ${String(t.routed).padStart(3)} · declined ${String(t.declined).padStart(3)} · failed ${String(t.failed).padStart(3)}`))
  console.log('  ABSENT: every case naming it declined — a tool to write. UNROUTED: served, but the model went elsewhere.\n')
}

if (args.gate) {
  const baseName = arg('baseline')
  if (!baseName) {
    console.error('  --gate needs --baseline <runId>')
    process.exit(1)
  }
  const base = pick('baseline')
  const now = pick('run')

  if (base.manifest.batterySha256 !== now.manifest.batterySha256) {
    console.error(`\n  refusing to compare: the question set changed.\n    baseline ${base.manifest.batterySha256.slice(0, 16)}\n    current  ${now.manifest.batterySha256.slice(0, 16)}\n  A different exam is not a regression. Re-baseline deliberately.\n`)
    process.exit(1)
  }

  const g = gate(byCase(loadRun(base.runId).results), byCase(loadRun(now.runId).results))
  table(`gate · ${label(now)} vs baseline ${base.runId}`, [
    `compared ${g.compared} cases`,
    ...g.regressed.map((r) => `REGRESSED  ${r.id}  ${pct(r.was)} → ${pct(r.now)}`),
    ...g.improved.map((r) => `improved   ${r.id}  ${pct(r.was)} → ${pct(r.now)}`),
    ...(g.added.length ? [`added      ${g.added.join(', ')}`] : []),
    ...(g.removed.length ? [`removed    ${g.removed.join(', ')}`] : []),
    g.ok ? 'PASS — nothing degraded' : `FAIL — ${g.regressed.length} case${g.regressed.length > 1 ? 's' : ''} degraded`
  ])
  process.exit(g.ok ? 0 : 1)
}

if (!args.matrix && !args.curve && !args.coverage && !args.gate && !args.verify) {
  table(`${rows.length} run${rows.length > 1 ? 's' : ''}`,
    rows.map((r) => `${String(r.seq).padStart(3)}  ${r.runId}  ${label(r).padEnd(20)} ${r.summary.passed}/${r.summary.runs}  battery ${r.manifest.batterySha256.slice(0, 8)}`))
}
