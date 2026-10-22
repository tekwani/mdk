'use strict'

const test = require('brittle')
const fs = require('fs')
const os = require('os')
const path = require('path')
const sdk = require('../..')

const APP = { name: 'echo', appDir: '/apps/echo', keyFile: '/run/echo.key' }

test('startGateway - bad apps are refused before any boot side effect', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-start-gateway-'))
  t.teardown(() => fs.rmSync(root, { recursive: true, force: true }))

  const cases = [
    [{ apps: 'echo' }, /ERR_GATEWAY_APPS_INVALID/],
    [{ apps: [{ ...APP, name: 'Echo' }] }, /ERR_GATEWAY_APP_NAME_INVALID/],
    [{ apps: [APP, APP] }, /ERR_GATEWAY_APP_DUPLICATE/],
    [{ apps: [{ ...APP, appDir: '' }] }, /ERR_GATEWAY_APP_DIR_REQUIRED/],
    [{ apps: [{ ...APP, keyFile: undefined }] }, /ERR_GATEWAY_APP_KEY_REQUIRED/],
    [{ apps: [{ ...APP, mount: 'apps/echo' }] }, /ERR_GATEWAY_APP_MOUNT_INVALID/],
    [{ apps: [{ ...APP, mount: '/x/:id' }] }, /ERR_GATEWAY_APP_MOUNT_INVALID/],
    [{ apps: [{ ...APP, mount: '/x/*' }] }, /ERR_GATEWAY_APP_MOUNT_INVALID/],
    [{ apps: [{ ...APP, mount: '/x/../y' }] }, /ERR_GATEWAY_APP_MOUNT_INVALID/],
    [{ apps: [{ ...APP, mount: '/ops' }, { ...APP, name: 'other', mount: '/ops/' }] }, /ERR_GATEWAY_APP_MOUNT_DUPLICATE/],
    [{ apps: [APP, { ...APP, name: 'other', mount: '/apps/echo' }] }, /ERR_GATEWAY_APP_MOUNT_DUPLICATE/],
    [{ extraPluginDirs: ['/plugins/demo'] }, /ERR_GATEWAY_EXTRA_PLUGIN_DIRS_UNSUPPORTED/]
  ]
  for (const [opts, re] of cases) {
    // No kernelKey and no key file: the Kernel lookup would fail, but the app is reported first.
    await t.exception(sdk.startGateway({ root, keyFile: path.join(root, 'missing.key'), ...opts }), re)
  }
  t.alike(fs.readdirSync(root), [], 'nothing was created under root')
})
