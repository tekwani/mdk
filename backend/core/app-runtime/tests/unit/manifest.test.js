'use strict'

const test = require('brittle')
const fs = require('fs')
const path = require('path')
const index = require('../..')
const { validateAppManifest, loadAppManifest, resolvePluginDir } = require('../../lib/manifest')
const { tmpDir } = require('../fixtures/helpers')

const valid = (over = {}) => ({ id: 'io.tether.example', version: '0.2.0', displayName: 'Example', ...over })

function write (dir, files) {
  for (const [name, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true })
    fs.writeFileSync(path.join(dir, name), body)
  }
  return dir
}

test('index exports the manifest helpers', (t) => {
  t.is(index.validateAppManifest, validateAppManifest)
  t.is(index.loadAppManifest, loadAppManifest)
  t.is(index.resolvePluginDir, resolvePluginDir)
})

test('validateAppManifest - defaults permissions/config and passes other keys through', (t) => {
  const permissions = [{ resources: ['devices'], verbs: ['read', 'frobnicate'], resourceNames: ['miner/*'] }]
  t.alike(validateAppManifest(valid({ permissions, config: { pollMs: 5 }, description: 'd' })), valid({ permissions, config: { pollMs: 5 }, description: 'd' }))
  t.alike(validateAppManifest(valid()), valid({ permissions: [], config: {} }))
})

test('validateAppManifest - rejects bad fields with ERR_APP_MANIFEST_INVALID: <label>', (t) => {
  const cases = [
    [null, /must be a mapping/],
    [valid({ id: 'example' }), /"id" must be reverse-DNS/],
    [valid({ id: 'Io.tether.x' }), /"id" must be reverse-DNS/],
    [valid({ version: '1.0' }), /"version" must be a semver/],
    [valid({ version: 1.5 }), /"version" must be a semver/],
    [valid({ displayName: ' ' }), /"displayName"/],
    [valid({ permissions: {} }), /"permissions" must be an array/],
    [valid({ permissions: [{ resources: 'devices', verbs: ['read'] }] }), /permissions\[0\]/],
    [valid({ permissions: [{ resources: ['d'], verbs: ['read'], resourceNames: 'x' }] }), /permissions\[0\]/],
    [valid({ config: [] }), /"config" must be a mapping/]
  ]
  for (const [obj, re] of cases) {
    t.exception(() => validateAppManifest(obj, 'x.yaml'), new RegExp(`^Error: ERR_APP_MANIFEST_INVALID: x\\.yaml: .*${re.source}`))
  }
})

test('loadAppManifest - parses the YAML of a (symlinked) app dir', (t) => {
  const dir = write(tmpDir(t), { 'app/mdk-app.yaml': 'id: io.tether.a\nversion: 1.0.0\ndisplayName: A\nconfig:\n  n: 1\n' })
  fs.symlinkSync(path.join(dir, 'app'), path.join(dir, 'link'))
  const { manifest, dir: realDir } = loadAppManifest(path.join(dir, 'link'))
  t.is(realDir, fs.realpathSync(path.join(dir, 'app')))
  t.alike(manifest.config, { n: 1 })

  t.exception(() => loadAppManifest(path.join(dir, 'nope')), /ERR_APP_MANIFEST_MISSING/)
  write(dir, { 'bad/mdk-app.yaml': 'version: [unclosed\n' })
  t.exception(() => loadAppManifest(path.join(dir, 'bad')), /ERR_APP_MANIFEST_INVALID: .*not valid YAML/)
})

test('resolvePluginDir - <appDir>/plugin first, then <appDir>, else ERR_PLUGIN_MANIFEST_MISSING', (t) => {
  const dir = tmpDir(t)
  t.exception(() => resolvePluginDir(dir), new RegExp(`ERR_PLUGIN_MANIFEST_MISSING: ${dir}`))
  write(dir, { 'mdk-plugin.json': '{}' })
  t.is(resolvePluginDir(dir), dir)
  write(dir, { 'plugin/mdk-plugin.json': '{}' })
  t.is(resolvePluginDir(dir), path.join(dir, 'plugin'))
})
