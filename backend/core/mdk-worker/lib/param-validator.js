'use strict'

/**
 * Validate command params against the contract's declared `params` list
 * ({ name, type, required?, enum?, min?, max? } per mdk-contract.schema.json)
 * before they reach a handler. The Kernel runs a similar check, but the worker
 * is reachable on its own RPC key, so it must not trust the caller to have.
 *
 * Undeclared keys pass through (the Kernel admits them too); a declared key
 * that is absent, or null, is only an error when it is `required`.
 *
 * Returns null when params are valid, or an ERR_PARAM_* string naming the
 * first offending param.
 */
function validateParams (declared, params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return 'ERR_PARAMS_INVALID'
  if (!Array.isArray(declared)) return null

  for (const def of declared) {
    if (!def || typeof def.name !== 'string') continue
    const value = Object.hasOwn(params, def.name) ? params[def.name] : undefined

    if (value === undefined || value === null) {
      if (def.required === true) return `ERR_PARAM_REQUIRED: ${def.name}`
      continue
    }

    if (def.type && !_isType(value, def.type)) return `ERR_PARAM_TYPE: ${def.name} must be ${def.type}`

    if (Array.isArray(def.enum) && !def.enum.includes(value)) return `ERR_PARAM_ENUM: ${def.name}`

    if (typeof value === 'number') {
      if (typeof def.min === 'number' && value < def.min) return `ERR_PARAM_RANGE: ${def.name} below min ${def.min}`
      if (typeof def.max === 'number' && value > def.max) return `ERR_PARAM_RANGE: ${def.name} above max ${def.max}`
    }
  }
  return null
}

function _isType (value, type) {
  switch (type) {
    case 'number': return typeof value === 'number' && Number.isFinite(value)
    case 'string': return typeof value === 'string'
    case 'boolean': return typeof value === 'boolean'
    // The schema has no `array` type, so list params (switchSocket's `args`,
    // setupPools' `pools`) are declared `object`: arrays must pass.
    case 'object': return typeof value === 'object'
    // An unknown declared type is a contract problem, not a caller one; the
    // schema restricts `type`, so there is nothing safe to check here.
    default: return true
  }
}

module.exports = { validateParams }
