'use strict'

const test = require('brittle')
const fs = require('fs')
const path = require('path')
const { createWorker } = require('@tetherto/tether-svc-test-helper').worker
const { setTimeout: sleep } = require('timers/promises')

// The plugins this file exercises used to arrive on their own, so it declared
// none of them. A gateway now loads only what it is handed, so the routes under
// test have to be asked for — by the same directory a stack names when it writes
// `package: "@tetherto/mdk-plugins/telemetry"`.
const BUNDLED_PLUGINS_ROOT = path.dirname(require.resolve('@tetherto/mdk-plugins/package.json'))
const DECLARED_PLUGINS = ['telemetry', 'site-hashrate', 'site-monitor'].map((name) => path.join(BUNDLED_PLUGINS_ROOT, name))

test('Api', { timeout: 90000 }, async (main) => {
  const baseDir = 'tests/integration'
  let worker
  const gatewayPort = 5000
  const gatewayBaseUrl = `http://127.0.0.1:${gatewayPort}`
  const site = 'test-site'
  const featureConfig = { telemetry: true }

  const cleanDirs = () => {
    fs.rmSync(`./${baseDir}/store`, { recursive: true, force: true })
    fs.rmSync(`./${baseDir}/status`, { recursive: true, force: true })
    fs.rmSync(`./${baseDir}/config`, { recursive: true, force: true })
  }

  main.teardown(async () => {
    await worker.stop()
    // wait for worker to stop
    await sleep(2000)
    cleanDirs()
  })

  const createConfig = () => {
    cleanDirs()

    fs.mkdirSync(`./${baseDir}/config/facs`, { recursive: true })

    const commonConf = {
      dir_log: 'logs',
      debug: 0,
      site,
      featureConfig,
      cacheTiming: {}
    }
    fs.writeFileSync(`./${baseDir}/config/common.json`, JSON.stringify(commonConf))
    fs.writeFileSync(`./${baseDir}/config/facs/net.config.json`, JSON.stringify({ r0: {} }))
    fs.writeFileSync(`./${baseDir}/config/facs/httpd.config.json`, JSON.stringify({ h0: {} }))
  }

  const startWorker = async () => {
    worker = createWorker({
      env: 'test',
      wtype: 'wrk-node-http-test',
      rack: 'test-rack',
      tmpdir: baseDir,
      storeDir: 'test-store',
      serviceRoot: `${process.cwd()}/${baseDir}`,
      port: gatewayPort,
      extraPluginDirs: DECLARED_PLUGINS
    })

    await worker.start()
  }

  const getJson = async (url) => {
    const res = await fetch(url)
    return { status: res.status, body: await res.json() }
  }

  createConfig()
  await startWorker()
  await sleep(2000)

  await main.test('Api: worker boots and serves HTTP', async (t) => {
    const { status, body } = await getJson(`${gatewayBaseUrl}/auth/site`)
    t.is(status, 200, 'gateway responds over HTTP without any auth token')
    t.ok(body, 'response has a JSON body')
  })

  await main.test('Api: get /auth/site', async (t) => {
    const { body } = await getJson(`${gatewayBaseUrl}/auth/site`)
    t.is(body.site, site, 'should return the configured site value')
  })

  await main.test('Api: get /auth/featureConfig', async (t) => {
    const { body } = await getJson(`${gatewayBaseUrl}/auth/featureConfig`)
    t.alike(body, featureConfig, 'should return the configured featureConfig')
  })

  await main.test('Api: get /site-monitor/hashrate without kernel', async (t) => {
    const { status, body } = await getJson(`${gatewayBaseUrl}/site-monitor/hashrate`)
    t.is(status, 400, 'should respond 400 when no kernel is connected')
    t.ok(body.message.includes('ERR_KERNEL_CLIENT_NOT_CONNECTED'), 'should surface ERR_KERNEL_CLIENT_NOT_CONNECTED')
  })

  await main.test('Api: removed auth routes respond 404', async (n) => {
    const removedRoutes = [
      '/oauth/google/callback',
      '/auth/userinfo',
      '/auth/users',
      '/auth/user/settings',
      '/auth/miners',
      '/auth/list-things',
      '/auth/actions'
    ]

    for (const route of removedRoutes) {
      await n.test(`get ${route}`, async (t) => {
        const { status } = await getJson(`${gatewayBaseUrl}${route}`)
        t.is(status, 404, `${route} should respond 404`)
      })
    }
  })

  await main.test('Api: telemetry history route without a kernel answers the zero shape', async (t) => {
    const api = `${gatewayBaseUrl}/auth/metrics/hashrate?start=1700000000000&end=1700086400000`
    const { body } = await getJson(api)
    t.alike(body.log, [], 'no kernel: empty log, not an error')
    t.is(body.summary.totalHashrateMhs, 0, 'should return zero total hashrate')
  })
})
