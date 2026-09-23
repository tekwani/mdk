'use strict'

// Unit tests for the supported-plugins generator (docs/scripts/generate-plugin-reference.js).
// The generator is require-safe: it only runs main() as a direct entrypoint, so importing it
// here exercises its pure helpers without writing any files.

const test = require('brittle')

const {
  bucketOf,
  collect,
  renderMarkdown,
  describe,
  cell,
  BUCKET_ORDER,
  INERT
} = require('../../../../../docs/scripts/generate-plugin-reference.js')

test('bucketOf: auth is Inert, other core plugins are bundled site plugins', (t) => {
  t.is(bucketOf('auth', 'core'), 'Inert')
  t.is(bucketOf('telemetry', 'core'), 'Bundled site plugins')
  t.is(bucketOf('site-hashrate', 'core'), 'Bundled site plugins')
  t.is(bucketOf('site-monitor', 'core'), 'Bundled site plugins')
})

test('bucketOf: standalone plugins are optional', (t) => {
  t.is(bucketOf('agent', 'standalone'), 'Optional plugins')
  t.is(bucketOf('demo', 'standalone'), 'Optional plugins')
})

test('INERT declares auth and nothing else', (t) => {
  t.ok(INERT.has('auth'))
  t.is(INERT.size, 1)
})

test('collect: scans both roots and buckets the shipped plugins', (t) => {
  const byDir = Object.fromEntries(collect().map((p) => [p.dir, p]))

  t.is(byDir.auth.bucket, 'Inert', 'auth is inert')
  t.is(byDir.auth.root, 'backend/core/plugins')

  t.is(byDir.telemetry.bucket, 'Bundled site plugins')
  t.is(byDir['site-hashrate'].bucket, 'Bundled site plugins')

  t.is(byDir.agent.bucket, 'Optional plugins', 'agent comes from the standalone root')
  t.is(byDir.agent.root, 'backend/plugins')
  t.is(byDir.demo.root, 'backend/plugins')

  for (const p of Object.values(byDir)) {
    t.ok(BUCKET_ORDER.includes(p.bucket), `${p.dir} lands in a known bucket`)
  }
})

test('renderMarkdown: omits a routeless plugin and its would-be empty table', (t) => {
  const md = renderMarkdown([
    { dir: 'has-routes', bucket: 'Optional plugins', routes: [{ method: 'GET', path: '/x', description: 'Does a thing.' }] },
    { dir: 'no-routes', bucket: 'Optional plugins', routes: [] }
  ])
  t.ok(md.includes('#### `has-routes`'), 'routed plugin gets a table')
  t.absent(md.includes('no-routes'), 'routeless plugin is skipped entirely')
})

test('renderMarkdown: drops a bucket left with only routeless plugins', (t) => {
  t.is(renderMarkdown([{ dir: 'x', bucket: 'Inert', routes: [] }]), '', 'no stranded heading')
})

test('describe strips only the trailing full stop; internal dots survive', (t) => {
  t.is(describe('Returns the site name.'), 'Returns the site name')
  t.is(describe('Fans out telemetry.pull to workers.'), 'Fans out telemetry.pull to workers')
})

test('cell escapes pipes and backslashes so a description cannot break the table', (t) => {
  t.is(cell('a | b'), 'a \\| b')
  t.is(cell('a\\b'), 'a\\\\b')
})
