'use strict'

const crypto = require('crypto')
const mingo = require('mingo')
const gLibUtilBase = require('@bitfinex/lib-js-util-base')

const isValidSnap = (snap) => {
  return snap.stats && snap.config
}

const isOffline = (snap) => {
  return !snap?.stats?.status || snap.stats.status === 'offline'
}

function getRandomString (length) {
  return crypto.randomBytes(length)
    .toString('base64')
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, length)
}

function hasErrorAndPositiveHashrate (entry) {
  const { errors, hashrate_mhs: hashrateMHS } = entry?.last?.snap?.stats || {}
  const hashrate = hashrateMHS?.t_5m

  return errors?.length && hashrate > 0
}

function sumPoolsShares (pools, key) {
  if (!Array.isArray(pools)) return 0

  return pools?.reduce((acc, pool) => {
    const value = parseInt(pool[key])
    return acc + (isNaN(value) ? 0 : value)
  }, 0)
}

const TIME_PERIODS_MS = {
  H: 60 * 60 * 1000,
  D: 24 * 60 * 60 * 1000,
  W: 7 * 24 * 60 * 60 * 1000,
  M: 30 * 24 * 60 * 60 * 1000
}

const getIntervalFromCron = (cron) => {
  const [, minute, hour] = cron.split(' ')

  if (minute.startsWith('*/')) {
    return parseInt(minute.slice(2), 10) * 60 * 1000
  }

  if (hour.startsWith('*/')) {
    return parseInt(hour.slice(2), 10) * 60 * 60 * 1000
  }

  if (hour === '0' && minute === '0') {
    return 24 * 60 * 60 * 1000
  }
  throw new Error('ERR_CRON_UNSUPPORTED')
}

const getLogsCountForTimeRange = (start, end, key, statTimeframes) => {
  end ||= Date.now()
  start ??= 0
  if (!statTimeframes) return 0
  const currentLogCron = statTimeframes.find(
    tf => tf[0] === key.replace('stat-', '')
  )?.[1]
  if (!currentLogCron) return 0
  try {
    const timeInterval = getIntervalFromCron(currentLogCron)
    return Math.ceil((end - start) / timeInterval) + 1
  } catch (error) {
    return 0
  }
}

const isObject = obj => {
  return obj && typeof obj === 'object' && !Array.isArray(obj)
}

const compareArrays = (prevArray, currArray) => {
  const additions = currArray.filter(item => !prevArray.includes(item))
  const deletions = prevArray.filter(item => !currArray.includes(item))
  return { additions, deletions }
}

const compareObjects = (prev, curr, changes, path = '') => {
  const allKeys = new Set([
    ...Object.keys(prev || {}),
    ...Object.keys(curr || {})
  ])

  allKeys.forEach(key => {
    const currentPath = path ? `${path}.${key}` : key
    const prevValue = prev ? prev[key] : undefined
    const currValue = curr ? curr[key] : undefined

    if (isObject(prevValue) && isObject(currValue)) {
      compareObjects(prevValue, currValue, changes, currentPath)
    } else if (Array.isArray(prevValue) && Array.isArray(currValue)) {
      const arrayChanges = compareArrays(prevValue, currValue)
      if (
        arrayChanges.additions.length > 0 ||
        arrayChanges.deletions.length > 0
      ) {
        changes[currentPath] = arrayChanges
      }
    } else if (prevValue !== currValue) {
      changes[currentPath] = {
        oldValue: prevValue,
        newValue: currValue
      }
    }
  })
}

const getJsonChanges = (previousJson, currentJson) => {
  const changes = {}

  compareObjects(previousJson, currentJson, changes)
  return changes
}

const getLogMaxHeight = (logKeepCount = 3) => Math.ceil(logKeepCount * 1.5)

const aggregateLogs = (logs, groupRange, shouldCalculateAvg = false) => {
  if (!logs || logs.length === 0) return []

  const rangeMs = parseGroupRange(groupRange)
  const buckets = groupByTimeBuckets(logs, rangeMs)

  return buckets.map(bucket => aggregateBucket(bucket, shouldCalculateAvg ? 'avg' : 'sum'))
}

