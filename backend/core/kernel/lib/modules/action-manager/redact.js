'use strict'

/**
 * Secret redaction for action records returned to callers.
 *
 * Write params can carry device passwords and pool credentials. The stored
 * record keeps them (the approver executes from it); every copy handed back
 * by action.get / action.get-batch / action.query goes through redactSecrets().
 */

const REDACTED = '[REDACTED]'
const MAX_DEPTH = 10

// Compared after lower-casing and dropping `_` / `-`, so `apiKey`, `api_key`
// and `API-KEY` all match.
const SECRET_KEYS = new Set(['pass', 'pwd', 'passwd', 'password', 'secret', 'token', 'apikey', 'apisecret', 'privatekey', 'accesskey', 'credentials', 'workerpassword'])
// Also caught as a suffix (`poolPassword`, `clientSecret`, `authToken`).
const SECRET_SUFFIXES = ['password', 'passwd', 'secret', 'token', 'apikey', 'privatekey', 'accesskey', 'credentials']

function isSecretKey (key) {
  const k = String(key).toLowerCase().replace(/[_-]/g, '')
  return SECRET_KEYS.has(k) || SECRET_SUFFIXES.some((s) => k.endsWith(s))
}

/**
 * Return a copy of `value` with secret-looking fields replaced by '[REDACTED]'.
 * Recursive through plain objects and arrays; anything nested deeper than
 * MAX_DEPTH is redacted whole rather than walked.
 */
function redactSecrets (value, depth = 0) {
  if (value === null || typeof value !== 'object') return value
  if (depth >= MAX_DEPTH) return REDACTED
  if (Array.isArray(value)) return value.map((v) => redactSecrets(v, depth + 1))
  const out = {}
  for (const [key, v] of Object.entries(value)) {
    out[key] = isSecretKey(key) ? REDACTED : redactSecrets(v, depth + 1)
  }
  return out
}

module.exports = { redactSecrets, isSecretKey, REDACTED, MAX_DEPTH }
