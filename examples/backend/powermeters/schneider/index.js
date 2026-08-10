'use strict'

const os = require('os')
const path = require('path')

const { getKernel } = require('@tetherto/mdk-core')
const { startSchneiderWorker } = require('@tetherto/mdk-worker-schneider')
const mockServer = require('@tetherto/mdk-worker-schneider/mock/server')

const HOST = '127.0.0.1'
const PORT = 5062
const BASE_DIR = path.join(os.tmpdir(), 'mdk-site-schneider')
const KERNEL_ROOT = path.join(BASE_DIR, 'kernel')

const main = async () => {
  // The Schneider mock speaks Modbus TCP, so no real power meter is needed.
  mockServer.createServer({ host: HOST, port: PORT, type: 'pm5340' })

  // HRPC only — this example is inspected with hp-rpc-cli.
  const kernel = await getKernel({ root: KERNEL_ROOT })
  const worker = await startSchneiderWorker({
    workerId: 'schneider-pm5340-demo',
    model: 'pm5340',
    storeDir: path.join(BASE_DIR, 'worker-store'),
    seedDevices: [{
      info: { serialNum: 'SCHN-1', container: 'container-A' },
      opts: { address: HOST, port: PORT, unitId: 1 }
    }]
  })
  await kernel.registerWorker(worker.runtime.getPublicKey())

  const key = kernel.getPublicKey().toString('hex')
  const deviceId = worker.services.provisioning.listDeviceIds()[0]
  const envelope = JSON.stringify({
    id: '1',
    version: '0.1.0',
    type: 'request',
    action: 'telemetry.pull',
    sender: 'cli',
    deviceId,
    timestamp: Date.now(),
    payload: { query: { type: 'metrics' } }
  })

  console.log('[mdk-schneider]', 'Kernel HRPC key:', key)
  console.log('[mdk-schneider]', 'Device:', deviceId)
  console.log('[mdk-schneider]', 'Pull live telemetry over HRPC (run in a second terminal):')
  console.log(`  hp-rpc-cli -s ${key} -m mdk -d '${envelope}'`)
  console.log('[mdk-schneider]', 'Power meter worker is live. Press Ctrl+C to stop.')
}

main().catch((err) => {
  console.error('[mdk-site-schneider] Fatal:', err)
  process.exit(1)
})
