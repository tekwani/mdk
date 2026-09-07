import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { readManifest, renderReport } from '../docs/scripts/check-external-contracts.mjs'

function withManifest (content, run) {
  const dir = mkdtempSync(path.join(tmpdir(), 'check-external-contracts-'))
  const file = path.join(dir, 'external-workers.json')
  try {
    if (content !== undefined) writeFileSync(file, content)
    run(file)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('readManifest: throws when the file is missing', () => {
  withManifest(undefined, (file) => {
    assert.throws(() => readManifest(file), /not found/)
  })
})

test('readManifest: throws when the parsed value is not an array (object)', () => {
  withManifest('{}', (file) => {
    assert.throws(() => readManifest(file), /must be a JSON array/)
  })
})

test('readManifest: throws when the parsed value is not an array (null)', () => {
  withManifest('null', (file) => {
    assert.throws(() => readManifest(file), /must be a JSON array/)
  })
})

test('readManifest: an empty array is a valid, supported no-op state', () => {
  withManifest('[]', (file) => {
    assert.deepEqual(readManifest(file), [])
  })
})

test('readManifest: returns a populated array as-is', () => {
  const entry = { name: 'example-worker', repoUrl: 'https://github.com/example-vendor/example-worker', ref: 'abc123', contractPath: 'mdk-contract.json' }
  withManifest(JSON.stringify([entry]), (file) => {
    assert.deepEqual(readManifest(file), [entry])
  })
})

test('renderReport: no findings', () => {
  assert.match(renderReport([]), /All manufacturer-maintained contracts are reachable/)
})

test('renderReport: lists every finding and message', () => {
  const report = renderReport([
    { label: 'a (url)', messages: ['msg one'] },
    { label: 'b (url)', messages: ['msg two', 'msg three'] }
  ])
  assert.match(report, /- \*\*a \(url\)\*\*/)
  assert.match(report, /- msg one/)
  assert.match(report, /- \*\*b \(url\)\*\*/)
  assert.match(report, /- msg two/)
  assert.match(report, /- msg three/)
})
