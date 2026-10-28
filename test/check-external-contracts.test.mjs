import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { readManifest, renderReport, checkRepoUrls } from '../docs/scripts/check-external-contracts.mjs'

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
  assert.match(renderReport([]), /Every partner-maintained entry is reachable, its repository URL resolves/)
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

// --- checkRepoUrls -----------------------------------------------------------------------

const REPO = 'https://github.com/demo/demo-worker'
const entry = { name: 'demo-worker', repoUrl: REPO, ref: 'abc', contractPath: 'mdk-contract.json' }
const response = (over = {}) => ({ ok: true, status: 200, redirected: false, url: REPO, ...over })

test('checkRepoUrls: a 200 with no redirect is clean, and the request is a HEAD with a signal', async () => {
  let seen
  const findings = await checkRepoUrls([entry], { fetchImpl: async (url, init) => { seen = { url, init }; return response() } })
  assert.deepEqual(findings, [])
  assert.equal(seen.url, REPO)
  assert.equal(seen.init.method, 'HEAD')
  assert.equal(seen.init.redirect, 'follow')
  assert.ok(seen.init.signal instanceof AbortSignal)
})

test('checkRepoUrls: a non-2xx is a finding naming the status', async () => {
  const findings = await checkRepoUrls([entry], { fetchImpl: async () => response({ ok: false, status: 404 }) })
  assert.equal(findings.length, 1)
  assert.equal(findings[0].label, `demo-worker (${REPO})`)
  assert.match(findings[0].messages[0], /HTTP 404/)
})

test('checkRepoUrls: a redirect to another repository is a finding naming the final URL', async () => {
  const moved = 'https://github.com/demo/renamed-worker'
  const findings = await checkRepoUrls([entry], { fetchImpl: async () => response({ redirected: true, url: moved }) })
  assert.equal(findings.length, 1)
  assert.match(findings[0].messages[0], /redirects to https:\/\/github\.com\/demo\/renamed-worker/)
})

test('checkRepoUrls: a redirect that only adds a trailing slash is clean', async () => {
  const findings = await checkRepoUrls([entry], { fetchImpl: async () => response({ redirected: true, url: REPO + '/' }) })
  assert.deepEqual(findings, [])
})

test('checkRepoUrls: a thrown fetch is a finding and does not stop the other entries', async () => {
  const other = { ...entry, name: 'other-worker', repoUrl: 'https://github.com/demo/other-worker' }
  const findings = await checkRepoUrls([entry, other], {
    fetchImpl: async (url) => { if (url === REPO) throw new Error('getaddrinfo ENOTFOUND'); return response({ url }) }
  })
  assert.equal(findings.length, 1)
  assert.match(findings[0].messages[0], /could not be reached \(getaddrinfo ENOTFOUND\)/)
})