const parseGroupRange = (range) => {
  const match = /^(\d+)\s*([HDWM])s?$/i.exec(range.trim())
  if (!match) {
    throw new Error(
      'ERR_INVALID_GROUP_RANGE_FORMAT. Use formats like "1D", "1H", "1W", "1M"'
    )
  }

  const value = Number(match[1])
  const unit = match[2].toUpperCase()
  return value * TIME_PERIODS_MS[unit]
}

const groupByTimeBuckets = (logs, rangeMs) => {
  if (logs.length === 0) return []
  const sorted = [...logs].sort((a, b) => a.ts - b.ts)

  const minTs = sorted[0].ts
  const maxTs = sorted[sorted.length - 1].ts

  const buckets = []
  let bucketStart = Math.floor(minTs / rangeMs) * rangeMs

  while (bucketStart <= maxTs) {
    const bucketEnd = bucketStart + rangeMs
    const logsInBucket = sorted.filter(log => log.ts >= bucketStart && log.ts < bucketEnd)

    if (logsInBucket.length > 0) {
      buckets.push({
        start: bucketStart,
        end: bucketEnd - 1,
        logs: logsInBucket
      })
    }

    bucketStart = bucketEnd
  }

  return buckets
}

const aggregateBucket = (bucket, operation) => {
  const { start, end, logs } = bucket

  if (logs.length === 0) return null

  if (logs.length === 1) {
    return {
      ...logs[0],
      ts: `${start}-${end}`
    }
  }

  const result = {
    ts: `${start}-${end}`
  }

  const allKeys = new Set()
  logs.forEach(log => {
    Object.keys(log).forEach(key => {
      if (key !== 'ts') allKeys.add(key)
    })
  })

  for (const key of allKeys) {
    result[key] = aggregateField(logs, key, operation)
  }

  return result
}

const aggregateField = (logs, fieldName, operation) => {
  const values = logs
    .map(log => log[fieldName])
    .filter(v => v !== undefined && v !== null)

  if (values.length === 0) return null

  const firstValue = values[0]

  if (typeof firstValue === 'object' && !Array.isArray(firstValue)) {
    return aggregateNestedObject(logs, fieldName, operation)
  }

  if (typeof firstValue === 'number') {
    return aggregateNumeric(values, operation)
  }

  return firstValue
}

const aggregateNestedObject = (logs, fieldName, operation) => {
  const allKeys = new Set()
  logs.forEach(log => {
    if (log[fieldName] && typeof log[fieldName] === 'object') {
      Object.keys(log[fieldName]).forEach(k => allKeys.add(k))
    }
  })

  const result = {}

  for (const key of allKeys) {
    const values = logs
      .map(log => log[fieldName]?.[key])
      .filter(v => v !== undefined && v !== null && typeof v === 'number')

    if (values.length > 0) {
      result[key] = aggregateNumeric(values, operation)
    } else {
      const firstValue = logs.find(log => log[fieldName]?.[key] !== undefined && log[fieldName]?.[key] !== null)
      if (firstValue) {
        result[key] = firstValue[fieldName][key]
      }
    }
  }

  return Object.keys(result).length > 0 ? result : null
}

const aggregateNumeric = (values, operation) => {
  const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v))

  if (numericValues.length === 0) return 0

  if (operation === 'sum') {
    return numericValues.reduce((sum, val) => sum + val, 0)
  } else if (operation === 'avg') {
    const sum = numericValues.reduce((sum, val) => sum + val, 0)
    return sum / numericValues.length
  }

  throw new Error(`ERR_UNKNOWN_OPERATION: ${operation}. Use 'avg' or 'sum'`)
}

function getValue (obj, path) {
  const keys = path.split('.')
  return keys.reduce((acc, key) => acc && acc[key], obj)
}

const getThingSorter = (a, b, sortBy) => {
  const regex = /\d+|\D+/g

  if (!sortBy || Object.keys(sortBy).length === 0) {
    return 1
  }

  for (const [key, order] of Object.entries(sortBy)) {
    const valA = getValue(a, key)
    const valB = getValue(b, key)

    if (valA === undefined || valB === undefined) {
      return (valA === undefined) - (valB === undefined)
    }

    const parseValue = value => String(value).match(regex) || []
    const partsA = parseValue(valA)
    const partsB = parseValue(valB)

    for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
      const [partA, partB] = [partsA[i], partsB[i]]

      const diff =
        !isNaN(partA) && !isNaN(partB)
          ? Number(partA) - Number(partB)
          : partA.localeCompare(partB)

      if (diff !== 0) {
        return diff * order
      }
    }

    const lengthDiff = partsA.length - partsB.length
    if (lengthDiff !== 0) {
      return lengthDiff * order
    }
  }

  return 0
}

