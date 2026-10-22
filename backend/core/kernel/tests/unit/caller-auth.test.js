'use strict'

const test = require('brittle')
const { parseAllowlist, hasRole, requiredRole, normalizeKey } = require('../../lib/transport/caller-auth')
const { ACTIONS } = require('../../lib/protocol/actions')

const K1 = 'aa'.repeat(32)
const K2 = 'bb'.repeat(32)

test('caller-auth - plain string entries get full access, objects get their roles', (t) => {
  const map = parseAllowlist([K1, { key: K2, roles: ['read'] }])
  t.alike([...map.get(K1)], ['admin'])
  t.alike([...map.get(K2)], ['read'])
})

test('caller-auth - empty or missing allowlist admits nobody', (t) => {
  t.is(parseAllowlist([]).size, 0)
  t.is(parseAllowlist(undefined).size, 0)
})

test('caller-auth - invalid keys and roles are refused', (t) => {
  t.exception(() => parseAllowlist(['nothex']), /ERR_KERNEL_CALLER_KEY_INVALID/)
  t.exception(() => parseAllowlist([{ key: K1, roles: ['root'] }]), /ERR_KERNEL_CALLER_ROLE_UNKNOWN/)
  t.exception(() => parseAllowlist([{ key: K1, roles: [] }]), /ERR_KERNEL_CALLER_ROLES_INVALID/)
  t.exception(() => parseAllowlist('x'), /ERR_KERNEL_WHITELIST_INVALID/)
  t.is(normalizeKey(Buffer.from(K1, 'hex')), K1)
  t.is(normalizeKey(K1.toUpperCase()), K1)
})

test('caller-auth - role hierarchy and action mapping', (t) => {
  t.ok(hasRole(['admin'], 'write'))
  t.ok(hasRole(['write'], 'read'))
  t.absent(hasRole(['read'], 'write'))
  t.absent(hasRole(['write'], 'admin'))
  t.is(requiredRole(ACTIONS.COMMAND_REQUEST), 'write')
  t.is(requiredRole(ACTIONS.ACTION_VOTE), 'write')
  t.is(requiredRole(ACTIONS.ACTION_PUSH), 'write')
  t.is(requiredRole(ACTIONS.WORKER_TERMINATE), 'admin')
  t.is(requiredRole(ACTIONS.WORKER_LIST), 'read')
  t.is(requiredRole(ACTIONS.IDENTITY_REQUEST), 'admin', 'unmapped actions need admin')
})
