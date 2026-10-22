'use strict'

const { ACTIONS } = require('../protocol/actions')

/**
 * Caller admission and per-action authorization for the Kernel HRPC listener.
 *
 * Roles are ordered: `admin` implies `write`, `write` implies `read`.
 *   read  — status, telemetry, worker/capability listing, action reads
 *   write — command.request / command.cancel, action push / vote / cancel
 *   admin — worker.terminate, and may vote on behalf of the users it
 *           authenticated (the payload `voter` is kept as given)
 *
 * Allowlist entries are either a hex public key (full access — the shape
 * every pre-roles config used) or `{ key, roles }`.
 */

const ROLES = Object.freeze({ READ: 'read', WRITE: 'write', ADMIN: 'admin' })
const ROLE_RANK = { read: 1, write: 2, admin: 3 }
const FULL_ACCESS = Object.freeze([ROLES.ADMIN])

const ACTION_ROLES = {
  [ACTIONS.COMMAND_STATUS]: ROLES.READ,
  [ACTIONS.TELEMETRY_PULL]: ROLES.READ,
  [ACTIONS.STATE_PULL]: ROLES.READ,
  [ACTIONS.WORKER_LIST]: ROLES.READ,
  [ACTIONS.DEVICE_CAPABILITIES]: ROLES.READ,
  [ACTIONS.ACTION_GET]: ROLES.READ,
  [ACTIONS.ACTION_GET_BATCH]: ROLES.READ,
  [ACTIONS.ACTION_QUERY]: ROLES.READ,
  [ACTIONS.COMMAND_REQUEST]: ROLES.WRITE,
  [ACTIONS.COMMAND_CANCEL]: ROLES.WRITE,
  [ACTIONS.ACTION_PUSH]: ROLES.WRITE,
  [ACTIONS.ACTION_PUSH_BATCH]: ROLES.WRITE,
  [ACTIONS.ACTION_VOTE]: ROLES.WRITE,
  [ACTIONS.ACTION_CANCEL_BATCH]: ROLES.WRITE,
  [ACTIONS.WORKER_TERMINATE]: ROLES.ADMIN
}

const HEX_KEY = /^[0-9a-f]{64}$/

/**
 * Normalize a public key (hex string or Buffer) to lowercase hex.
 * Throws ERR_KERNEL_CALLER_KEY_INVALID for anything that is not 32 bytes.
 */
function normalizeKey (key) {
  const hex = Buffer.isBuffer(key) ? key.toString('hex') : (typeof key === 'string' ? key.trim().toLowerCase() : '')
  if (!HEX_KEY.test(hex)) throw new Error('ERR_KERNEL_CALLER_KEY_INVALID: expected a 32-byte hex public key')
  return hex
}

function normalizeRoles (roles) {
  if (roles === undefined) return FULL_ACCESS
  if (!Array.isArray(roles) || roles.length === 0) throw new Error('ERR_KERNEL_CALLER_ROLES_INVALID: roles must be a non-empty array')
  for (const role of roles) {
    if (!Object.hasOwn(ROLE_RANK, role)) throw new Error(`ERR_KERNEL_CALLER_ROLE_UNKNOWN: ${role}`)
  }
  return Object.freeze([...new Set(roles)])
}

/**
 * Parse an allowlist (`whitelist`) into Map<hexKey, roles[]>.
 * @param {Array<string|Buffer|{key: string|Buffer, roles?: string[]}>} entries
 */
function parseAllowlist (entries) {
  const out = new Map()
  if (entries === undefined || entries === null) return out
  if (!Array.isArray(entries)) throw new Error('ERR_KERNEL_WHITELIST_INVALID: whitelist must be an array')
  for (const entry of entries) {
    if (entry && typeof entry === 'object' && !Buffer.isBuffer(entry)) {
      out.set(normalizeKey(entry.key), normalizeRoles(entry.roles))
    } else {
      out.set(normalizeKey(entry), FULL_ACCESS)
    }
  }
  return out
}

function hasRole (roles, required) {
  const need = ROLE_RANK[required] || ROLE_RANK.admin
  return (roles || []).some((role) => (ROLE_RANK[role] || 0) >= need)
}

// Unlisted actions (worker-bound ones a caller should never send) need admin
// so a new action is never reachable by default.
function requiredRole (action) {
  return ACTION_ROLES[action] || ROLES.ADMIN
}

module.exports = {
  ROLES,
  FULL_ACCESS,
  ACTION_ROLES,
  normalizeKey,
  normalizeRoles,
  parseAllowlist,
  hasRole,
  requiredRole
}
