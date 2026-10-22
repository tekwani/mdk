'use strict'

// The shared validator (backend/core/mdk-worker/lib/contract-validator.js)
// implements only the JSON Schema subset mdk-contract.schema.json uses. If the
// schema ever grows a feature outside that subset, the subset validator would
// silently pass what ajv rejects — this suite pins the two to the same verdict
// on every in-repo contract and on synthetic non-conforming ones.

const test = require('brittle')
const fs = require('fs')
const path = require('path')
const Ajv = require('ajv/dist/2020')
const { validateContract, SCHEMA_PATH } = require('../../../core/mdk-worker/lib/contract-validator')

const WORKERS_ROOT = path.resolve(__dirname, '..', '..')

function findContracts (dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) findContracts(full, acc)
    else if (entry.name === 'mdk-contract.json') acc.push(full)
  }
  return acc
}

function ajvValidator () {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'))
  return new Ajv({ allErrors: true, strict: false }).compile(schema)
}

test('subset validator agrees with ajv on every in-repo contract', (t) => {
  const ajv = ajvValidator()
  const contracts = findContracts(WORKERS_ROOT)
  t.ok(contracts.length > 0)
  for (const file of contracts) {
    const contract = JSON.parse(fs.readFileSync(file, 'utf8'))
    const subset = validateContract(contract, { semantic: false }).ok
    t.is(subset, ajv(contract), path.relative(WORKERS_ROOT, file))
  }
})

test('subset validator agrees with ajv on synthetic non-conforming contracts', (t) => {
  const ajv = ajvValidator()
  const base = () => JSON.parse(fs.readFileSync(findContracts(WORKERS_ROOT)[0], 'utf8'))

  const cases = [
    ['missing metadata', (c) => { delete c.metadata }],
    ['missing capabilities.health', (c) => { delete c.capabilities.health }],
    ['unexpected top-level key', (c) => { c.transport = 'hrpc' }],
    ['telemetry type outside enum', (c) => { c.capabilities.telemetry[0].type = 'float' }],
    ['telemetry entry missing description', (c) => { delete c.capabilities.telemetry[0].description }],
    ['params not an array', (c) => { c.capabilities.commands[0].params = {} }],
    ['errors map with non-string value', (c) => { c.capabilities.errors = { E1: 7 } }],
    ['modelsSupported with non-string item', (c) => { c.metadata.modelsSupported = [1] }]
  ]

  for (const [label, mutate] of cases) {
    const contract = base()
    mutate(contract)
    const subset = validateContract(contract, { semantic: false }).ok
    t.is(subset, ajv(contract), label)
    t.not(subset, label + ' rejects')
  }
})
