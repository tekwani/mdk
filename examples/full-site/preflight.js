'use strict'

// Dependency check run by start.js / cli.js before any cross-package require.
// Backend packages are members of the repo-root npm workspace, so their deps
// hoist to the root node_modules and each member is symlinked there under its
// package name — a member with no node_modules/ of its own is still installed.
// The UI imports built repo-root ui/packages/*, a separate nested workspace.

const fs = require('fs')
const path = require('path')

const REPO_ROOT = path.join(__dirname, '..', '..')

// The packages start.js / cli.js reach into (see backend/site.js).
const BACKEND_PACKAGES = [
  'backend/core/mdk',
  'backend/core/client',
  'backend/core/gateway',
  'backend/core/mdk-worker',
  'backend/workers/miners/antminer',
  'backend/workers/miners/avalon',
  'backend/workers/containers/antspace',
  'backend/workers/containers/bitdeer',
  'backend/workers/power-meter/abb',
  'backend/workers/power-meter/satec',
  'backend/workers/power-meter/schneider',
  'backend/workers/minerpools/ocean',
  'backend/workers/minerpools/f2pool',
  'backend/workers/temperature/seneca'
]

const SETUP_HINT = 'run "npm run setup" in examples/full-site once to install and build everything'

// Read a package's declared name without going through module resolution.
function pkgName (pkgDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8')).name || null
  } catch {
    return null
  }
}

// Does <repo root>/node_modules/<name> link back to this package? That link is
// what `npm install` at the repo root creates for every workspace member.
function isWorkspaceLinked (pkgDir) {
  const name = pkgName(pkgDir)
  if (!name) return false
  try {
    return fs.realpathSync(path.join(REPO_ROOT, 'node_modules', name)) === fs.realpathSync(pkgDir)
  } catch {
    return false
  }
}

// Two install shapes both count as installed:
//   - a local node_modules/    — a standalone `npm install --prefix <pkg>`
//   - a root workspace link    — `npm install` at the repo root, which hoists a
//                                member's deps to the root instead of its own dir
//
// Filesystem-only, deliberately. Module resolution is gated by a package's
// "exports" map, so require.resolve('<name>/package.json') throws
// ERR_PACKAGE_PATH_NOT_EXPORTED for any package whose map omits "./package.json"
// — @tetherto/mdk-gateway's does — and would report a correctly linked package
// as missing, with a `npm run setup` hint that could never fix it.
function isBackendPkgInstalled (pkg) {
  const pkgDir = path.join(REPO_ROOT, pkg)
  if (fs.existsSync(path.join(pkgDir, 'node_modules'))) return true
  return isWorkspaceLinked(pkgDir)
}

function missingBackendDeps () {
  return BACKEND_PACKAGES
    .filter((pkg) => !isBackendPkgInstalled(pkg))
    .map((pkg) => `${pkg} — not installed`)
}

function missingUiDeps () {
  const missing = []
  if (!fs.existsSync(path.join(__dirname, 'ui', 'node_modules'))) {
    missing.push('examples/full-site/ui — not installed')
  }
  // The example UI imports @tetherto/mdk-* from ui/packages/*, which export
  // from dist/ — they must be built, not just installed.
  if (!fs.existsSync(path.join(REPO_ROOT, 'ui', 'packages', 'ui-foundation', 'dist'))) {
    missing.push('ui/packages (devkit) — not built')
  }
  return missing
}

function checkDeps ({ ui = false } = {}) {
  const missing = missingBackendDeps()
  if (ui) missing.push(...missingUiDeps())
  if (missing.length === 0) return

  console.error('\n  Dependencies are missing — the example cannot boot:\n')
  for (const item of missing) console.error('    - %s', item)
  console.error('\n  To fix, %s.\n', SETUP_HINT)
  process.exit(1)
}

module.exports = { checkDeps, missingBackendDeps, missingUiDeps, SETUP_HINT }
