// Unit tests for the supported-plugins generator (docs/scripts/generate-plugin-reference.js).
// The generator is require-safe: it only runs main() as a direct entrypoint, so importing it
// here exercises its pure helpers without writing any files.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { bucketOf, collect, renderMarkdown, describe, cell, BUCKET_ORDER } =
  require('../docs/scripts/generate-plugin-reference.js')

test('bucketOf: every shipped plugin is optional', () => {
  assert.equal(bucketOf('agent', 'standalone'), 'Optional plugins')
  assert.equal(bucketOf('demo', 'standalone'), 'Optional plugins')
})

test('collect: scans backend/apps and buckets the shipped plugins', () => {
  const byDir = Object.fromEntries(collect().map((p) => [p.dir, p]))
  assert.equal(byDir.agent.root, 'backend/apps')
  assert.equal(byDir.demo.root, 'backend/apps')
  for (const p of Object.values(byDir)) {
    assert.ok(BUCKET_ORDER.includes(p.bucket), `${p.dir} lands in a known bucket`)
  }
})

test('renderMarkdown: omits a routeless plugin and its would-be empty table', () => {
  const md = renderMarkdown([
    { dir: 'has-routes', bucket: 'Optional plugins', routes: [{ method: 'GET', path: '/x', description: 'Does a thing.' }] },
    { dir: 'no-routes', bucket: 'Optional plugins', routes: [] }
  ])
  assert.ok(md.includes('#### `has-routes`'), 'routed plugin gets a table')
  assert.ok(!md.includes('no-routes'), 'routeless plugin is skipped entirely')
})

test('renderMarkdown: drops a bucket left with only routeless plugins', () => {
  assert.equal(renderMarkdown([{ dir: 'x', bucket: 'Optional plugins', routes: [] }]), '')
})

test('describe strips only the trailing full stop; internal dots survive', () => {
  assert.equal(describe('Returns the site name.'), 'Returns the site name')
  assert.equal(describe('Fans out telemetry.pull to workers.'), 'Fans out telemetry.pull to workers')
})

test('cell escapes pipes and backslashes so a description cannot break the table', () => {
  assert.equal(cell('a | b'), 'a \\| b')
  assert.equal(cell('a\\b'), 'a\\\\b')
})
