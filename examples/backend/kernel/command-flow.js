'use strict'

/**
 * MDK Kernel — Command Flow
 *
 * Starts a real Avalon A1346 worker backed by the hardware simulator,
 * waits for Kernel discovery, then prints ready-to-run hp-rpc-cli commands
 * for every operation in the avalon contract.
 *
 * Run:
 *   node backend/core/kernel/examples/command-flow.js
 *
 * Then copy any printed hp-rpc-cli line to a second terminal.
 * Ctrl+C to stop.
 */

const path = require('path')
const os = require('os')
const { getKernel, waitForDiscovery } = require('@tetherto/mdk-core')
const { startAvalonWorker } = require('@tetherto/mdk-worker-avalon')
const avMockServer = require('@tetherto/mdk-worker-avalon/mock/server')

const MOCK_PORT = 14030

function e (action, payload, deviceId) {
  return JSON.stringify({
    id: '1',
    version: '0.1.0',
    type: 'request',
    action,
    sender: 'cli',
    target: null,
    deviceId: deviceId || null,
    timestamp: Date.now(),
    payload: payload || {}
  })
}

async function main () {
  avMockServer.createServer({ port: MOCK_PORT, host: '127.0.0.1', type: 'a1346', serial: 'AV-001' })

  const kernel = await getKernel()
  const worker = await startAvalonWorker({
    workerId: 'avalon-a1346-command-flow',
    model: 'a1346',
    storeDir: path.join(os.tmpdir(), 'mdk', 'command-flow', 'worker-store'),
    seedDevices: [{
      info: { serialNum: 'AV-001', container: 'rack-1' },
      opts: { address: '127.0.0.1', port: MOCK_PORT, password: 'admin' }
    }]
  })
  await kernel.registerWorker(worker.runtime.getPublicKey())

  const deviceId = worker.services.provisioning.listDeviceIds()[0]
  await waitForDiscovery(kernel)

  const K = kernel.getPublicKey().toString('hex')

  console.log(`\n  HRPC key: ${K}`)
  console.log(`  Device:   ${deviceId}\n`)

  console.log('  # Reads')
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('worker.list', {})}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('device.capabilities', {}, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'metrics' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'list' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'count' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'stats' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'logs', key: 'thing-5m', tag: deviceId, limit: 10 } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'settings' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('telemetry.pull', { query: { type: 'config' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('state.pull', {}, deviceId)}'`)

  console.log('\n  # Commands')
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('command.request', { command: 'reboot', params: {} }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('command.request', { command: 'setPowerMode', params: { mode: 'low' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('command.request', { command: 'setPowerMode', params: { mode: 'normal' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('command.request', { command: 'setLED', params: { enabled: true } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('command.request', { command: 'setupPools', params: { pools: [{ url: 'stratum+tcp://ocean.xyz:3334', user: 'bc1q.worker1', pass: 'x' }] } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('command.request', { command: 'saveSettings', params: { autoReconnect: true } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('command.request', { command: 'saveComment', params: { comment: 'Replaced fan #2', user: 'ops' } }, deviceId)}'`)
  console.log(`  hp-rpc-cli -s ${K} -m mdk -d '${e('command.request', { command: 'updateThing', params: { info: { location: 'Row A, Slot 3' } } }, deviceId)}'`)

  console.log('\n  Ctrl+C to stop.\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
