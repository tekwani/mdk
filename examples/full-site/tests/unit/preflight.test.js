'use strict'

const test = require('brittle')
const fs = require('fs')
const path = require('path')

const { missingBackendDeps, missingUiDeps } = require('../../preflight')

const REPO_ROOT = path.join(__dirname, '..', '..', '..', '..')

// Regression guard. The dependency check used to probe each backend package
// with require.resolve('<name>/package.json'), which throws
// ERR_PACKAGE_PATH_NOT_EXPORTED whenever a package declares an "exports" map
// that omits "./package.json". @tetherto/mdk-gateway declares exactly such a
// map, so a correctly installed gateway was reported as missing and start.js
// refused to boot — with a hint ("npm run setup") that could never fix it.
test('a workspace-linked package with a restrictive exports map reads as installed', (t) => {
  const gatewayDir = path.join(REPO_ROOT, 'backend', 'core', 'gateway')
  const { name, exports: exportMap } = JSON.parse(
    fs.readFileSync(path.join(gatewayDir, 'package.json'), 'utf8')
  )

  // Guard the premise: if gateway ever exports "./package.json" this test stops
  // covering the regression, so fail loudly rather than passing vacuously.
  t.absent(
    exportMap && Object.prototype.hasOwnProperty.call(exportMap, './package.json'),
    'gateway still omits ./package.json from exports — the case under test'
  )

  // The probe require.resolve() would have taken, asserted to still throw.
  t.exception(
    () => require.resolve(path.join(name, 'package.json'), { paths: [REPO_ROOT] }),
    /ERR_PACKAGE_PATH_NOT_EXPORTED|Cannot find module/
  )

  // Installed via the root workspace link, so the check must not flag it.
  t.absent(
    missingBackendDeps().some((entry) => entry.startsWith('backend/core/gateway')),
    'gateway is not reported missing'
  )
})

test('the dependency check reports an installed backend tree as complete', (t) => {
  // Backend only. The UI half of the check reads `examples/full-site/ui/node_modules`
  // and the built `ui/packages/*/dist`, which the backend test job does not install,
  // so asserting on it here would test the CI install layout rather than this module.
  t.alike(missingBackendDeps(), [], 'no backend package reported missing')
})

test('missingUiDeps names the UI inputs rather than throwing when they are absent', (t) => {
  const missing = missingUiDeps()
  t.ok(Array.isArray(missing), 'returns a list in either install state')
  for (const entry of missing) {
    t.ok(/^(examples\/full-site\/ui|ui\/packages)/.test(entry), `names a UI input: ${entry}`)
  }
})