// ---------------------------------------------------------------------------
// Secret redaction + caller-query hardening
//
// Device records keep credentials in `opts` (password, apiKey, ...) and pool
// configs in `pools[]`. Anything handed back to a caller goes through
// redactSecrets(), and caller-supplied mingo queries are validated by
// sanitizeQuery() — an operator allowlist plus a path denylist — so a filter
// can neither read a secret nor be used as a character-by-character oracle
// against one ({'opts.password': {$regex: '^a'}}).
// ---------------------------------------------------------------------------

const REDACTED = '[REDACTED]'

// Exact (case-insensitive) secret key names, plus suffixes that mark a key as
// a secret wherever it appears (adminPassword, apiSecret, authToken, ...).
const SECRET_KEYS = new Set([
  'password', 'pass', 'passwd', 'pwd', 'apikey', 'api_key', 'token', 'secret',
  'privatekey', 'private_key', 'seed', 'mnemonic', 'apisecret', 'api_secret'
])
const SECRET_SUFFIX_RE = /(password|passwd|secret|token|apikey|api_key|privatekey|private_key|mnemonic)$/i

function isSecretKey (key) {
  if (typeof key !== 'string') return false
  return SECRET_KEYS.has(key.toLowerCase()) || SECRET_SUFFIX_RE.test(key)
}

/**
 * Deep copy of `value` with every secret-named key's value replaced by
 * REDACTED. Non-plain values (Buffers, Dates) are returned as-is.
 */
function redactSecrets (value, depth = 0) {
  if (depth > 32 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((v) => redactSecrets(v, depth + 1))
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) return value
  const out = {}
  for (const [k, v] of Object.entries(value)) {
    out[k] = isSecretKey(k) && v !== undefined && v !== null && v !== '' ? REDACTED : redactSecrets(v, depth + 1)
  }
  return out
}

/**
 * Removes REDACTED placeholders a caller echoed back (e.g. an edit form fed
 * from a redacted getThingConf), so they never overwrite a stored secret.
 */
