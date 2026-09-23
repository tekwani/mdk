import test from 'brittle'
import { mkdtempSync, rmSync, readFileSync, appendFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { canonical, entryHash, readChain, verifyChain, appendRun, writeRunFile } from '../../src/ledger.js'
import { sha256 } from '../../src/manifest.js'

const GENESIS = '0'.repeat(64)

function scratch (t) {
  const dir = mkdtempSync(join(tmpdir(), 'mdk-ledger-'))
  t.teardown(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

const run = (over = {}) => ({
  runId: '2026-08-19T090000-qwen3-4b-small',
  manifest: { batterySha256: 'abc', model: 'qwen3-4b' },
  summary: { runs: 801, passed: 714 },
  reportSha256: 'f00d',
  ...over
})

test('canonical json does not depend on the order a field was built in', (t) => {
  t.is(canonical({ b: 1, a: 2 }), '{"a":2,"b":1}')
  t.is(canonical({ a: 2, b: 1 }), canonical({ b: 1, a: 2 }), 'same content hashes the same')
  t.is(canonical({ x: { d: 1, c: [2, { f: 3, e: 4 }] } }), '{"x":{"c":[2,{"e":4,"f":3}],"d":1}}', 'sorted at every depth')
})

test('the first entry starts the chain at genesis', (t) => {
  const path = join(scratch(t), 'ledger.ndjson')
  const entry = appendRun(path, run())
  t.is(entry.seq, 1)
  t.is(entry.prevHash, GENESIS)
  t.is(entry.entryHash.length, 64)
  t.ok(verifyChain([entry]).ok)
})

test('each entry links to the one before it', (t) => {
  const path = join(scratch(t), 'ledger.ndjson')
  const first = appendRun(path, run())
  const second = appendRun(path, run({ runId: 'second' }))
  const third = appendRun(path, run({ runId: 'third' }))

  t.is(second.seq, 2)
  t.is(second.prevHash, first.entryHash, 'the link is the previous entry hash')
  t.is(third.prevHash, second.entryHash)

  const { rows, errors } = readChain(path)
  t.is(rows.length, 3, 'three appends, three lines')
  t.alike(errors, [])
  t.ok(verifyChain(rows).ok, 'an untouched chain verifies')
})

test('editing a result is caught, and so is repairing its own hash', (t) => {
  const path = join(scratch(t), 'ledger.ndjson')
  appendRun(path, run())
  appendRun(path, run({ runId: 'second' }))
  appendRun(path, run({ runId: 'third' }))
  const { rows } = readChain(path)

  const edited = rows.map((r) => (r.seq === 2 ? { ...r, summary: { ...r.summary, passed: 790 } } : r))
  const caught = verifyChain(edited)
  t.absent(caught.ok, 'a better number is not silently accepted')
  t.ok(caught.errors.some((e) => e.includes('seq 2') && e.includes('edited')))

  const resealed = edited.map((r) => (r.seq === 2 ? { ...r, entryHash: entryHash(r) } : r))
  const stillCaught = verifyChain(resealed)
  t.absent(stillCaught.ok, 'recomputing the entry hash does not help — the next entry still points at the old one')
  t.ok(stillCaught.errors.some((e) => e.includes('seq 3') && e.includes('prevHash')))
})

test('every break is reported, not just the first', (t) => {
  const path = join(scratch(t), 'ledger.ndjson')
  appendRun(path, run())
  appendRun(path, run({ runId: 'second' }))
  const { rows } = readChain(path)
  const broken = rows.map((r) => ({ ...r, summary: { ...r.summary, passed: 1 } }))
  t.is(verifyChain(broken).errors.length, 2, 'both entries named')
})

test('a corrupt line does not make the rest of the history unreadable', (t) => {
  const path = join(scratch(t), 'ledger.ndjson')
  appendRun(path, run())
  appendFileSync(path, 'this is not json\n')
  appendRun(path, run({ runId: 'after' }))

  const { rows, errors } = readChain(path)
  t.is(rows.length, 2, 'the readable entries survive')
  t.alike(errors, ['line 2: not valid JSON'], 'and the bad one is named')
})

test('a missing ledger is an empty chain, not a failure', (t) => {
  const { rows, errors } = readChain(join(scratch(t), 'absent.ndjson'))
  t.alike(rows, [])
  t.alike(errors, [])
})

test('the run file hash is taken over the bytes actually written', (t) => {
  const dir = scratch(t)
  const { path, sha256: hash } = writeRunFile(join(dir, 'runs'), 'r1', { runs: 801, passed: 714 })
  const onDisk = readFileSync(path, 'utf8')
  t.is(JSON.parse(onDisk).passed, 714)
  t.is(hash, sha256(onDisk), 'the hash is of the file, not of the object')
  t.is(hash.length, 64)
})
