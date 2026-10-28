import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  parseGitDependency,
  ownerRepo,
  compareRegistryToPins,
  describeFindings
} from '../docs/scripts/lib/external-workers-registry.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SHA_A = 'a47fa82020454f9bfa9963ccaaa319b7948e8aa2'
const SHA_B = '4fd776b4a048a1bc8284ec2eceed82b4631f960c'

test('parseGitDependency: reads owner, repo and SHA from a git+https spec, with or without .git', () => {
  assert.deepEqual(parseGitDependency(`git+https://github.com/demo/demo-worker.git#${SHA_A}`), { owner: 'demo', repo: 'demo-worker', ref: SHA_A })
  assert.deepEqual(parseGitDependency(`git+https://github.com/demo/demo-worker#${SHA_A}`), { owner: 'demo', repo: 'demo-worker', ref: SHA_A })
})

test('parseGitDependency: ignores registry ranges, file: specs and git specs without a full SHA', () => {
  assert.equal(parseGitDependency('^0.12.1'), null)
  assert.equal(parseGitDependency('file:lib/mdk-crypto-lib'), null)
  assert.equal(parseGitDependency('git+https://github.com/demo/demo-worker.git#main'), null)
  assert.equal(parseGitDependency(undefined), null)
})

test('ownerRepo: normalises case and a trailing slash; rejects non-repository URLs', () => {
  assert.equal(ownerRepo('https://github.com/OCEAN-xyz/mdk-wrk-minerpool-ocean'), 'ocean-xyz/mdk-wrk-minerpool-ocean')
  assert.equal(ownerRepo('https://github.com/demo/demo-worker/'), 'demo/demo-worker')
  assert.equal(ownerRepo('https://github.com/demo/demo-worker/tree/main'), null)
  assert.equal(ownerRepo('https://gitlab.com/demo/demo-worker'), null)
})

test('compareRegistryToPins: reports a pinned Worker the registry lacks', () => {
  const registry = []
  const deps = { 'demo-worker': `git+https://github.com/demo/demo-worker.git#${SHA_A}` }
  const { missing, stale } = compareRegistryToPins(registry, deps)
  assert.deepEqual(missing, [{ dependency: 'demo-worker', repo: 'demo/demo-worker' }])
  assert.deepEqual(stale, [])
})

test('compareRegistryToPins: reports a SHA mismatch as stale, naming both pins', () => {
  const registry = [{ name: 'demo-worker', repoUrl: 'https://github.com/Demo/demo-worker', ref: SHA_B }]
  const deps = { 'demo-worker': `git+https://github.com/demo/demo-worker.git#${SHA_A}` }
  const { missing, stale } = compareRegistryToPins(registry, deps)
  assert.deepEqual(missing, [])
  assert.deepEqual(stale, [{ dependency: 'demo-worker', repo: 'demo/demo-worker', registryRef: SHA_B, exampleRef: SHA_A }])
})

test('compareRegistryToPins: a matching pin and a registry-only entry are both clean', () => {
  const registry = [
    { name: 'demo-worker', repoUrl: 'https://github.com/demo/demo-worker', ref: SHA_A },
    { name: 'other-worker', repoUrl: 'https://github.com/other/other-worker', ref: SHA_B }
  ]
  const deps = { 'demo-worker': `git+https://github.com/demo/demo-worker.git#${SHA_A}`, '@tetherto/mdk-core': '^0.12.1' }
  assert.deepEqual(compareRegistryToPins(registry, deps), { missing: [], stale: [] })
})

test('describeFindings: one line per finding, naming the dependency and both SHAs', () => {
  const lines = describeFindings({
    missing: [{ dependency: 'a', repo: 'x/a' }],
    stale: [{ dependency: 'b', repo: 'x/b', registryRef: SHA_A, exampleRef: SHA_B }]
  })
  assert.equal(lines.length, 2)
  assert.match(lines[0], /^a: .*x\/a.*no entry/)
  assert.match(lines[1], new RegExp(`^b: .*${SHA_A}.*${SHA_B}`))
})

test('the committed registry covers every Worker examples/mvp-site pins, at the same commit', () => {
  const registry = JSON.parse(readFileSync(path.join(REPO_ROOT, 'backend/workers/external-workers.json'), 'utf8'))
  const pkg = JSON.parse(readFileSync(path.join(REPO_ROOT, 'examples/mvp-site/package.json'), 'utf8'))
  const findings = compareRegistryToPins(registry, { ...pkg.dependencies, ...pkg.devDependencies })
  assert.deepEqual(findings, { missing: [], stale: [] }, describeFindings(findings).join('\n'))
})