function stripRedacted (value, depth = 0) {
  if (depth > 32 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((v) => stripRedacted(v, depth + 1))
  const out = {}
  for (const [k, v] of Object.entries(value)) {
    if (v === REDACTED) continue
    out[k] = stripRedacted(v, depth + 1)
  }
  return out
}

// Operators a caller query may use. $where/$expr/$function/$accumulator and
// friends evaluate expressions or code and are never accepted. $regex is
// accepted (shipped UIs search with it) but only as a literal search — see
// _safeRegex.
const ALLOWED_QUERY_OPS = new Set([
  '$eq', '$ne', '$in', '$nin', '$exists', '$gt', '$gte', '$lt', '$lte',
  '$and', '$or', '$nor', '$not', '$elemMatch', '$all', '$size',
  '$regex', '$options'
])
const MAX_QUERY_DEPTH = 8
const MAX_QUERY_NODES = 500
const MAX_REGEX_LENGTH = 256
const REGEX_META_RE = /[\\^$.*+?()[\]{}|/-]/g
const FORBIDDEN_PATH_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype'])
// The non-secret connection fields under `opts` a caller may filter on (the UI's
// IP search sends `opts.address`). Every other `opts.*` path stays refused.
const QUERYABLE_OPTS = new Set(['address', 'port'])

function _checkPath (p) {
  if (typeof p !== 'string' || !p.length || p.length > 256) throw new Error('ERR_QUERY_PATH_INVALID')
  const segs = p.split('.')
  if (segs[0] === 'opts' && !(segs.length === 2 && QUERYABLE_OPTS.has(segs[1]))) {
    throw new Error(`ERR_QUERY_PATH_FORBIDDEN: ${p}`)
  }
  for (const seg of segs) {
    if (FORBIDDEN_PATH_SEGMENTS.has(seg) || isSecretKey(seg)) {
      throw new Error(`ERR_QUERY_PATH_FORBIDDEN: ${p}`)
    }
  }
}

function escapeRegex (str) {
  return str.replace(REGEX_META_RE, '\\$&')
}

/**
 * A caller `$regex` is a literal search, never a pattern: every regex
 * metacharacter is escaped, except an optional leading `^` (prefix match) and
 * trailing `$` (suffix match). The only option is `i`. This keeps the
 * shipped searches (`^miner-`, `^AA:BB:..$` with `i`, substring search) and
 * makes catastrophic backtracking impossible. Returns { source, flags }.
 */
function _safeRegex (pattern, options) {
  let src = pattern
  let flags = options
  if (pattern instanceof RegExp) {
    src = pattern.source
    if (flags === undefined) flags = pattern.flags
  }
  if (typeof src !== 'string' || src.length > MAX_REGEX_LENGTH) throw new Error('ERR_QUERY_REGEX_INVALID')
  if (flags !== undefined && flags !== null && (typeof flags !== 'string' || !/^i?$/.test(flags))) {
    throw new Error('ERR_QUERY_REGEX_INVALID')
  }
  const head = src.startsWith('^') ? '^' : ''
  let body = head ? src.slice(1) : src
  const tail = body.endsWith('$') ? '$' : ''
  if (tail) body = body.slice(0, -1)
  return { source: head + escapeRegex(body) + tail, flags: flags || '' }
}

function _safeRegExp (pattern) {
  const { source, flags } = _safeRegex(pattern)
  return new RegExp(source, flags)
}

/**
 * Validates a caller-supplied mingo query in place of evaluating it blindly:
 * only allowlisted operators, no paths under `opts.*` or naming a secret
 * field, bounded depth/size. Every `$regex` (and any RegExp value) is
 * rewritten to a literal search (see _safeRegex). Throws ERR_QUERY_* on the
 * first violation; returns a sanitized copy otherwise (the input is not
 * modified).
 */
function sanitizeQuery (query) {
  let nodes = 0
  const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof RegExp)
  const isOpObject = (v) => isPlain(v) && Object.keys(v).some((k) => k.startsWith('$'))

  const checkOp = (k) => {
    if (!ALLOWED_QUERY_OPS.has(k)) throw new Error(`ERR_QUERY_OPERATOR_FORBIDDEN: ${k}`)
  }

  // `doc` level: keys are field paths or logical operators.
  const walkDoc = (node, depth) => {
    if (++nodes > MAX_QUERY_NODES || depth > MAX_QUERY_DEPTH) throw new Error('ERR_QUERY_TOO_COMPLEX')
    if (!isPlain(node)) throw new Error('ERR_QUERY_INVALID')
    for (const [k, v] of Object.entries(node)) {
      if (k === '$and' || k === '$or' || k === '$nor') {
        if (!Array.isArray(v)) throw new Error('ERR_QUERY_INVALID')
        for (const sub of v) walkDoc(sub, depth + 1)
        continue
      }
      if (k.startsWith('$')) throw new Error(`ERR_QUERY_OPERATOR_FORBIDDEN: ${k}`)
      _checkPath(k)
      if (v instanceof RegExp) node[k] = _safeRegExp(v)
      else if (isOpObject(v)) walkExpr(v, depth + 1)
    }
  }

  // `expr` level: keys are operators applied to one field's value; anything
  // else in there is a literal value mingo compares, never evaluates.
  const walkExpr = (node, depth) => {
    if (++nodes > MAX_QUERY_NODES || depth > MAX_QUERY_DEPTH) throw new Error('ERR_QUERY_TOO_COMPLEX')
    for (const [k, v] of Object.entries(node)) {
      if (!k.startsWith('$')) continue
      checkOp(k)
      if (k === '$regex') {
        const { source, flags } = _safeRegex(v, node.$options)
        node.$regex = source
        if (flags) node.$options = flags
        else delete node.$options
      } else if (k === '$not') {
        if (v instanceof RegExp) node.$not = _safeRegExp(v)
        else if (isPlain(v)) walkExpr(v, depth + 1)
      } else if (k === '$elemMatch') {
        if (isOpObject(v) && Object.keys(v).every((x) => x.startsWith('$') && !['$and', '$or', '$nor'].includes(x))) walkExpr(v, depth + 1)
        else walkDoc(v, depth + 1)
      } else if ((k === '$in' || k === '$nin' || k === '$all') && Array.isArray(v)) {
        for (let i = 0; i < v.length; i++) {
          if (v[i] instanceof RegExp) v[i] = _safeRegExp(v[i])
          else if (k === '$all' && isOpObject(v[i])) walkExpr(v[i], depth + 1)
        }
      } else if (v instanceof RegExp) {
        node[k] = _safeRegExp(v)
      }
    }
  }

  if (query === undefined || query === null) return query
  if (!isPlain(query)) throw new Error('ERR_QUERY_INVALID')
  // Rewritten in a copy so the caller's object (often reused by the caller,
  // or a shared constant) is never modified.
  let copy
  try {
    copy = structuredClone(query)
  } catch (e) {
    throw new Error('ERR_QUERY_INVALID')
  }
  walkDoc(copy, 0)
  return copy
}

