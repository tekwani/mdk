'use strict'

const { validateFull: validateEnvelope } = require('../protocol/envelope')
const { ACTIONS } = require('../protocol/actions')
const { ROLES, hasRole, requiredRole } = require('./caller-auth')

// Approval identity. A caller holding `admin` is a trusted delegate (the
// Gateway authenticates its own users and forwards who they are), so its
// payload `voter` is kept; any other caller votes as its transport key, so
// one key cannot pose as several voters to satisfy reqVotes > 1.
function _voterFor (payload, caller) {
  if (!caller || hasRole(caller.roles, ROLES.ADMIN)) return payload.voter
  return caller.publicKey
}

function _withVoter (payload, caller) {
  return { ...payload, voter: _voterFor(payload, caller) }
}

/**
 * Shared envelope routing for Kernel listeners (HRPC).
 *
 * `caller` is set by a transport that authenticated the peer:
 * `{ publicKey: hex, roles: string[] }`. It gates each action on a role and
 * replaces self-asserted identity (requester, non-delegate voter) with the
 * transport key. Without it (in-process callers) every action is allowed.
 *
 * @param {object} envelope
 * @param {object} deps
 * @param {import('../modules/command-dispatcher')} deps.dispatcher
 * @param {import('../modules/telemetry-collector')} deps.telemetryCollector
 * @param {import('../modules/worker-registry')} deps.registry
 * @param {import('../modules/action-manager')} deps.actionManager
 */
async function routeEnvelope (envelope, deps, caller) {
  const validation = validateEnvelope(envelope)
  if (!validation.valid) return { error: validation.error }

  if (caller && !hasRole(caller.roles, requiredRole(envelope.action))) {
    return { error: `ERR_KERNEL_ACTION_FORBIDDEN: ${envelope.action} requires role ${requiredRole(envelope.action)}` }
  }

  const { dispatcher, telemetryCollector, registry, actionManager } = deps

  switch (envelope.action) {
    case ACTIONS.COMMAND_REQUEST:
      return dispatcher.dispatch(envelope, caller ? { requesterId: caller.publicKey } : undefined)
    case ACTIONS.COMMAND_STATUS:
      return dispatcher.getStatus(envelope.payload && envelope.payload.commandId)
    case ACTIONS.COMMAND_CANCEL:
      return dispatcher.cancel(envelope.payload && envelope.payload.commandId)
    case ACTIONS.TELEMETRY_PULL:
      return telemetryCollector.pull(
        envelope.deviceId,
        envelope.payload && envelope.payload.query
      )
    case ACTIONS.STATE_PULL:
      return telemetryCollector.pullState(envelope.deviceId)
    case ACTIONS.WORKER_LIST:
      return { workers: registry.listWorkers() }
    case ACTIONS.DEVICE_CAPABILITIES:
      return { capabilities: registry.getCapabilities(envelope.deviceId) }
    case ACTIONS.WORKER_TERMINATE: {
      const { workerId } = envelope.payload || {}
      if (!workerId) return { error: 'ERR_WORKER_ID_REQUIRED' }
      await registry.terminate(workerId)
      return { status: 'TERMINATED', workerId }
    }
    case ACTIONS.ACTION_PUSH:
      return actionManager.pushAction(_withVoter(envelope.payload, caller))
    case ACTIONS.ACTION_PUSH_BATCH:
      return actionManager.pushActionsBatch(_withVoter(envelope.payload, caller))
    case ACTIONS.ACTION_GET:
      return actionManager.getAction(envelope.payload)
    case ACTIONS.ACTION_GET_BATCH:
      return actionManager.getActionsBatch(envelope.payload)
    case ACTIONS.ACTION_QUERY:
      return actionManager.queryActions(envelope.payload)
    case ACTIONS.ACTION_VOTE:
      return actionManager.voteAction(_withVoter(envelope.payload, caller))
    case ACTIONS.ACTION_CANCEL_BATCH:
      return actionManager.cancelActionsBatch(_withVoter(envelope.payload, caller))
    default:
      return { error: `ERR_UNKNOWN_ACTION: ${envelope.action}` }
  }
}

module.exports = { routeEnvelope }
