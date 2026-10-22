'use strict'

const { test } = require('brittle')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { MDK_ROOT } = require('../../utils/constants')

const repoRoot = path.join(__dirname, '..', '..', '..', '..', '..')
const rootStoreDir = path.join(repoRoot, MDK_ROOT)
const tplDir = path.join(repoRoot, 'tpl')

const runInitializeWithoutTpl = (initialize) => {
  const originalMkdirSync = fs.mkdirSync
  fs.mkdirSync = (dir, opts) => {
    if (path.resolve(dir) === tplDir) return dir
    return originalMkdirSync(dir, opts)
  }
  try {
    initialize({ sources: repoRoot })
  } finally {
    fs.mkdirSync = originalMkdirSync
  }
}

const trackInitArtifacts = () => {
  const hadRootStoreDir = fs.existsSync(rootStoreDir)
  const hadTplDir = fs.existsSync(tplDir)

  return () => {
    if (!hadRootStoreDir) {
      try {
        fs.rmSync(rootStoreDir, { recursive: true, force: true })
      } catch (_) {}
    }
    if (!hadTplDir) {
      try {
        fs.rmSync(tplDir, { recursive: true, force: true })
      } catch (_) {}
    }
  }
}

test('initialize creates mdk tree under cwd when absent', (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm-sdk-be-init-'))
  const prev = process.cwd()
  const cleanupArtifacts = trackInitArtifacts()
  t.teardown(() => {
    cleanupArtifacts()
    process.chdir(prev)
    try {
      fs.rmSync(tmp, { recursive: true, force: true })
    } catch (_) {}
  })
  process.chdir(tmp)

  const initialize = require('../../utils/initialize')
  runInitializeWithoutTpl(initialize)

  const root = path.join(repoRoot, MDK_ROOT)
  t.ok(fs.existsSync(root), 'mdk root exists')
  t.ok(fs.existsSync(path.join(root, 'config', 'facs')), 'config/facs exists')
  t.ok(fs.existsSync(path.join(root, 'workers', 'http.node.wrk.js')), 'http worker stub exists')
  t.ok(fs.existsSync(path.join(root, 'db')), 'db dir exists')
})

test('initialize is safe to call again when mdk already exists', (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm-sdk-be-init-'))
  const prev = process.cwd()
  const cleanupArtifacts = trackInitArtifacts()
  t.teardown(() => {
    cleanupArtifacts()
    process.chdir(prev)
    try {
      fs.rmSync(tmp, { recursive: true, force: true })
    } catch (_) {}
  })
  process.chdir(tmp)

  const initialize = require('../../utils/initialize')
  runInitializeWithoutTpl(initialize)
  runInitializeWithoutTpl(initialize)

  t.ok(fs.existsSync(path.join(repoRoot, MDK_ROOT)), 'mdk still present after second init')
})

test('initialize takes explicit sources/root and fails clearly without a checkout', (t) => {
  const initialize = require('../../utils/initialize')
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'm-sdk-be-init-root-'))
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'm-sdk-be-init-src-'))
  t.teardown(() => {
    fs.rmSync(out, { recursive: true, force: true })
    fs.rmSync(empty, { recursive: true, force: true })
  })

  t.exception(() => initialize(), /ERR_MDK_INIT_SOURCES_REQUIRED/, 'no default checkout is guessed')
  t.exception(() => initialize({ root: out }), /ERR_MDK_INIT_SOURCES_REQUIRED/)
  t.exception(() => initialize({ sources: empty }), /ERR_MDK_INIT_SOURCES_NOT_FOUND/)

  initialize({ sources: repoRoot, root: out })
  const root = path.join(out, MDK_ROOT)
  t.ok(fs.existsSync(path.join(root, 'config', 'facs')), 'tree created under opts.root')
  const stub = fs.readFileSync(path.join(root, 'workers', 'http.node.wrk.js'), 'utf8')
  const rel = /require\('([^']+)'\)/.exec(stub)[1]
  t.ok(fs.existsSync(path.resolve(root, 'workers', rel) + '.js'), 'stub resolves to the checkout gateway worker')
})
