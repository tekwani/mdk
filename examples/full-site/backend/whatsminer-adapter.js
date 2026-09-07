'use strict'

// Minimal WorkerRuntimeV2 host for the external `whatsminer-mdk-worker`
// contract plugin (git+https://github.com/whatsminer/whatsminer-mdk-worker.git),
// which replaced the retired in-repo backend/workers/miners/whatsminer package.
// Mirrors examples/mvp-site/backend/whatsminer-adapter.js.
//
// The external plugin has no startWhatsminerWorker export, no provisioning
// store, no alerts/stats templates, and no model validation — it is a plain
// mdk-contract.json plugin loaded by directory with a device list fixed at
// construction (see its README). This adapter only recreates the piece
// site.js needs: turning a seed device list into a WorkerRuntimeV2 device
// list. There is no registerThing/updateThing/forgetThings equivalent —
// changing the device set means editing the seed list and restarting (see
// backend/provision.js, where `whatsminer` is no longer a seedable type).
const path = require('path')
const debug = require('debug')('mdk:example:full-site:whatsminer-adapter')
const { WorkerRuntimeV2 } = require('../../../backend/core/mdk-worker')

const PKG_DIR = path.dirname(require.resolve('whatsminer-mdk-worker/package.json'))

/**
 * opts:
 *   workerId     (required) one runtime process = one workerId
 *   storeDir     (required) persistent DHT/RPC identity directory
 *   kernelTopic  Kernel discovery topic (hex); omit to register by key
 *   seedDevices  static device list: [{ id, info: { serialNum }, opts: { address, port, password } }]
 */
async function startWhatsminerWorker (opts) {
  if (!opts || !opts.workerId) throw new Error('ERR_WORKER_ID_REQUIRED')
  if (!opts.storeDir) throw new Error('ERR_STORE_DIR_REQUIRED')

  // Prefer the demo's own id (e.g. `whatsminer-0`) over the mock serial
  // number — mcp-server.js's power-mode-by-prefix table and the classifyDevice
  // id fallback both key off the `whatsminer-` prefix.
  const devices = (opts.seedDevices || []).map((seed) => ({
    deviceId: seed.id || seed.info?.serialNum,
    config: { ...seed.opts }
  }))

  const runtime = new WorkerRuntimeV2(PKG_DIR, {
    workerId: opts.workerId,
    kernelTopic: opts.kernelTopic || null,
    storeDir: opts.storeDir,
    devices
  })

  await runtime.start()

  debug('whatsminer worker %s up: %d devices', opts.workerId, devices.length)

  return {
    runtime,
    seeded: devices.length,
    stop: () => runtime.stop()
  }
}

module.exports = { startWhatsminerWorker }