function _sanitizeFields (fields) {
  if (fields === undefined || fields === null) return fields
  if (typeof fields !== 'object' || Array.isArray(fields)) throw new Error('ERR_QUERY_FIELDS_INVALID')
  for (const [k, v] of Object.entries(fields)) {
    if (k.startsWith('$')) throw new Error(`ERR_QUERY_OPERATOR_FORBIDDEN: ${k}`)
    if (!(v === 0 || v === 1 || v === true || v === false)) throw new Error('ERR_QUERY_FIELDS_INVALID')
    for (const seg of k.split('.')) {
      if (FORBIDDEN_PATH_SEGMENTS.has(seg)) throw new Error(`ERR_QUERY_PATH_FORBIDDEN: ${k}`)
    }
  }
  return fields
}

function _sanitizeSort (sort) {
  if (sort === undefined || sort === null) return sort
  if (typeof sort !== 'object' || Array.isArray(sort)) throw new Error('ERR_QUERY_SORT_INVALID')
  for (const [k, v] of Object.entries(sort)) {
    _checkPath(k)
    if (v !== 1 && v !== -1) throw new Error('ERR_QUERY_SORT_INVALID')
  }
  return sort
}

function _toNonNegInt (v, name) {
  if (v === undefined || v === null) return v
  const n = Number(v)
  if (!Number.isInteger(n) || n < 0) throw new Error(`ERR_QUERY_${name}_INVALID`)
  return n
}

/**
 * Caller-facing filter/sort/page over `things`. `req.query`, `req.fields`,
 * `req.sort`, `req.offset` and `req.limit` usually come straight from a
 * remote caller and are validated here (see sanitizeQuery). Callers holding
 * secret-bearing records must pass a redacted projection (redactSecrets).
 */
function applyFilters (things, req, returnObjects = false) {
  const query = sanitizeQuery(req.query)
  const fields = _sanitizeFields(req.fields)
  const sort = _sanitizeSort(req.sort)
  const offset = _toNonNegInt(req.offset, 'OFFSET')
  const limit = _toNonNegInt(req.limit, 'LIMIT')

  if (!gLibUtilBase.isNil(query) || !gLibUtilBase.isNil(fields)) {
    const q = new mingo.Query(query || {}, { scriptEnabled: false })
    things = q.find(things, fields || {}).all()
  }
  if (!gLibUtilBase.isNil(sort)) {
    things = things.sort((a, b) => getThingSorter(a, b, sort))
  }
  if (offset) {
    things = things.slice(offset)
  }
  if (!gLibUtilBase.isNil(limit)) {
    things = things.slice(0, limit)
  }

  if (returnObjects) return things

  return things.map(e => e.id)
}

function projection (data, fields = {}) {
  _sanitizeFields(fields)
  const query = new mingo.Query({}, { scriptEnabled: false })
  const cursor = query.find(data, fields)
  return cursor.all()
}

module.exports = {
  isValidSnap,
  isOffline,
  getRandomString,
  hasErrorAndPositiveHashrate,
  sumPoolsShares,
  getLogsCountForTimeRange,
  getLogMaxHeight,
  getJsonChanges,
  aggregateLogs,
  getThingSorter,
  applyFilters,
  projection,
  sanitizeQuery,
  escapeRegex,
  redactSecrets,
  stripRedacted,
  isSecretKey,
  REDACTED
}
