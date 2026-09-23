'use strict'

const test = require('brittle')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { bundledPluginDir } = require('../..')

// A gateway registers only the plugins its caller hands it, so a caller that
// wants one of the plugins MDK ships has to name it. This is the whole of the
// ergonomics that replaces the three the gateway worker used to register
// itself — a name in, a directory extraPluginDirs accepts out.

test('bundledPluginDir - returns a directory holding the named plugin\'s manifest', (t) => {
  for (const name of ['telemetry', 'site-hashrate', 'site-monitor']) {
    const dir = bundledPluginDir(name)
    t.ok(fs.existsSync(path.join(dir, 'mdk-plugin.json')), `${name} resolves to a loadable plugin dir`)
    t.is(path.basename(dir), name, 'and to the one that was asked for')
  }
})

// Resolution goes through the gateway package rather than this one, because the
// gateway is what depends on @tetherto/mdk-plugins — so it works from a caller
// whose own node_modules never hoisted it.
test('bundledPluginDir - resolves through the gateway, whatever the caller has installed', (t) => {
  const dir = bundledPluginDir('telemetry')
  t.ok(path.isAbsolute(dir), 'an absolute path, which is what extraPluginDirs wants')
  t.ok(fs.existsSync(path.join(dir, 'controllers')), 'the real package, not a stub')
})

// A typo has to name what is available: the alternative is a plugin loader error
// about a directory the caller never wrote down.
test('bundledPluginDir - a name it does not ship is refused, with the ones it does', (t) => {
  t.exception(() => bundledPluginDir('site-monitr'), /ERR_BUNDLED_PLUGIN_NOT_FOUND/)

  let message = ''
  try {
    bundledPluginDir('site-monitr')
  } catch (err) {
    message = err.message
  }
  t.ok(message.includes('site-monitor'), 'the near miss is in the list')
  t.ok(message.includes('telemetry'), 'and so is every other one')
})

// `../plugins` would resolve and load, which is worse than failing: nothing in
// the manifest check below it says the directory was inside the package.
test('bundledPluginDir - refuses a name that is not one of the shipped directories', (t) => {
  t.exception(() => bundledPluginDir('../gateway'), /ERR_BUNDLED_PLUGIN_NOT_FOUND/)
  t.exception(() => bundledPluginDir(''), /ERR_BUNDLED_PLUGIN_NOT_FOUND/)
})

// The test above only holds because `../gateway` happens to have no
// mdk-plugin.json of its own — it does not prove containment is checked at
// all. Contrive an escaped directory that DOES have one, so the only thing
// that can still refuse it is an explicit containment check, not a lucky
// absence of a manifest file.
test('bundledPluginDir - refuses traversal outside the package even when the escaped target has its own manifest', (t) => {
  const root = path.dirname(bundledPluginDir('telemetry'))

  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-bundled-plugin-escape-'))
  t.teardown(() => { try { fs.rmSync(outside, { recursive: true, force: true }) } catch (_) {} })
  fs.writeFileSync(path.join(outside, 'mdk-plugin.json'), '{}')

  const traversal = path.relative(root, outside)
  t.ok(traversal.startsWith('..'), 'sanity check: the fixture really is outside root')

  t.exception(
    () => bundledPluginDir(traversal),
    /ERR_BUNDLED_PLUGIN_NOT_FOUND/,
    'refused by containment, despite a manifest sitting right there'
  )
  t.exception(
    () => bundledPluginDir(outside),
    /ERR_BUNDLED_PLUGIN_NOT_FOUND/,
    'an absolute path outside root is refused the same way'
  )
})
