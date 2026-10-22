'use strict'

/**
 * Proxy that exposes each action name as a method for ActionApprover execution.
 *
 * Every action name routes to callTargets(): an action is a Worker-defined
 * string, so it must never reach a real ActionCaller method (getWriteCalls,
 * _callTarget, ...). `then` is left undefined so the proxy is not a thenable.
 * @param {import('../action-caller').ActionCaller} actionCaller
 */
function createActionCallerProxy (actionCaller) {
  return new Proxy({}, {
    get: (target, property) => {
      if (typeof property !== 'string' || property === 'then') return undefined
      return (...payload) => {
        const [params, targets] = payload
        return actionCaller.callTargets(property, params, targets)
      }
    }
  })
}

module.exports = { createActionCallerProxy }
