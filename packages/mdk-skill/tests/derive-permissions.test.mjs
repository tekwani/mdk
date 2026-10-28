import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { METHODS, HELPERS, RESOURCE_VERBS, derive, compare, malformedRule, stripComments } from '../src/skills/mdk-app-rbac/scripts/derive-permissions.mjs'

const require = createRequire(import.meta.url)
// The Kernel's own protocol constants: every action the script maps a method to must be one the Kernel accepts.
const { ACTIONS } = require('../../../backend/core/kernel/lib/protocol/actions.js')
const SCRIPT = fileURLToPath(new URL('../src/skills/mdk-app-rbac/scripts/derive-permissions.mjs', import.meta.url))
const VERBS = RESOURCE_VERBS

function app (permissions = 'permissions: [{ resources: [workers], verbs: [list] }]') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-app-rbac-'))
  fs.mkdirSync(path.join(dir, 'plugin', 'controllers', 'tests'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'mdk-app.yaml'), `id: io.tether.demo\nversion: 0.1.0\ndisplayName: Demo\n# the access\n${permissions}\nconfig: {}\n`)
  fs.writeFileSync(path.join(dir, 'plugin', 'mdk-plugin.json'), '{"name":"demo","version":"0.1.0","routes":[]}')
  fs.writeFileSync(path.join(dir, 'plugin', 'controllers', 'summary.js'), [
    "const mdk = require('../lib/client')",
    'module.exports = async (req) => {',
    '  const { workers } = await mdk.listWorkers()',
    '  // await mdk.terminateWorker(id) is a comment, not a call',
    '  /* mdk.terminateWorker(x)',
    '     mdk.voteAction(y) */ const url = "http://h"; await mdk.getCapabilities(workers[0].deviceIds[0])',
    "  const t = await mdk.pullTelemetry(workers[0].deviceIds[0], 'metrics')",
    "  return mdk.sendCommand(workers[0].deviceIds[0], 'reboot', {})",
    '}'
  ].join('\n'))
  fs.writeFileSync(path.join(dir, 'plugin', 'controllers', 'tests', 'summary.test.js'), 'mdk.voteAction({})\n')
  fs.writeFileSync(path.join(dir, 'plugin', 'controllers', 'summary.spec.js'), 'mdk.terminateWorker("x")\n')
  return dir
}

const run = (args, cwd) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', cwd })

describe('derive-permissions', () => {
  it('maps every client method to a Kernel action, with a verb its resource takes', () => {
    const known = new Set(Object.values(ACTIONS))
    for (const [method, spec] of Object.entries(METHODS)) {
      assert.ok(known.has(spec.action), `${method}: ${spec.action}`)
      assert.ok(VERBS[spec.resource]?.includes(spec.verb), `${method}: ${spec.resource}:${spec.verb}`)
    }
    for (const helper of Object.values(HELPERS)) assert.ok(METHODS[helper.via], helper.via)
  })

  it('strips block and line comments but keeps a URL, with line numbers intact', () => {
    const lines = stripComments('a()\n/* x.sendCommand(\n) */ b() // tail\nconst u = "http://h"; c()')
    assert.deepEqual(lines, ['a()', '', ' b() ', 'const u = "http://h"; c()'])
  })

  it('merges the calls into one rule per resource, and ignores comments and tests', () => {
    const dir = app()
    try {
      const r = run([dir, '--json'], dir)
      assert.equal(r.status, 0, r.stderr)
      const out = JSON.parse(r.stdout)
      assert.deepEqual(out.rules, [
        { resources: ['devices'], verbs: ['read', 'write'] },
        { resources: ['workers'], verbs: ['list'] }
      ])
      assert.deepEqual(out.evidence.map((e) => e.method), ['listWorkers', 'getCapabilities', 'pullTelemetry', 'sendCommand'])
      assert.deepEqual(out.evidence[0].at, ['plugin/controllers/summary.js:3'])
      assert.deepEqual(out.evidence[1].at, ['plugin/controllers/summary.js:6'])
      assert.equal(out.directWorkerCalls.length, 0)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('--check fails on a manifest that declares less than the code uses, and passes once written', () => {
    const dir = app()
    try {
      const short = run([dir, '--check', '--json'])
      assert.equal(short.status, 1)
      assert.deepEqual(JSON.parse(short.stdout).check, { missing: ['devices:read', 'devices:write'], unused: [] })
      const text = run(['.', '--check'], dir)
      assert.match(text.stdout, /does not declare devices:read, devices:write/)

      const wide = run([dir, '--write'])
      assert.equal(wide.status, 0, wide.stderr)
      const manifest = fs.readFileSync(path.join(dir, 'mdk-app.yaml'), 'utf8')
      assert.match(manifest, /# the access/)
      assert.match(manifest, /devices/)
      const ok = run([dir, '--check', '--json'])
      assert.equal(ok.status, 0)
      assert.deepEqual(JSON.parse(ok.stdout).check, { missing: [], unused: [] })
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('--strict also fails on access no call needs, and a malformed rule is a usage error', () => {
    const dir = app('permissions: [{ resources: ["*"], verbs: ["*"] }]')
    try {
      assert.equal(run([dir, '--check']).status, 0)
      const strict = run([dir, '--check', '--strict', '--json'])
      assert.equal(strict.status, 1)
      assert.ok(JSON.parse(strict.stdout).check.unused.includes('workers:delete'))
      fs.writeFileSync(path.join(dir, 'mdk-app.yaml'), 'id: io.tether.demo\nversion: 0.1.0\ndisplayName: Demo\npermissions: [{ resources: [devices], verbs: read }]\n')
      const bad = run([dir, '--check'])
      assert.equal(bad.status, 2)
      assert.match(bad.stderr, /permissions\[0\] must be/)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('expands wildcards over the verbs each resource takes, and derives nothing from a plugin without Kernel calls', () => {
    assert.deepEqual(compare([{ resources: ['devices'], verbs: ['read'] }], [{ resources: ['*'], verbs: ['*'] }]).missing, [])
    assert.deepEqual(compare([{ resources: ['workers'], verbs: ['list'] }], [{ resources: ['workers'], verbs: ['*'] }]).unused, ['workers:delete'])
    assert.equal(malformedRule([{ resources: ['x'], verbs: ['y'] }, { resources: 'x', verbs: ['y'] }]), 1)
    assert.deepEqual(derive([]), { rules: [], direct: [] })
    assert.deepEqual(derive([{ method: 'sendWorkerCommand', file: 'f', line: 1 }]), {
      rules: [{ resources: ['workers'], verbs: ['list'] }],
      direct: [{ method: 'sendWorkerCommand', file: 'f', line: 1 }]
    })
  })

  it('refuses a directory without a manifest or a route table', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-app-rbac-'))
    try {
      assert.equal(run([dir]).status, 2)
      fs.writeFileSync(path.join(dir, 'mdk-app.yaml'), 'permissions: []\n')
      const r = run([dir])
      assert.equal(r.status, 2)
      assert.match(r.stderr, /no mdk-plugin.json/)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
