'use strict'

/**
 * Scaffold-then-boot smoke test.
 *
 * Runs the real `mdk create plugin` scaffolder, then boots its output through
 * the real Gateway and calls the generated route — the check that
 * mdk-plugin-e2e cannot make, because that one hand-writes its plugin instead
 * of scaffolding it. This is what keeps `mdk create plugin` from shipping a
 * template the Gateway can't actually load (the handler-contract regression).
 *
 * No Kernel is started: `startGateway({ kernelKey: false })` boots the Gateway
 * standalone, and the scaffolded summary controller degrades gracefully when the
 * MDK client is unavailable, so the route still answers 200.
 *
 * Auto-exit example: pass = exit code 0.
 */

const path = require('path')
const fs = require('fs')
const os = require('os')
const { spawnSync } = require('child_process')
const { startGateway } = require('@tetherto/mdk-core')

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..')
const CLI = path.join(REPO_ROOT, 'packages', 'cli', 'dist', 'index.js')
const PLUGIN_NAME = 'scaffoldsmoke'
const HTTP_PORT = 3260

async function main () {
  // Scaffold into an in-repo temp dir so the generated plugin resolves
  // @tetherto/mdk-client the same way an in-project plugin does (walking up to
  // the repo's node_modules). A tmpdir outside the repo would not resolve it.
  const workDir = fs.mkdtempSync(path.join(__dirname, '.tmp-'))
  const gatewayRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-scaffold-e2e-'))

  try {
    // 1. Scaffold via the real CLI — the artifact `mdk create plugin` produces.
    const scaffold = spawnSync(
      process.execPath,
      [CLI, 'create', 'plugin', PLUGIN_NAME, '--dir', workDir, '--no-install', '--no-stack-entry'],
      { encoding: 'utf8' }
    )
    if (scaffold.status !== 0) {
      process.stderr.write(`${scaffold.stdout || ''}${scaffold.stderr || ''}`)
      throw new Error(`mdk create plugin exited with code ${scaffold.status}`)
    }
    const pluginPath = path.join(workDir, 'plugins', PLUGIN_NAME)
    console.log('scaffolded plugin at', pluginPath)

    // 2. Boot the real Gateway with the scaffolded plugin, no Kernel.
    await startGateway({
      kernelKey: false,
      port: HTTP_PORT,
      root: gatewayRoot,
      tmpdir: gatewayRoot,
      extraPluginDirs: [pluginPath]
    })

    // 3. Call the scaffolded route. Without a Kernel the summary controller
    //    reports kernelConnected:false — but the route must still answer 200.
    const res = await fetch(`http://127.0.0.1:${HTTP_PORT}/api/${PLUGIN_NAME}/summary`)
    const body = await res.json().catch(() => null)
    console.log(`GET /api/${PLUGIN_NAME}/summary → ${res.status} ${JSON.stringify(body)}`)

    const ok = res.status === 200 && body && body.ok === true && body.kernelConnected === false
    if (!ok) {
      throw new Error(`expected 200 with { ok: true, kernelConnected: false }, got ${res.status} ${JSON.stringify(body)}`)
    }
    console.log('\nSCAFFOLD E2E OK — `mdk create plugin` output boots and answers 200 through the real Gateway')
    process.exit(0)
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true })
    fs.rmSync(gatewayRoot, { recursive: true, force: true })
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
