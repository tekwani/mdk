'use strict'

/**
 * Caller-supplied mingo queries/projections run over full action records, so
 * only plain comparison and logical operators are accepted. $regex (ReDoS),
 * $where/$function/$accumulator (code) and $expr (arbitrary aggregation) are
 * refused, as is anything not on the list.
 */

const ALLOWED_QUERY_OPERATORS = new Set([
  '$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin',
  '$and', '$or', '$nor', '$not',
  '$exists', '$type', '$size', '$all', '$elemMatch'
])

const MAX_DEPTH = 8
const MAX_KEYS = 200

function _fail (msg) {
  throw new Error(`ERR_QUERY_INVALID: ${msg}`)
}

function assertSafeQuery (query) {
  if (query === undefined || query === null) return
  if (typeof query !== 'object' || Array.isArray(query)) _fail('query must be an object')
  let keys = 0
  const walk = (node, depth) => {
    if (depth > MAX_DEPTH) _fail(`nesting deeper than ${MAX_DEPTH}`)
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1)
      return
    }
    if (!node || typeof node !== 'object') return
    for (const key of Object.keys(node)) {
      if (++keys > MAX_KEYS) _fail(`more than ${MAX_KEYS} keys`)
      if (key.startsWith('$') && !ALLOWED_QUERY_OPERATORS.has(key)) _fail(`operator ${key} is not allowed`)
      walk(node[key], depth + 1)
    }
  }
  walk(query, 0)
}

// Projections: field paths mapped to 0/1/true/false only.
function assertSafeProjection (fields) {
  if (fields === undefined || fields === null) return
  if (typeof fields !== 'object' || Array.isArray(fields)) _fail('fields must be an object')
  const keys = Object.keys(fields)
  if (keys.length > MAX_KEYS) _fail(`more than ${MAX_KEYS} fields`)
  for (const key of keys) {
    if (key.startsWith('$') || key.includes('.$')) _fail(`projection operator ${key} is not allowed`)
    const v = fields[key]
    if (v !== 0 && v !== 1 && v !== true && v !== false) _fail(`projection value for ${key} must be 0, 1, true or false`)
  }
}

module.exports = { ALLOWED_QUERY_OPERATORS, assertSafeQuery, assertSafeProjection }
