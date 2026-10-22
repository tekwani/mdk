'use strict'

const test = require('brittle')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { validateContract } = require('../../lib/contract-validator')

function contract (overrides = {}) {
  return {
    metadata: {
      provider: 'test',
      deviceFamily: 'miner',
      brand: 'Test',
      modelsSupported: ['T1'],
      overview: 'Test device.'
    },
    capabilities: {
      telemetry: [
        { name: 'hashrate', type: 'number', handler: 'handlers/hashrate.js', description: 'TH/s' }
      ],
      commands: [
        {
          name: 'setPowerLimit',
          handler: 'handlers/set-power-limit.js',
          params: [{ name: 'watts', type: 'number', min: 100, max: 3500 }]
        }
      ],
      health: { supportedStates: ['OK'] },
      errors: {}
    },
    ...overrides
  }
}

test('a conforming contract passes', (t) => {
  const { ok, errors } = validateContract(contract())
  t.ok(ok)
  t.alike(errors, [])
})

test('missing metadata and capabilities are required-property errors', (t) => {
  const { ok, errors } = validateContract({})
  t.not(ok)
  t.ok(errors.some((e) => e.startsWith('ERR_CONTRACT_REQUIRED') && e.includes("'metadata'")))
  t.ok(errors.some((e) => e.startsWith('ERR_CONTRACT_REQUIRED') && e.includes("'capabilities'")))
})

test('a non-object contract reports a type error without throwing', (t) => {
  for (const bad of [null, 'contract', 7, []]) {
    const { ok, errors } = validateContract(bad)
    t.not(ok)
    t.ok(errors.some((e) => e.startsWith('ERR_CONTRACT_TYPE')))
  }
})

test('telemetry type outside the enum is rejected', (t) => {
  const c = contract()
  c.capabilities.telemetry[0].type = 'float'
  const { ok, errors } = validateContract(c)
  t.not(ok)
  t.ok(errors.some((e) => e.startsWith('ERR_CONTRACT_ENUM') && e.includes('/capabilities/telemetry/0/type')))
})

test('unexpected top-level properties are rejected', (t) => {
  const { ok, errors } = validateContract(contract({ transport: 'hrpc' }))
  t.not(ok)
  t.ok(errors.some((e) => e.startsWith('ERR_CONTRACT_UNEXPECTED') && e.includes("'transport'")))
})

test('duplicate names within a section are a semantic error', (t) => {
  const c = contract()
  c.capabilities.telemetry.push({ ...c.capabilities.telemetry[0] })
  const { ok, errors } = validateContract(c)
  t.not(ok)
  t.ok(errors.some((e) => e.startsWith('ERR_CONTRACT_DUPLICATE_NAME') && e.includes("'hashrate'")))
})

test('number params must declare coherent min/max', (t) => {
  const missing = contract()
  delete missing.capabilities.commands[0].params[0].max
  t.ok(validateContract(missing).errors.some((e) => e.startsWith('ERR_CONTRACT_PARAM_BOUNDS_MISSING')))

  const inverted = contract()
  inverted.capabilities.commands[0].params[0].min = 4000
  t.ok(validateContract(inverted).errors.some((e) => e.startsWith('ERR_CONTRACT_PARAM_BOUNDS_INVALID')))
})

test('semantic: false keeps schema conformance only', (t) => {
  const c = contract()
  c.capabilities.telemetry.push({ ...c.capabilities.telemetry[0] })
  delete c.capabilities.commands[0].params[0].max
  const { ok, errors } = validateContract(c, { semantic: false })
  t.ok(ok)
  t.alike(errors, [])
})

test('handler existence is checked only when dir is given', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-contract-validator-'))
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }))

  const c = contract()
  t.ok(validateContract(c).ok)

  const withDir = validateContract(c, { dir })
  t.not(withDir.ok)
  t.is(withDir.errors.filter((e) => e.startsWith('ERR_CONTRACT_HANDLER_NOT_FOUND')).length, 2)

  fs.mkdirSync(path.join(dir, 'handlers'))
  fs.writeFileSync(path.join(dir, 'handlers', 'hashrate.js'), 'module.exports = () => 1\n')
  fs.writeFileSync(path.join(dir, 'handlers', 'set-power-limit.js'), 'module.exports = () => true\n')
  t.ok(validateContract(c, { dir }).ok)
})
