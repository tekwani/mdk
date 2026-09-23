import test from 'brittle'
import { CHARTER } from '../../src/charter.js'
import { AGENT_META_KEY } from '../../src/tools.js'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sha256, hashFile, gitCommit, buildManifest } from '../../src/manifest.js'

const tool = (name, minCapability) => ({ name, _meta: { [AGENT_META_KEY]: { minCapability } } })

const base = {
  batterySha256: 'abc123',
  agentCommit: 'deadbee',
  provider: { kind: 'qvac', model: 'qwen3-4b', baseURL: 'http://10.0.0.7:11500/v1' },
  capability: 'small',
  limits: { maxSteps: 6, maxOutputTokens: 2048 },
  reps: 3,
  startedAt: '2026-08-19T09:00:00.000Z',
  finishedAt: '2026-08-19T09:30:00.000Z'
}

test('the manifest carries the versions a score is only meaningful against', (t) => {
  const m = buildManifest(base)
  t.is(m.contract, 'v2', 'the tool contract version is recorded')
  t.is(m.charter, 'v2', 'the standard charter is recorded by version')
  t.is(m.model, 'qwen3-4b')
  t.is(m.providerKind, 'qvac')
  t.is(m.capability, 'small')
  t.alike(m.limits, { maxSteps: 6, maxOutputTokens: 2048 }, 'the budget the run was taken under')
  t.is(m.reps, 3)
})

test('a custom system prompt is never stamped with the standard charter version', (t) => {
  t.is(buildManifest({ ...base, system: CHARTER }).charter, 'v2', 'the standard charter is itself')
  t.is(buildManifest({ ...base, system: 'you are a pirate' }).charter, 'custom')
})

test('the endpoint is recorded as a hash, so an internal host cannot travel with the run', (t) => {
  const m = buildManifest(base)
  t.absent(JSON.stringify(m).includes('10.0.0.7'), 'the host does not appear anywhere in the manifest')
  t.is(m.endpointSha256.length, 16)
  t.is(m.endpointSha256, sha256('http://10.0.0.7:11500/v1').slice(0, 16))
  t.unlike(
    buildManifest({ ...base, provider: { ...base.provider, baseURL: 'http://10.0.0.8:11500/v1' } }).endpointSha256,
    m.endpointSha256,
    'two endpoints stay distinguishable'
  )
  t.is(buildManifest({ ...base, provider: { kind: 'qvac' } }).endpointSha256, null, 'no endpoint, no hash')
})

test('the tool surface is recorded by name and floor, sorted', (t) => {
  const m = buildManifest({ ...base, tools: [tool('rank_devices', 'small'), tool('diagnose_site', 'mid'), tool('act_device', 'small')] })
  t.alike(m.toolSet, [
    { name: 'act_device', minCapability: 'small' },
    { name: 'diagnose_site', minCapability: 'mid' },
    { name: 'rank_devices', minCapability: 'small' }
  ], 'sorted by name, so two runs are comparable line by line')
})

test('an undeclared floor is recorded as absent, never guessed as small', (t) => {
  const m = buildManifest({ ...base, tools: [{ name: 'list_devices' }] })
  t.is(m.toolSet[0].minCapability, null)
})

// The whole gate rests on this hash: a baseline and a run whose question files differ are two
// different exams, and only the file's own bytes can say so.
test('hashFile hashes the bytes on disk, and one changed character changes it', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'mdk-hashfile-'))
  t.teardown(() => rmSync(dir, { recursive: true, force: true }))
  const path = join(dir, 'battery.json')

  writeFileSync(path, '{"cases":[]}')
  const before = hashFile(path)
  t.is(before, sha256('{"cases":[]}'), 'the hash is of the file content')
  t.is(before.length, 64)

  writeFileSync(path, '{"cases":[ ]}')
  t.unlike(hashFile(path), before, 'one added space is a different question set')
})

test('gitCommit trims, and fails soft outside a checkout', (t) => {
  t.is(gitCommit('.', () => '30bf6478\n'), '30bf6478')
  t.is(gitCommit('.', () => { throw new Error('not a git repository') }), 'unknown', 'a run outside git is not lost')
  t.is(gitCommit('.', () => '   '), 'unknown', 'empty output is not a commit')
})
