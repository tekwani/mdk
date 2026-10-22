'use strict'

const fs = require('fs')
const path = require('path')
const { MDK_ROOT, LIB_TYPES } = require('./constants')

// The gateway worker is package code: resolved by name, never by its
// position in a checkout.
const gatewayPackageDir = () => path.dirname(require.resolve('@tetherto/mdk-gateway/package.json'))

const thingConfigSources = (localPackages) => [
  {
    destDir: 'types/AvalonMinerManagerA1346/config',
    srcDirs: [path.join(localPackages, LIB_TYPES.AVALON, 'config')]
  },
  {
    destDir: 'types/BitdeerManagerD40M56/config',
    srcDirs: [path.join(localPackages, LIB_TYPES.BITDEER, 'config')]
  },
  {
    destDir: 'types/AnstspaceManagerHK3/config',
    srcDirs: [path.join(localPackages, LIB_TYPES.ANTSPACE, 'config')]
  },
  {
    destDir: 'types/B23PowerMeterManager/config',
    srcDirs: [path.join(localPackages, LIB_TYPES.ABB, 'config')]
  },
  {
    destDir: 'types/TempSenecaSensorManager/config',
    srcDirs: [path.join(localPackages, LIB_TYPES.SENECA, 'config')]
  }
]

// Points the tmp tree's worker stub at the installed @tetherto/mdk-gateway
// worker, relative to <root>/<MDK_ROOT>/workers (in the monorepo the
// workspace link resolves to backend/core/gateway).
const httpNodeWrkStub = (rootStoreDir) => {
  const target = path.join(gatewayPackageDir(), 'workers', 'http.node.wrk')
  let rel = path.relative(path.join(rootStoreDir, 'workers'), target).split(path.sep).join('/')
  if (!rel.startsWith('.')) rel = `./${rel}`
  return `module.exports = require(${JSON.stringify(rel).replace(/"/g, "'")})\n`
}

const TEMPLATE = {
  dirs: [
    'config/facs',
    'db',
    'types/AvalonMinerManagerA1346/config',
    'types/BitdeerManagerD40M56/config',
    'types/AnstspaceManagerHK3/config',
    'types/B23PowerMeterManager/config',
    'types/TempSenecaSensorManager/config',
    'workers'
  ],
  files: {
    'workers/http.node.wrk.js': httpNodeWrkStub
  }
}

const resolveSource = (dir, filename) => {
  const plain = path.join(dir, filename)
  const example = path.join(dir, `${filename}.example`)
  if (fs.existsSync(plain)) return plain
  if (fs.existsSync(example)) return example
  return null
}

const ensureThingConfigs = (rootStoreDir, localPackages) => {
  for (const { destDir, srcDirs } of thingConfigSources(localPackages)) {
    const configDir = path.join(rootStoreDir, destDir)
    fs.mkdirSync(configDir, { recursive: true })
    const dest = path.join(configDir, 'base.thing.json')
    if (!fs.existsSync(dest)) {
      const src = (srcDirs || []).reduce((found, dir) => {
        if (found) return found
        return resolveSource(dir, 'base.thing.json')
      }, null)
      if (src) fs.copyFileSync(src, dest)
    }
  }
}

/**
 * Seeds the `<root>/tmp` config tree from the MDK monorepo's example configs.
 *
 * opts.sources  MDK monorepo checkout to read configs from (the dir holding
 *               `backend/core/kernel`, `backend/core/gateway`, ...). Required:
 *               it is never guessed from this package's location.
 * opts.root     where the `tmp` tree is created (default: opts.sources).
 */
module.exports = (opts = {}) => {
  if (typeof opts.sources !== 'string' || !opts.sources.trim()) {
    throw new Error(
      'ERR_MDK_INIT_SOURCES_REQUIRED: initialize() needs opts.sources — the MDK monorepo checkout to seed config from'
    )
  }
  const sources = path.resolve(opts.sources)
  const localPackages = path.join(sources, 'backend')
  const orkConfDir = path.join(localPackages, LIB_TYPES.Kernel, 'config')
  const gatewayConfigsDir = path.join(localPackages, LIB_TYPES.GATEWAY, 'config', 'facs')
  if (!fs.existsSync(orkConfDir) || !fs.existsSync(gatewayConfigsDir)) {
    throw new Error(
      `ERR_MDK_INIT_SOURCES_NOT_FOUND: no MDK monorepo configs under ${sources} — ` +
      'initialize() seeds from a source checkout; pass opts.sources pointing at one'
    )
  }
  const rootStoreDir = path.join(path.resolve(opts.root || sources), MDK_ROOT)

  for (const dir of TEMPLATE.dirs) {
    fs.mkdirSync(path.join(rootStoreDir, dir), { recursive: true })
  }

  const commonDest = path.join(rootStoreDir, 'config', 'common.json')
  if (!fs.existsSync(commonDest)) {
    const src = resolveSource(path.join(localPackages, LIB_TYPES.GATEWAY, 'config'), 'common.json')
    if (src) fs.copyFileSync(src, commonDest)
  }

  for (const entry of fs.readdirSync(orkConfDir)) {
    if (!entry.endsWith('.example')) continue
    const filename = entry.slice(0, -'.example'.length)
    const dest = path.join(rootStoreDir, 'config', filename)
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(path.join(orkConfDir, entry), dest)
    }
  }

  for (const entry of fs.readdirSync(gatewayConfigsDir)) {
    if (!entry.endsWith('.example')) continue
    const filename = entry.slice(0, -'.example'.length)
    const dest = path.join(rootStoreDir, 'config', 'facs', filename)
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(path.join(gatewayConfigsDir, entry), dest)
    }
  }

  for (const [relPath, content] of Object.entries(TEMPLATE.files)) {
    const filePath = path.join(rootStoreDir, relPath)
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, typeof content === 'function' ? content(rootStoreDir) : content, 'utf8')
      continue
    }
  }

  if (fs.existsSync(rootStoreDir)) {
    ensureThingConfigs(rootStoreDir, localPackages)
  }
}
