'use strict'

/**
 * MDK Kernel — HRPC auth whitelist
 *
 * Restricts Kernel access to one Gateway via the HRPC firewall allowlist. Only
 * callers whose DHT public key is on the allowlist can connect; everyone else
 * is refused at the network layer. An empty allowlist admits nobody, and a
 * listed key gets only the roles its entry names.
 *
 * The Gateway is started with the Kernel's public key (kernelKey), not the
 * live Kernel handle: startGateway({ kernel }) would admit the Gateway key
 * with full access by itself. Here admission happens in one place, the
 * allowlist below.
 *
 * The Gateway dials the Kernel with one persistent key — its seed lives in the
 * Gateway store — and publishes it as `status.rpcClientKey` in its status file,
 * so the key exchange is two runs of this script:
 *
 *   1st run: no key published yet → the allowlist is empty; the Gateway
 *            publishes its key and its Kernel requests are refused
 *   2nd run: that key is on the allowlist with the `read` role → the same
 *            Gateway can read but not write, and every other caller is refused
 *
 * trustedKeysDir is off on both sides so the allowlist is the only admission:
 * the same-machine key rendezvous would otherwise publish and admit the key
 * with full access. keyFile is off so this script never overwrites the
 * Kernel key file of a site running on this machine.
 *
 * Each run checks the allowlist itself: it calls the Kernel as the Gateway
 * (worker.list is a read, command.request a write) and as an unrelated key.
 *
 * Standalone illustration for the security blueprint; not wired into the
 * mvp-site stack or its tests. Run (twice) from examples/mvp-site:
 *   node backend/auth-whitelist.example.js
 *
 * Delete the state root (printed on start) to reset both identities.
 * Ctrl+C to stop both the Gateway and the Kernel.
 */

const path = require('path')
const os = require('os')
const fs = require('fs')
const { getKernel, startGateway, shutdown, onShutdown } = require('@tetherto/mdk-core')
const { createRawMdkClient } = require('@tetherto/mdk-client')

const HTTP_PORT = 3210
const ROOT = path.join(os.tmpdir(), 'mdk-example-auth-whitelist')
const GATEWAY_ROOT = path.join(ROOT, 'gateway')
const STATUS_FILE = path.join(GATEWAY_ROOT, 'status', `wrk-node-http-${HTTP_PORT}.json`)
const GATEWAY_ROLES = ['read']
const CALL_TIMEOUT_MS = 15000

function publishedGatewayKey () {
  try { return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8')).rpcClientKey } catch { return null }
}

// A refused connection throws; an admitted caller without the role gets an
// { error } reply from the Kernel.
async function check (label, call) {
  try {
    const res = await call()
    console.log(res && res.error ? `  ${label}: refused by role (${res.error})` : `  ${label}: allowed`)
  } catch (err) {
    console.log(`  ${label}: refused at the firewall (${err.code || err.message})`)
  }
}

async function main () {
  const gatewayKey = publishedGatewayKey()
  const kernel = await getKernel({
    root: ROOT,
    keyFile: false,
    trustedKeysDir: false,
    hrpc: { whitelist: gatewayKey ? [{ key: gatewayKey, roles: GATEWAY_ROLES }] : [] }
  })

  let gateway = null
  let clients = []
  // Gateway first: with kernelKey it registers no cleanup on the Kernel.
  onShutdown(async () => {
    for (const client of clients) await client.close()
    await shutdown(gateway)
    await shutdown(kernel)
  })

  gateway = await startGateway({
    kernelKey: kernel.getPublicKey(),
    port: HTTP_PORT,
    root: GATEWAY_ROOT,
    trustedKeysDir: false
  })

  const allowed = kernel.listAllowedKeys('read')
  console.log(`\n  Kernel key:  ${kernel.getPublicKey().toString('hex')}`)
  console.log(`  Gateway key: ${gateway.status.rpcClientKey}  (status.rpcClientKey)`)
  console.log(allowed.length
    ? `  Allowlist:   ${allowed.join(', ')} — roles: ${GATEWAY_ROLES.join(', ')}`
    : '  Allowlist:   [] — admits nobody; restart this script to allowlist the Gateway key above')

  // The Gateway's Kernel identity: the keypair status.rpcClientKey is read
  // from, the same one its plugins dial with (config.kernelKeyPair).
  const asGateway = createRawMdkClient({
    hrpc: { key: kernel.getPublicKey(), keyPair: gateway.net_r0.dht.defaultKeyPair, timeout: CALL_TIMEOUT_MS }
  })
  // No keyPair: dials with a fresh random key that no allowlist names.
  const asStranger = createRawMdkClient({ hrpc: { key: kernel.getPublicKey(), timeout: CALL_TIMEOUT_MS } })
  clients = [asGateway, asStranger]
  await Promise.all(clients.map((client) => client.connect()))

  console.log('\n  Kernel calls:')
  await check('Gateway   worker.list     (read) ', () => asGateway.listWorkers())
  await check('Gateway   command.request (write)', () => asGateway.sendCommand('example-device', 'reboot'))
  await check('Unrelated worker.list     (read) ', () => asStranger.listWorkers())

  console.log(`\n  State root: ${ROOT} (delete to reset identities)`)
  console.log('\n  Ctrl+C to stop.\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
