'use strict'

const fs = require('fs')
const path = require('path')

const SCHEMA_PATH = path.join(__dirname, '..', 'mdk-contract.schema.json')

let _schema = null

function _loadSchema () {
  if (!_schema) _schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'))
  return _schema
}

function _jsonType (v) {
  if (Array.isArray(v)) return 'array'
  if (v === null) return 'null'
  return typeof v
}

function _matchesType (expected, v) {
  if (expected === 'integer') return typeof v === 'number' && Number.isInteger(v)
  return _jsonType(v) === expected
}

// Implements the JSON Schema subset mdk-contract.schema.json uses (type, enum,
// required, properties, additionalProperties, items). A schema feature outside
// this subset would validate as always-passing here; the ajv parity test in
// backend/workers guards against that drift.
function _validateNode (schema, value, at, errors) {
  if (schema.type && !_matchesType(schema.type, value)) {
    errors.push(`ERR_CONTRACT_TYPE: ${at || '/'} expected ${schema.type}, got ${_jsonType(value)}`)
    return
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`ERR_CONTRACT_ENUM: ${at} is ${JSON.stringify(value)}, allowed: ${schema.enum.join(' | ')}`)
  }
  if (_jsonType(value) === 'object') {
    for (const key of schema.required || []) {
      if (!(key in value)) errors.push(`ERR_CONTRACT_REQUIRED: ${at || '/'} missing required property '${key}'`)
    }
    const props = schema.properties || {}
    for (const [key, v] of Object.entries(value)) {
      if (props[key]) {
        _validateNode(props[key], v, `${at}/${key}`, errors)
      } else if (schema.additionalProperties === false) {
        errors.push(`ERR_CONTRACT_UNEXPECTED: ${at || '/'} has unexpected property '${key}'`)
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        _validateNode(schema.additionalProperties, v, `${at}/${key}`, errors)
      }
    }
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((v, i) => _validateNode(schema.items, v, `${at}/${i}`, errors))
  }
}

// Rules the schema cannot express. Handler existence needs the plugin dir, so
// it only runs when the caller has one (a fetched external contract does not).
function _semanticChecks (contract, dir, errors) {
  if (_jsonType(contract) !== 'object') return
  const caps = contract.capabilities
  if (_jsonType(caps) !== 'object') return

  for (const section of ['telemetry', 'commands']) {
    const entries = Array.isArray(caps[section]) ? caps[section] : []
    const seen = new Set()
    entries.forEach((entry, i) => {
      const at = `/capabilities/${section}/${i}`
      if (_jsonType(entry) !== 'object') return
      if (entry.name) {
        if (seen.has(entry.name)) errors.push(`ERR_CONTRACT_DUPLICATE_NAME: ${at} '${entry.name}' already declared in ${section}`)
        seen.add(entry.name)
      }
      if (dir && typeof entry.handler === 'string' && entry.handler) {
        const file = path.resolve(dir, entry.handler)
        if (!fs.existsSync(file)) errors.push(`ERR_CONTRACT_HANDLER_NOT_FOUND: ${at} handler '${entry.handler}' does not exist (resolved: ${file})`)
      }
    })
  }

  const commands = Array.isArray(caps.commands) ? caps.commands : []
  commands.forEach((cmd, i) => {
    if (_jsonType(cmd) !== 'object' || !Array.isArray(cmd.params)) return
    cmd.params.forEach((p, j) => {
      if (_jsonType(p) !== 'object' || p.type !== 'number') return
      const at = `/capabilities/commands/${i}/params/${j}`
      if (typeof p.min !== 'number' || typeof p.max !== 'number') {
        errors.push(`ERR_CONTRACT_PARAM_BOUNDS_MISSING: ${at} ('${cmd.name}'.'${p.name}') — number params must declare min and max so the Kernel can enforce ERR_PARAM_RANGE`)
      } else if (p.min > p.max) {
        errors.push(`ERR_CONTRACT_PARAM_BOUNDS_INVALID: ${at} min ${p.min} > max ${p.max}`)
      }
    })
  })
}

/**
 * Validate a parsed mdk-contract.json against the vendored schema, plus the
 * semantic rules the schema cannot express: unique telemetry/command names,
 * number params with coherent min/max, and (when opts.dir names the plugin
 * directory) every handler file present on disk.
 *
 * validateContract(contract, { dir?, semantic = true }) -> { ok, errors }
 * where errors is a list of ERR_CONTRACT_* strings. Pass semantic: false for
 * schema-only conformance (the catalogue generator's mode).
 */
function validateContract (contract, opts = {}) {
  const errors = []
  _validateNode(_loadSchema(), contract, '', errors)
  if (opts.semantic !== false) _semanticChecks(contract, opts.dir, errors)
  return { ok: errors.length === 0, errors }
}

module.exports = { validateContract, SCHEMA_PATH }
